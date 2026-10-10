import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ROLES } from '../../constants/roles.js';
import { LOAN_STATUS } from '../../constants/loanStatus.js';
import {
  applyThroughApi,
  Client,
  createLoanInStatus,
  createUserAndLogin,
  makeClient,
  startTestServer,
  TestContext,
} from './helpers.js';

let ctx: TestContext;
let client: Client;
const tokens = {} as Record<ROLES, string>;

beforeAll(async () => {
  ctx = await startTestServer();
  client = makeClient(ctx.baseUrl);
  for (const role of Object.values(ROLES)) {
    tokens[role] = (await createUserAndLogin(client, role)).token;
  }
});

afterAll(async () => {
  await ctx?.close();
});

// Expected HTTP status per role for each module's read endpoint.
const MODULE_ENDPOINTS: Array<[string, ROLES[]]> = [
  ['/sales/leads', [ROLES.ADMIN, ROLES.SALES]],
  ['/sales/stats', [ROLES.ADMIN, ROLES.SALES]],
  ['/sanction/loans', [ROLES.ADMIN, ROLES.SANCTION]],
  ['/sanction/stats', [ROLES.ADMIN, ROLES.SANCTION]],
  ['/disbursement/loans', [ROLES.ADMIN, ROLES.DISBURSEMENT]],
  ['/disbursement/stats', [ROLES.ADMIN, ROLES.DISBURSEMENT]],
  ['/collection/loans', [ROLES.ADMIN, ROLES.COLLECTION]],
  ['/collection/stats', [ROLES.ADMIN, ROLES.COLLECTION]],
  ['/borrower/loans', [ROLES.BORROWER]],
  ['/borrower/loans/draft', [ROLES.BORROWER]],
];

describe('role × endpoint access matrix', () => {
  for (const [path, allowed] of MODULE_ENDPOINTS) {
    for (const role of Object.values(ROLES)) {
      const expected = allowed.includes(role) ? 200 : 403;
      it(`${role.padEnd(12)} GET ${path} → ${expected}`, async () => {
        const res = await client.get(path, tokens[role]);
        expect(res.status).toBe(expected);
        if (expected === 403) expect(res.body.code).toBe('FORBIDDEN');
      });
    }
    it(`anonymous GET ${path} → 401`, async () => {
      expect((await client.get(path)).status).toBe(401);
    });
  }
});

describe('mutations are re-authorized per route', () => {
  it('only Sanction/Admin can approve or reject', async () => {
    const { id: borrowerId } = await createUserAndLogin(client, ROLES.BORROWER);
    const loan = await createLoanInStatus(borrowerId, LOAN_STATUS.APPLIED);
    for (const role of [ROLES.SALES, ROLES.DISBURSEMENT, ROLES.COLLECTION, ROLES.BORROWER]) {
      expect((await client.patch(`/sanction/loans/${loan._id}/approve`, {}, tokens[role])).status).toBe(403);
      expect(
        (await client.patch(`/sanction/loans/${loan._id}/reject`, { rejectionReason: 'Not allowed to do this' }, tokens[role])).status
      ).toBe(403);
    }
  });

  it('only Disbursement/Admin can disburse', async () => {
    const { id: borrowerId } = await createUserAndLogin(client, ROLES.BORROWER);
    const loan = await createLoanInStatus(borrowerId, LOAN_STATUS.SANCTIONED);
    for (const role of [ROLES.SALES, ROLES.SANCTION, ROLES.COLLECTION, ROLES.BORROWER]) {
      expect((await client.patch(`/disbursement/loans/${loan._id}/disburse`, {}, tokens[role])).status).toBe(403);
    }
  });

  it('only Collection/Admin can record payments', async () => {
    const { id: borrowerId } = await createUserAndLogin(client, ROLES.BORROWER);
    const loan = await createLoanInStatus(borrowerId, LOAN_STATUS.DISBURSED);
    const payment = { utrNumber: 'RBACUTR0001', amount: 100, paymentDate: new Date().toISOString().slice(0, 10) };
    for (const role of [ROLES.SALES, ROLES.SANCTION, ROLES.DISBURSEMENT, ROLES.BORROWER]) {
      expect((await client.post(`/collection/loans/${loan._id}/payments`, payment, tokens[role])).status).toBe(403);
    }
  });

  it('staff, including Admin, cannot use borrower application endpoints', async () => {
    for (const role of [ROLES.ADMIN, ROLES.SALES, ROLES.SANCTION]) {
      const res = await client.post('/borrower/profile', { fullName: 'Staff' }, tokens[role]);
      expect(res.status).toBe(403);
    }
  });
});

