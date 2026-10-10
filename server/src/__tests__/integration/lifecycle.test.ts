import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ROLES } from '../../constants/roles.js';
import { LOAN_STATUS } from '../../constants/loanStatus.js';
import { Loan } from '../../models/Loan.model.js';
import { Payment } from '../../models/Payment.model.js';
import {
  Client,
  createLoanInStatus,
  createUserAndLogin,
  ELIGIBLE_PROFILE,
  EXE_BYTES,
  fileForm,
  JPEG_BYTES,
  makeClient,
  PDF_BYTES,
  PNG_BYTES,
  startTestServer,
  TestContext,
  todayIst,
  uploadedFileCount,
} from './helpers.js';

let ctx: TestContext;
let client: Client;
let staff: Record<'admin' | 'sales' | 'sanction' | 'disbursement' | 'collection', string>;

beforeAll(async () => {
  ctx = await startTestServer();
  client = makeClient(ctx.baseUrl);
  staff = {
    admin: (await createUserAndLogin(client, ROLES.ADMIN)).token,
    sales: (await createUserAndLogin(client, ROLES.SALES)).token,
    sanction: (await createUserAndLogin(client, ROLES.SANCTION)).token,
    disbursement: (await createUserAndLogin(client, ROLES.DISBURSEMENT)).token,
    collection: (await createUserAndLogin(client, ROLES.COLLECTION)).token,
  };
});

afterAll(async () => {
  await ctx?.close();
});

describe('BRE on POST /borrower/profile', () => {
  let token: string;
  beforeAll(async () => {
    token = (await createUserAndLogin(client, ROLES.BORROWER)).token;
  });

  it.each([
    ['under-age', { dob: '2010-01-01' }, 'AGE_RESTRICTION'],
    ['over-age', { dob: '1960-01-01' }, 'AGE_RESTRICTION'],
    ['low salary', { monthlySalary: 24999 }, 'MIN_SALARY_THRESHOLD'],
    ['bad PAN', { pan: 'ABCD1234EF' }, 'INVALID_PAN_FORMAT'],
    ['unemployed', { employmentMode: 'UNEMPLOYED' }, 'DISALLOWED_EMPLOYMENT'],
    ['impossible DOB', { dob: '1995-02-30' }, 'INVALID_DOB'],
  ])('rejects %s with 422 and rule %s', async (_label, override, rule) => {
    const res = await client.post('/borrower/profile', { ...ELIGIBLE_PROFILE, ...override }, token);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('BRE_VALIDATION_FAILED');
    expect(res.body.errors!.map((e) => e.rule)).toEqual([rule]);
  });

  it('lists every failed rule at once and persists nothing', async () => {
    const res = await client.post(
      '/borrower/profile',
      { fullName: 'X Y', pan: 'bad', dob: '2012-01-01', monthlySalary: 1000, employmentMode: 'UNEMPLOYED' },
      token
    );
    expect(res.status).toBe(422);
    expect(res.body.errors).toHaveLength(4);
    expect((await client.get('/borrower/loans/draft', token)).body.data.draftLoan).toBeNull();
  });

  it('rejects malformed shapes with 400 before the BRE runs', async () => {
    const res = await client.post('/borrower/profile', { ...ELIGIBLE_PROFILE, monthlySalary: '60000' }, token);
    expect(res.status).toBe(400);
    expect(res.body.errors![0].field).toBe('monthlySalary');
  });

  it('saves a passing profile (PAN normalised) and advances the wizard', async () => {
    const res = await client.post('/borrower/profile', { ...ELIGIBLE_PROFILE, pan: ' abcde1234f ' }, token);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('DRAFT');
    expect(res.body.data.personalDetails.pan).toBe('ABCDE1234F');
    const draft = await client.get('/borrower/loans/draft', token);
    expect(draft.body.data.currentStep).toBe('salary-slip');
  });

  it('re-saving updates the same draft instead of creating another', async () => {
    await client.post('/borrower/profile', { ...ELIGIBLE_PROFILE, fullName: 'Rahul K Sharma' }, token);
    const loans = await client.get('/borrower/loans', token);
    expect(loans.body.data).toHaveLength(1);
    expect(loans.body.data[0].personalDetails.fullName).toBe('Rahul K Sharma');
  });
});

