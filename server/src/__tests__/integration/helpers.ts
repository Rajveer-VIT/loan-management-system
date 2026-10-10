import fs from 'fs';
import { AddressInfo } from 'net';
import { Server } from 'http';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import app from '../../app.js';
import { connectDB } from '../../config/db.js';
import { env } from '../../config/env.js';
import { User } from '../../models/User.model.js';
import { Loan, ILoan } from '../../models/Loan.model.js';
import { ROLES } from '../../constants/roles.js';
import { LOAN_STATUS } from '../../constants/loanStatus.js';
import { EMPLOYMENT_MODE } from '../../constants/loanConfig.js';
import { calculateLoanDetails } from '../../services/loanCalculator.js';
import { uploadDir } from '../../middleware/upload.js';

export interface ApiResponse<T = any> {
  status: number;
  body: { success: boolean; message?: string; code?: string; data?: T; errors?: Array<{ rule?: string; field?: string; message: string }>; pagination?: { total: number; totalPages: number; page: number } };
}

export interface TestContext {
  baseUrl: string;
  close: () => Promise<void>;
}

/** Connects to the dedicated test database (wiped first) and serves the app on a random port. */
export async function startTestServer(): Promise<TestContext> {
  if (!/test/i.test(env.MONGODB_URI)) {
    throw new Error(`Refusing to run integration tests against non-test database: ${env.MONGODB_URI}`);
  }
  await connectDB();
  await mongoose.connection.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.createIndexes()));

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${port}/api/v1`,
    close: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await mongoose.disconnect();
      fs.rmSync(uploadDir, { recursive: true, force: true });
    },
  };
}

export function makeClient(baseUrl: string) {
  async function request<T = any>(
    method: string,
    path: string,
    opts: { token?: string; json?: unknown; form?: FormData; rawBody?: string } = {}
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {};
    if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
    let body: RequestInit['body'];
    if (opts.json !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.json);
    } else if (opts.rawBody !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = opts.rawBody;
    } else if (opts.form) {
      body = opts.form;
    }
    const res = await fetch(`${baseUrl}${path}`, { method, headers, body });
    const text = await res.text();
    return { status: res.status, body: text ? JSON.parse(text) : {} };
  }

  return {
    request,
    get: <T = any>(path: string, token?: string) => request<T>('GET', path, { token }),
    post: <T = any>(path: string, json: unknown, token?: string) => request<T>('POST', path, { json, token }),
    patch: <T = any>(path: string, json: unknown, token?: string) => request<T>('PATCH', path, { json, token }),
    raw: (path: string, token?: string) =>
      fetch(`${baseUrl}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
  };
}

export type Client = ReturnType<typeof makeClient>;

let counter = 0;
export const uniqueEmail = (prefix: string) => `${prefix}.${Date.now()}.${++counter}@test.local`;

/** Creates a user directly in the database and logs in through the API. */
export async function createUserAndLogin(client: Client, role: ROLES, email = uniqueEmail(role.toLowerCase())) {
  const password = 'Password@123';
  const user = await User.create({
    name: `${role} User`,
    email,
    passwordHash: await bcrypt.hash(password, 4),
    role,
  });
  const res = await client.post('/auth/login', { email, password });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${JSON.stringify(res.body)}`);
  return { user, token: res.body.data.token as string, id: user._id.toString() };
}

/** A loan inserted directly in a given status (for tests that start mid-lifecycle). */
export async function createLoanInStatus(borrowerId: string, status: LOAN_STATUS, amount = 100000, tenureDays = 365): Promise<ILoan> {
  const terms = calculateLoanDetails(amount, tenureDays);
  return Loan.create({
    borrower: borrowerId,
    personalDetails: {
      fullName: 'Fixture Borrower',
      pan: 'ABCDE1234F',
      dob: new Date(Date.UTC(1990, 0, 1)),
      monthlySalary: 50000,
      employmentMode: EMPLOYMENT_MODE.SALARIED,
    },
    ...terms,
    totalPaid: 0,
    outstandingBalance: terms.totalRepayment,
    status,
    ...(status === LOAN_STATUS.DISBURSED && { disbursedAt: new Date(Date.now() - 3 * 86400000) }),
  });
}

// ---- file fixtures -------------------------------------------------------

export const PDF_BYTES = Buffer.from('%PDF-1.4\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n');
export const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52]);
export const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]);
export const EXE_BYTES = Buffer.from('MZ\x90\x00 this is not a pdf');

export function fileForm(bytes: Buffer, fileName: string, mimeType: string): FormData {
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: mimeType }), fileName);
  return form;
}

export function uploadedFileCount(): number {
  return fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir).length : 0;
}

export const ELIGIBLE_PROFILE = {
  fullName: 'Rahul Sharma',
  pan: 'ABCDE1234F',
  dob: '1995-06-15',
  monthlySalary: 60000,
  employmentMode: 'SALARIED',
};

/** Drives the borrower wizard through the API up to (and including) applying. */
export async function applyThroughApi(client: Client, token: string, amount = 100000, tenureDays = 180) {
  const profile = await client.post('/borrower/profile', ELIGIBLE_PROFILE, token);
  if (profile.status !== 200) throw new Error(`profile failed: ${JSON.stringify(profile.body)}`);
  const loanId = profile.body.data._id as string;
  const upload = await client.request('POST', `/borrower/loans/${loanId}/salary-slip`, {
    token,
    form: fileForm(PDF_BYTES, 'slip.pdf', 'application/pdf'),
  });
  if (upload.status !== 200) throw new Error(`upload failed: ${JSON.stringify(upload.body)}`);
  const apply = await client.post(`/borrower/loans/${loanId}/apply`, { amount, tenureDays }, token);
  if (apply.status !== 200) throw new Error(`apply failed: ${JSON.stringify(apply.body)}`);
  return loanId;
}

/** Today's date (IST) as YYYY-MM-DD. */
export function todayIst(offsetDays = 0): string {
  const d = new Date(Date.now() + 330 * 60000 + offsetDays * 86400000);
  return d.toISOString().slice(0, 10);
}