describe('borrower data isolation', () => {
  it("a borrower cannot read another borrower's loan or salary slip (404, existence not revealed)", async () => {
    const alice = await createUserAndLogin(client, ROLES.BORROWER);
    const bob = await createUserAndLogin(client, ROLES.BORROWER);
    const aliceLoanId = await applyThroughApi(client, alice.token);

    expect((await client.get(`/borrower/loans/${aliceLoanId}`, alice.token)).status).toBe(200);

    const bobView = await client.get(`/borrower/loans/${aliceLoanId}`, bob.token);
    expect(bobView.status).toBe(404);
    expect((await client.raw(`/loans/${aliceLoanId}/salary-slip`, bob.token)).status).toBe(404);

    const bobList = await client.get('/borrower/loans', bob.token);
    expect(bobList.body.data).toEqual([]);

    // Bob cannot submit or upload against Alice's loan either.
    expect((await client.post(`/borrower/loans/${aliceLoanId}/apply`, { amount: 60000, tenureDays: 60 }, bob.token)).status).toBe(404);
  });

  it('salary slips are readable by Sanction/Disbursement/Admin and the owner only', async () => {
    const owner = await createUserAndLogin(client, ROLES.BORROWER);
    const loanId = await applyThroughApi(client, owner.token);

    for (const role of [ROLES.ADMIN, ROLES.SANCTION, ROLES.DISBURSEMENT]) {
      const res = await client.raw(`/loans/${loanId}/salary-slip`, tokens[role]);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/pdf');
    }
    expect((await client.raw(`/loans/${loanId}/salary-slip`, owner.token)).status).toBe(200);
    for (const role of [ROLES.SALES, ROLES.COLLECTION]) {
      expect((await client.raw(`/loans/${loanId}/salary-slip`, tokens[role])).status).toBe(403);
    }
    expect((await client.raw(`/loans/${loanId}/salary-slip`)).status).toBe(401);
  });

  it('responses never expose the on-disk path of an upload', async () => {
    const owner = await createUserAndLogin(client, ROLES.BORROWER);
    const loanId = await applyThroughApi(client, owner.token);
    const res = await client.get(`/sanction/loans/${loanId}`, tokens[ROLES.SANCTION]);
    expect(res.status).toBe(200);
    expect(res.body.data.salarySlip.path).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toMatch(/uploads[\\/]/);
  });
});

describe('malformed identifiers', () => {
  it.each([
    ['GET', '/sanction/loans/not-an-id', ROLES.SANCTION],
    ['PATCH', '/sanction/loans/123/approve', ROLES.SANCTION],
    ['PATCH', '/disbursement/loans/zzz/disburse', ROLES.DISBURSEMENT],
    ['GET', '/collection/loans/xyz', ROLES.COLLECTION],
    ['GET', '/borrower/loans/abc', ROLES.BORROWER],
    ['GET', '/loans/abc/salary-slip', ROLES.ADMIN],
  ])('%s %s → 400, not 500', async (method, path, role) => {
    const res = await client.request(method, path, { token: tokens[role as ROLES], ...(method !== 'GET' && { json: {} }) });
    expect(res.status).toBe(400);
  });

  it('returns 404 for a well-formed but unknown loan ID', async () => {
    const res = await client.patch('/sanction/loans/64b000000000000000000000/approve', {}, tokens[ROLES.SANCTION]);
    expect(res.status).toBe(404);
  });
});