describe('salary slip upload', () => {
  let token: string;
  let loanId: string;
  beforeAll(async () => {
    token = (await createUserAndLogin(client, ROLES.BORROWER)).token;
    loanId = (await client.post('/borrower/profile', ELIGIBLE_PROFILE, token)).body.data._id;
  });

  const upload = (form: FormData, id = loanId, t = token) =>
    client.request('POST', `/borrower/loans/${id}/salary-slip`, { token: t, form });

  it('requires completed personal details first', async () => {
    const other = await createUserAndLogin(client, ROLES.BORROWER);
    const draft = await Loan.create({ borrower: other.id, status: LOAN_STATUS.DRAFT });
    const before = uploadedFileCount();
    const res = await upload(fileForm(PDF_BYTES, 'slip.pdf', 'application/pdf'), draft._id.toString(), other.token);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('INVALID_STEP');
    expect(uploadedFileCount()).toBe(before); // rejected file was cleaned up
  });

  it('rejects disallowed extensions / MIME types', async () => {
    const res = await upload(fileForm(EXE_BYTES, 'payload.exe', 'application/octet-stream'));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_FILE_TYPE');
  });

  it('rejects files whose content does not match the claimed type, and deletes them', async () => {
    const before = uploadedFileCount();
    const res = await upload(fileForm(EXE_BYTES, 'slip.pdf', 'application/pdf'));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_FILE_CONTENT');
    expect(uploadedFileCount()).toBe(before);
  });

  it('rejects files over 5 MB', async () => {
    const big = Buffer.concat([PDF_BYTES, Buffer.alloc(5 * 1024 * 1024)]);
    const res = await upload(fileForm(big, 'big.pdf', 'application/pdf'));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('FILE_TOO_LARGE');
  });

  it('accepts a request with no file only as a 400', async () => {
    const res = await upload(new FormData());
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('FILE_REQUIRED');
  });

  it.each([
    ['PNG', PNG_BYTES, 'slip.png', 'image/png'],
    ['JPG', JPEG_BYTES, 'slip.jpg', 'image/jpeg'],
    ['PDF', PDF_BYTES, 'slip.pdf', 'application/pdf'],
  ])('accepts a valid %s and replaces the previous file on disk', async (_t, bytes, name, mime) => {
    const before = uploadedFileCount();
    const res = await upload(fileForm(bytes, name, mime));
    expect(res.status).toBe(200);
    expect(res.body.data.salarySlip).toMatchObject({ originalName: name, mimeType: mime });
    expect(res.body.data.salarySlip.storedName).toMatch(/^salary-slip-[a-f0-9]{32}\.(pdf|png|jpg)$/);
    expect(uploadedFileCount()).toBe(Math.max(before, 1)); // never more than one file per draft
  });

  it('neutralises path-traversal file names', async () => {
    const res = await upload(fileForm(PDF_BYTES, '../../etc/passwd.pdf', 'application/pdf'));
    expect(res.status).toBe(200);
    expect(res.body.data.salarySlip.storedName).not.toContain('..');
  });
});

