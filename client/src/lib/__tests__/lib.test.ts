import { describe, expect, it } from 'vitest';
import { calculateAge, evaluateBREClient } from '../bre';
import { calculateLoanDetails, clamp } from '../loanCalculator';
import { canAccessPath, homePathFor, modulesFor, moduleForPath } from '../access';
import { recordPaymentFormSchema, personalDetailsFormSchema, signupFormSchema } from '../validators';
import { businessToday, toDateInputValue } from '../dates';
import { maskPan } from '../format';
import { validateSlipFile } from '../../components/borrower/SalarySlipUploader';
import { EMPLOYMENT_MODE, ROLES } from '../../types';

const TODAY = '2026-10-10';
const valid = { pan: 'ABCDE1234F', dob: '1998-05-15', monthlySalary: 45000, employmentMode: EMPLOYMENT_MODE.SALARIED };
const rules = (override: Partial<typeof valid>) => evaluateBREClient({ ...valid, ...override }, TODAY).failures.map((f) => f.rule);

describe('BRE client mirror (must agree with the server rules)', () => {
  it('passes an eligible applicant', () => {
    expect(evaluateBREClient(valid, TODAY)).toEqual({ eligible: true, failures: [] });
  });

  it.each([
    ['2003-10-10', []], // turns 23 today
    ['2003-10-11', ['AGE_RESTRICTION']], // 22
    ['1976-10-10', []], // 50
    ['1975-10-10', ['AGE_RESTRICTION']], // turns 51 today
    ['2027-01-01', ['INVALID_DOB']],
    ['1990-02-30', ['INVALID_DOB']],
  ])('age boundary: dob %s → %j', (dob, expected) => {
    expect(rules({ dob })).toEqual(expected);
  });

  it.each([
    [25000, []],
    [24999, ['MIN_SALARY_THRESHOLD']],
  ])('salary %d → %j', (monthlySalary, expected) => {
    expect(rules({ monthlySalary })).toEqual(expected);
  });

  it.each(['abcde1234f', ' ABCDE1234F '])('accepts PAN %j after normalising', (pan) => {
    expect(rules({ pan })).toEqual([]);
  });

  it.each(['ABCD1234EF', 'ABCDE12345', 'ABCDE1234', ''])('rejects PAN %j', (pan) => {
    expect(rules({ pan })).toEqual(['INVALID_PAN_FORMAT']);
  });

  it('rejects unemployed applicants and tags failures with their field', () => {
    const result = evaluateBREClient({ ...valid, employmentMode: EMPLOYMENT_MODE.UNEMPLOYED }, TODAY);
    expect(result.failures).toEqual([expect.objectContaining({ rule: 'DISALLOWED_EMPLOYMENT', field: 'employmentMode' })]);
  });

  it('computes age on calendar dates', () => {
    expect(calculateAge('2000-10-10', TODAY)).toBe(26);
    expect(calculateAge('2000-10-11', TODAY)).toBe(25);
  });
});

describe('loan calculator (same results as the server)', () => {
  it.each([
    [100000, 365, 12000, 112000],
    [50000, 180, 2958.9, 52958.9],
    [50000, 30, 493.15, 50493.15],
    [500000, 365, 60000, 560000],
    [123457, 77, 3125.32, 126582.32],
  ])('P=%d T=%d → SI %d, total %d', (p, t, si, total) => {
    expect(calculateLoanDetails(p, t)).toMatchObject({ simpleInterest: si, totalRepayment: total, interestRate: 12 });
  });

  it('clamps values into range', () => {
    expect(clamp(10, 30, 365)).toBe(30);
    expect(clamp(400, 30, 365)).toBe(365);
    expect(clamp(90, 30, 365)).toBe(90);
  });
});

