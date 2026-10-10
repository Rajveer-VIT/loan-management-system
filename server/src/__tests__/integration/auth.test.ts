import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { User } from '../../models/User.model.js';
import { ROLES } from '../../constants/roles.js';
import { Client, createUserAndLogin, makeClient, startTestServer, TestContext, uniqueEmail } from './helpers.js';

let ctx: TestContext;
let client: Client;

beforeAll(async () => {
  ctx = await startTestServer();
  client = makeClient(ctx.baseUrl);
});

afterAll(async () => {
  await ctx?.close();
});

describe('POST /auth/signup', () => {
  it('creates a BORROWER with a bcrypt-hashed password and returns a token', async () => {
    const email = uniqueEmail('signup');
    const res = await client.post('/auth/signup', { name: 'New Borrower', email, password: 'Secret@123' });

    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({ email, role: 'BORROWER' });
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user.passwordHash).toBeUndefined();

    const stored = await User.findOne({ email }).select('+passwordHash');
    expect(stored!.passwordHash).toMatch(/^\$2[aby]\$10\$/);
    expect(stored!.passwordHash).not.toContain('Secret@123');
  });

  it('ignores a client-supplied role (no privilege escalation)', async () => {
    const email = uniqueEmail('escalate');
    const res = await client.post('/auth/signup', { name: 'Sneaky', email, password: 'Secret@123', role: 'ADMIN' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('BORROWER');
    expect((await User.findOne({ email }))!.role).toBe(ROLES.BORROWER);
  });

  it('rejects a duplicate email (case-insensitive) with 409', async () => {
    const email = uniqueEmail('dup');
    await client.post('/auth/signup', { name: 'First', email, password: 'Secret@123' });
    const res = await client.post('/auth/signup', { name: 'Second', email: email.toUpperCase(), password: 'Secret@123' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DUPLICATE_EMAIL');
  });

  it('validates input with field-level errors', async () => {
    const res = await client.post('/auth/signup', { name: 'A', email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.errors!.map((e) => e.field).sort()).toEqual(['email', 'name', 'password']);
  });
});

describe('POST /auth/login and GET /auth/me', () => {
  it('logs in with correct credentials and resolves /me', async () => {
    const { token } = await createUserAndLogin(client, ROLES.SANCTION);
    const me = await client.get('/auth/me', token);
    expect(me.status).toBe(200);
    expect(me.body.data.role).toBe('SANCTION');
  });

  it('returns the same 401 for a wrong password and an unknown email', async () => {
    const { user } = await createUserAndLogin(client, ROLES.BORROWER);
    const wrongPassword = await client.post('/auth/login', { email: user.email, password: 'Wrong@123' });
    const unknown = await client.post('/auth/login', { email: uniqueEmail('nobody'), password: 'Wrong@123' });
    expect(wrongPassword.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrongPassword.body.message).toBe(unknown.body.message);
  });

  it('requires a token (401)', async () => {
    const res = await client.get('/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHENTICATED');
  });

  it('rejects a token signed with a different secret (401)', async () => {
    const forged = jwt.sign({ id: '64b000000000000000000000', role: 'ADMIN' }, 'attacker-secret-attacker-secret');
    const res = await client.get('/sales/leads', forged);
    expect(res.status).toBe(401);
  });

  it('rejects an unsigned (alg=none) token (401)', async () => {
    const unsigned = jwt.sign({ id: '64b000000000000000000000', role: 'ADMIN' }, '', { algorithm: 'none' });
    const res = await client.get('/sales/leads', unsigned);
    expect(res.status).toBe(401);
  });

  it('uses the role stored in the database, not the one in the token', async () => {
    const { user, token } = await createUserAndLogin(client, ROLES.SALES);
    expect((await client.get('/sales/leads', token)).status).toBe(200);

    await User.updateOne({ _id: user._id }, { role: ROLES.BORROWER });
    expect((await client.get('/sales/leads', token)).status).toBe(403);
  });

  it('revokes access immediately when an account is deactivated', async () => {
    const { user, token } = await createUserAndLogin(client, ROLES.COLLECTION);
    await User.updateOne({ _id: user._id }, { isActive: false });
    expect((await client.get('/collection/loans', token)).status).toBe(401);
    const login = await client.post('/auth/login', { email: user.email, password: 'Password@123' });
    expect(login.status).toBe(401);
  });
});

describe('error envelope', () => {
  it('returns JSON 404 for unknown routes', async () => {
    const res = await client.get('/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, code: 'NOT_FOUND' });
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await client.request('POST', '/auth/login', { rawBody: '{"email":' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MALFORMED_JSON');
  });
});