describe('POST /borrower/loans/:id/apply', () => {
  let token: string;
  let loanId: string;
  beforeAll(async () => {
    token = (await createUserAndLogin(client, ROLES.BORROWER)).token;
    loanId = (await client.post('/borrower/profile', ELIGIBLE_PROFILE, token)).body.data._id;
  });

  it('refuses to apply before the salary slip is uploaded', async () => {
    const res = await client.post(`/borrower/loans/${loanId}/apply`, { amount: 100000, tenureDays: 180 }, token);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('INVALID_STEP');
  });

  it.each([
    [{ amount: 49999, tenureDays: 180 }, 'amount'],
    [{ amount: 500001, tenureDays: 180 }, 'amount'],
    [{ amount: 100000.5, tenureDays: 180 }, 'amount'],
    [{ amount: 100000, tenureDays: 29 }, 'tenureDays'],
    [{ amount: 100000, tenureDays: 366 }, 'tenureDays'],
    [{ amount: 100000, tenureDays: 90.5 }, 'tenureDays'],
  ])('rejects out-of-range terms %j', async (body, field) => {
    const res = await client.post(`/borrower/loans/${loanId}/apply`, body, token);
    expect(res.status).toBe(400);
    expect(res.body.errors![0].field).toBe(field);
  });

  it('computes terms on the server, ignoring client-sent figures, and moves to APPLIED', async () => {
    await client.request('POST', `/borrower/loans/${loanId}/salary-slip`, {
      token,
      form: fileForm(PDF_BYTES, 'slip.pdf', 'application/pdf'),
    });
    const res = await client.post(
      `/borrower/loans/${loanId}/apply`,
      { amount: 50000, tenureDays: 30, simpleInterest: 0, totalRepayment: 1, status: 'CLOSED' },
      token
    );
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      status: 'APPLIED',
      amount: 50000,
      tenureDays: 30,
      interestRate: 12,
      simpleInterest: 493.15,
      totalRepayment: 50493.15,
      outstandingBalance: 50493.15,
      totalPaid: 0,
    });
  });

  it('cannot be submitted twice', async () => {
    const res = await client.post(`/borrower/loans/${loanId}/apply`, { amount: 60000, tenureDays: 60 }, token);
    expect(res.status).toBe(409);
  });

  it('blocks a second application while one is open', async () => {
    const res = await client.post('/borrower/profile', ELIGIBLE_PROFILE, token);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('OPEN_LOAN_EXISTS');
  });
});