describe('role-based route access', () => {
  it('gives each executive only their own module; Admin gets all four', () => {
    expect(modulesFor(ROLES.ADMIN).map((m) => m.key)).toEqual(['sales', 'sanction', 'disbursement', 'collection']);
    expect(modulesFor(ROLES.SALES).map((m) => m.key)).toEqual(['sales']);
    expect(modulesFor(ROLES.SANCTION).map((m) => m.key)).toEqual(['sanction']);
    expect(modulesFor(ROLES.DISBURSEMENT).map((m) => m.key)).toEqual(['disbursement']);
    expect(modulesFor(ROLES.COLLECTION).map((m) => m.key)).toEqual(['collection']);
    expect(modulesFor(ROLES.BORROWER)).toEqual([]);
  });

  it.each([
    [ROLES.SALES, '/dashboard/sales', true],
    [ROLES.SALES, '/dashboard/collection', false],
    [ROLES.SANCTION, '/dashboard/disbursement', false],
    [ROLES.COLLECTION, '/dashboard/collection', true],
    [ROLES.ADMIN, '/dashboard/sanction', true],
    [ROLES.ADMIN, '/dashboard', true],
    [ROLES.BORROWER, '/dashboard', false],
    [ROLES.BORROWER, '/dashboard/sales', false],
    [ROLES.BORROWER, '/apply/loan-config', true],
    [ROLES.BORROWER, '/my-loans', true],
    [ROLES.ADMIN, '/apply/personal-details', false],
    [ROLES.SANCTION, '/my-loans', false],
    [ROLES.SALES, '/dashboard/salesforce', true], // not a module path → generic dashboard page for staff
  ])('%s → %s allowed=%s', (role, path, allowed) => {
    expect(canAccessPath(role, path)).toBe(allowed);
  });

  it('does not treat a prefix as a module match', () => {
    expect(moduleForPath('/dashboard/salesforce')).toBeNull();
    expect(moduleForPath('/dashboard/sales/123')?.key).toBe('sales');
  });

  it('sends each role to a sensible home page', () => {
    expect(homePathFor(ROLES.BORROWER)).toBe('/my-loans');
    expect(homePathFor(ROLES.ADMIN)).toBe('/dashboard');
    expect(homePathFor(ROLES.COLLECTION)).toBe('/dashboard/collection');
  });
});

describe('form validation', () => {
  it('requires an 8+ character password on sign-up', () => {
    expect(signupFormSchema.safeParse({ name: 'Al', email: 'a@b.co', password: 'short' }).success).toBe(false);
    expect(signupFormSchema.safeParse({ name: 'Al', email: 'a@b.co', password: 'long-enough' }).success).toBe(true);
  });

  it('coerces salary input to a number', () => {
    const parsed = personalDetailsFormSchema.parse({ fullName: 'Rahul', pan: 'X', dob: TODAY, monthlySalary: '45000', employmentMode: 'SALARIED' });
    expect(parsed.monthlySalary).toBe(45000);
  });

  describe('payment form', () => {
    const schema = recordPaymentFormSchema(1000.5, '2026-10-01', TODAY);
    const ok = { utrNumber: 'utr123456', amount: '500', paymentDate: '2026-10-05' };

    it('accepts a valid payment and upper-cases the UTR', () => {
      expect(schema.parse(ok)).toEqual({ utrNumber: 'UTR123456', amount: 500, paymentDate: '2026-10-05' });
    });

    it.each([
      [{ amount: '0' }, 'amount'],
      [{ amount: '-1' }, 'amount'],
      [{ amount: '1000.51' }, 'amount'],
      [{ amount: '10.123' }, 'amount'],
      [{ utrNumber: 'UTR-1' }, 'utrNumber'],
      [{ paymentDate: '2026-10-11' }, 'paymentDate'],
      [{ paymentDate: '2026-09-30' }, 'paymentDate'],
    ])('rejects %j', (override, field) => {
      const result = schema.safeParse({ ...ok, ...override });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues[0].path[0]).toBe(field);
    });

    it('accepts paying exactly the outstanding balance on the disbursal day', () => {
      expect(schema.safeParse({ ...ok, amount: '1000.50', paymentDate: '2026-10-01' }).success).toBe(true);
    });
  });
});

describe('salary slip pre-validation', () => {
  it.each([
    [{ name: 'slip.pdf', type: 'application/pdf', size: 1000 }, null],
    [{ name: 'SLIP.JPG', type: 'image/jpeg', size: 1000 }, null],
    [{ name: 'slip.png', type: 'image/png', size: 5 * 1024 * 1024 }, null],
  ])('accepts %j', (file, expected) => {
    expect(validateSlipFile(file)).toBe(expected);
  });

  it.each([
    { name: 'slip.exe', type: 'application/octet-stream', size: 10 },
    { name: 'slip.pdf', type: 'text/html', size: 10 },
    { name: 'slip.gif', type: 'image/gif', size: 10 },
    { name: 'slip.pdf', type: 'application/pdf', size: 5 * 1024 * 1024 + 1 },
    { name: 'slip.pdf', type: 'application/pdf', size: 0 },
  ])('rejects %j', (file) => {
    expect(validateSlipFile(file)).not.toBeNull();
  });
});

describe('formatting helpers', () => {
  it('masks PANs in list views', () => {
    expect(maskPan('ABCDE1234F')).toBe('ABXXXXX34F');
  });

  it('formats dates for inputs without time-zone shift', () => {
    expect(toDateInputValue('1995-06-15T00:00:00.000Z')).toBe('1995-06-15');
    expect(businessToday(new Date('2026-10-09T18:30:00Z'))).toBe('2026-10-10');
  });
});