describe('end-to-end: apply → sanction → disburse → collect → auto-close', () => {
  let borrower: { token: string; id: string };
  let loanId: string;

  beforeAll(async () => {
    borrower = await createUserAndLogin(client, ROLES.BORROWER);
  });

  it('1. borrower is a Sales lead until they apply', async () => {
    const lead = async () => (await client.get('/sales/leads?limit=50', staff.sales)).body.data.find((l: { id: string }) => l.id === borrower.id);
    expect((await lead()).stage).toBe('REGISTERED');

    loanId = (await client.post('/borrower/profile', ELIGIBLE_PROFILE, borrower.token)).body.data._id;
    expect((await lead()).stage).toBe('PROFILE_SAVED');

    await client.request('POST', `/borrower/loans/${loanId}/salary-slip`, {
      token: borrower.token,
      form: fileForm(PDF_BYTES, 'slip.pdf', 'application/pdf'),
    });
    expect((await lead()).stage).toBe('SLIP_UPLOADED');

    const lead$ = await lead();
    expect(lead$).not.toHaveProperty('pan');

    const apply = await client.post(`/borrower/loans/${loanId}/apply`, { amount: 100000, tenureDays: 365 }, borrower.token);
    expect(apply.body.data.totalRepayment).toBe(112000);
    expect(await lead()).toBeUndefined();
  });

  it('2. appears in the Sanction queue, not in Disbursement', async () => {
    const queue = await client.get('/sanction/loans', staff.sanction);
    expect(queue.body.data.map((l: { _id: string }) => l._id)).toContain(loanId);
    expect((await client.get(`/disbursement/loans/${loanId}`, staff.disbursement)).status).toBe(404);
  });

  it('3. cannot be disbursed or paid before sanction', async () => {
    expect((await client.patch(`/disbursement/loans/${loanId}/disburse`, {}, staff.disbursement)).status).toBe(409);
    const pay = await client.post(`/collection/loans/${loanId}/payments`, { utrNumber: 'EARLY000001', amount: 100, paymentDate: todayIst() }, staff.collection);
    expect(pay.status).toBe(409);
  });

  it('4. rejection requires a meaningful reason', async () => {
    const res = await client.patch(`/sanction/loans/${loanId}/reject`, { rejectionReason: '   no  ' }, staff.sanction);
    expect(res.status).toBe(400);
    expect(res.body.errors![0].field).toBe('rejectionReason');
  });

  it('5. Sanction approves: APPLIED → SANCTIONED (once)', async () => {
    const res = await client.patch(`/sanction/loans/${loanId}/approve`, {}, staff.sanction);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('SANCTIONED');
    expect(res.body.data.sanctionedBy.name).toBe('SANCTION User');

    const again = await client.patch(`/sanction/loans/${loanId}/approve`, {}, staff.sanction);
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('INVALID_TRANSITION');
    const reject = await client.patch(`/sanction/loans/${loanId}/reject`, { rejectionReason: 'Changed my mind later' }, staff.sanction);
    expect(reject.status).toBe(409);
  });

  it('6. Disbursement disburses: SANCTIONED → DISBURSED (once)', async () => {
    const res = await client.patch(`/disbursement/loans/${loanId}/disburse`, {}, staff.disbursement);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('DISBURSED');
    expect(res.body.data.disbursedAt).toBeTruthy();
    expect((await client.patch(`/disbursement/loans/${loanId}/disburse`, {}, staff.disbursement)).status).toBe(409);
  });

  it.each([
    ['zero amount', { amount: 0 }, 400, 'VALIDATION_ERROR'],
    ['negative amount', { amount: -10 }, 400, 'VALIDATION_ERROR'],
    ['three decimals', { amount: 10.123 }, 400, 'VALIDATION_ERROR'],
    ['overpayment', { amount: 112000.01 }, 400, 'OVERPAYMENT'],
    ['future date', { paymentDate: todayIst(2) }, 400, 'INVALID_PAYMENT_DATE'],
    ['date before disbursal', { paymentDate: todayIst(-2) }, 400, 'INVALID_PAYMENT_DATE'],
    ['bad UTR format', { utrNumber: 'UTR-12' }, 400, 'VALIDATION_ERROR'],
  ])('7. rejects a payment with %s', async (_label, override, status, code) => {
    const body = { utrNumber: 'VALIDUTR0001', amount: 1000, paymentDate: todayIst(), ...override };
    const res = await client.post(`/collection/loans/${loanId}/payments`, body, staff.collection);
    expect(res.status).toBe(status);
    expect(res.body.code).toBe(code);
  });

  it('8. records a same-day partial payment and tracks the outstanding balance', async () => {
    const res = await client.post(
      `/collection/loans/${loanId}/payments`,
      { utrNumber: 'utr0000000001', amount: 40000.55, paymentDate: todayIst() },
      staff.collection
    );
    expect(res.status).toBe(201);
    expect(res.body.data.isClosed).toBe(false);
    expect(res.body.data.payment.utrNumber).toBe('UTR0000000001');
    expect(res.body.data.loan).toMatchObject({ status: 'DISBURSED', totalPaid: 40000.55, outstandingBalance: 71999.45 });
  });

  it('9. rejects a duplicate UTR (case-insensitive) with 409', async () => {
    const res = await client.post(
      `/collection/loans/${loanId}/payments`,
      { utrNumber: 'UTR0000000001', amount: 10, paymentDate: todayIst() },
      staff.collection
    );
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DUPLICATE_UTR');
  });

  it('10. the final payment closes the loan automatically', async () => {
    const res = await client.post(
      `/collection/loans/${loanId}/payments`,
      { utrNumber: 'UTR0000000002', amount: 71999.45, paymentDate: todayIst() },
      staff.collection
    );
    expect(res.status).toBe(201);
    expect(res.body.data.isClosed).toBe(true);
    expect(res.body.data.loan).toMatchObject({ status: 'CLOSED', totalPaid: 112000, outstandingBalance: 0 });
    expect(res.body.data.loan.closedAt).toBeTruthy();
  });

  it('11. no further payments are accepted on a closed loan', async () => {
    const res = await client.post(
      `/collection/loans/${loanId}/payments`,
      { utrNumber: 'UTR0000000003', amount: 1, paymentDate: todayIst() },
      staff.collection
    );
    expect(res.status).toBe(409);
  });

  it('12. the audit trail records every transition and actor', async () => {
    const res = await client.get(`/collection/loans/${loanId}`, staff.collection);
    expect(res.body.data.payments).toHaveLength(2);
    const history = res.body.data.loan.statusHistory as Array<{ status: string; by?: { name: string } }>;
    expect(history.map((h) => h.status)).toEqual(['DRAFT', 'APPLIED', 'SANCTIONED', 'DISBURSED', 'CLOSED']);
    expect(history.map((h) => h.by?.name)).toEqual([
      'BORROWER User',
      'BORROWER User',
      'SANCTION User',
      'DISBURSEMENT User',
      'COLLECTION User',
    ]);
  });

  it('13. the borrower sees the closed loan with its payments', async () => {
    const res = await client.get(`/borrower/loans/${loanId}`, borrower.token);
    expect(res.body.data.loan.status).toBe('CLOSED');
    expect(res.body.data.payments.map((p: { amount: number }) => p.amount).sort()).toEqual([40000.55, 71999.45].sort());
  });

  it('14. after closure the borrower can start a new application', async () => {
    const res = await client.post('/borrower/profile', ELIGIBLE_PROFILE, borrower.token);
    expect(res.status).toBe(200);
  });
});

describe('rejection path', () => {
  it('APPLIED → REJECTED records reason, actor and time; the borrower sees the reason', async () => {
    const b = await createUserAndLogin(client, ROLES.BORROWER);
    const loan = await createLoanInStatus(b.id, LOAN_STATUS.APPLIED);
    const reason = 'Salary slip employer does not match PAN records';

    const res = await client.patch(`/sanction/loans/${loan._id}/reject`, { rejectionReason: `  ${reason}  ` }, staff.admin);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'REJECTED', rejectionReason: reason });
    expect(res.body.data.rejectedBy.name).toBe('ADMIN User');
    expect(res.body.data.rejectedAt).toBeTruthy();

    const mine = await client.get(`/borrower/loans/${loan._id}`, b.token);
    expect(mine.body.data.loan.rejectionReason).toBe(reason);

    expect((await client.patch(`/sanction/loans/${loan._id}/approve`, {}, staff.sanction)).status).toBe(409);
  });
});

describe('dashboard stats', () => {
  it('module stats are computed over the whole queue', async () => {
    const res = await client.get('/collection/stats', staff.collection);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(
      expect.objectContaining({
        activeDisbursedCount: expect.any(Number),
        closedCount: expect.any(Number),
        totalOutstanding: expect.any(Number),
        totalCollected: expect.any(Number),
      })
    );
    expect(res.body.data.closedCount).toBeGreaterThanOrEqual(1);
    const sales = await client.get('/sales/stats', staff.sales);
    expect(sales.body.data.funnel).toEqual(
      expect.objectContaining({ REGISTERED: expect.any(Number), PROFILE_SAVED: expect.any(Number), SLIP_UPLOADED: expect.any(Number) })
    );
  });
});

describe('concurrency', () => {
  it('two simultaneous payments that together overpay: exactly one succeeds', async () => {
    const b = await createUserAndLogin(client, ROLES.BORROWER);
    const loan = await createLoanInStatus(b.id, LOAN_STATUS.DISBURSED, 100000, 365); // total 112000
    const pay = (utr: string) =>
      client.post(`/collection/loans/${loan._id}/payments`, { utrNumber: utr, amount: 70000, paymentDate: todayIst() }, staff.collection);

    const results = await Promise.all([pay('RACEUTR00001'), pay('RACEUTR00002'), pay('RACEUTR00003')]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 400, 400]);

    const fresh = await Loan.findById(loan._id);
    expect(fresh!.totalPaid).toBe(70000);
    expect(fresh!.outstandingBalance).toBe(42000);
    expect(await Payment.countDocuments({ loan: loan._id })).toBe(1); // losers were compensated
  });

  it('simultaneous payments that exactly settle the loan close it once, with no overpayment', async () => {
    const b = await createUserAndLogin(client, ROLES.BORROWER);
    const loan = await createLoanInStatus(b.id, LOAN_STATUS.DISBURSED, 100000, 365); // total 112000
    const results = await Promise.all(
      Array.from({ length: 4 }, (_, i) =>
        client.post(
          `/collection/loans/${loan._id}/payments`,
          { utrNumber: `SPLITUTR000${i}`, amount: 28000, paymentDate: todayIst() },
          staff.collection
        )
      )
    );
    expect(results.every((r) => r.status === 201)).toBe(true);
    expect(results.filter((r) => r.body.data.isClosed)).toHaveLength(1);

    const fresh = await Loan.findById(loan._id);
    expect(fresh).toMatchObject({ status: LOAN_STATUS.CLOSED, totalPaid: 112000, outstandingBalance: 0 });
    expect(fresh!.statusHistory.filter((h) => h.status === LOAN_STATUS.CLOSED)).toHaveLength(1);
  });

  it('the same UTR submitted concurrently against two loans is accepted once', async () => {
    const b1 = await createUserAndLogin(client, ROLES.BORROWER);
    const b2 = await createUserAndLogin(client, ROLES.BORROWER);
    const l1 = await createLoanInStatus(b1.id, LOAN_STATUS.DISBURSED);
    const l2 = await createLoanInStatus(b2.id, LOAN_STATUS.DISBURSED);
    const body = { utrNumber: 'SHAREDUTR0001', amount: 500, paymentDate: todayIst() };
    const results = await Promise.all([
      client.post(`/collection/loans/${l1._id}/payments`, body, staff.collection),
      client.post(`/collection/loans/${l2._id}/payments`, body, staff.collection),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await Payment.countDocuments({ utrNumber: 'SHAREDUTR0001' })).toBe(1);
  });

  it('concurrent approve and reject: exactly one transition wins', async () => {
    const b = await createUserAndLogin(client, ROLES.BORROWER);
    const loan = await createLoanInStatus(b.id, LOAN_STATUS.APPLIED);
    const results = await Promise.all([
      client.patch(`/sanction/loans/${loan._id}/approve`, {}, staff.sanction),
      client.patch(`/sanction/loans/${loan._id}/reject`, { rejectionReason: 'Concurrent rejection test' }, staff.admin),
      client.patch(`/sanction/loans/${loan._id}/approve`, {}, staff.admin),
    ]);
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(2);
    const fresh = await Loan.findById(loan._id);
    expect(fresh!.statusHistory).toHaveLength(1);
  });

  it('concurrent profile saves create a single draft', async () => {
    const b = await createUserAndLogin(client, ROLES.BORROWER);
    const results = await Promise.all(
      Array.from({ length: 5 }, () => client.post('/borrower/profile', ELIGIBLE_PROFILE, b.token))
    );
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(await Loan.countDocuments({ borrower: b.id, status: LOAN_STATUS.DRAFT })).toBe(1);
  });

  it('concurrent apply requests submit once', async () => {
    const b = await createUserAndLogin(client, ROLES.BORROWER);
    const loanId = (await client.post('/borrower/profile', ELIGIBLE_PROFILE, b.token)).body.data._id;
    await client.request('POST', `/borrower/loans/${loanId}/salary-slip`, {
      token: b.token,
      form: fileForm(PDF_BYTES, 'slip.pdf', 'application/pdf'),
    });
    const results = await Promise.all(
      Array.from({ length: 3 }, () => client.post(`/borrower/loans/${loanId}/apply`, { amount: 75000, tenureDays: 90 }, b.token))
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 409, 409]);
  });
});
