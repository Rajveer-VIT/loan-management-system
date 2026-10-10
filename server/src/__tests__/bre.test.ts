import { describe, it, expect } from 'vitest';
import { evaluateBRE, calculateAge } from '../services/bre.service.js';
import { EMPLOYMENT_MODE } from '../constants/loanConfig.js';

// Reference "now": 10 Oct 2026, 12:00 IST.
const NOW = new Date('2026-10-10T06:30:00Z');

const valid = {
  pan: 'ABCDE1234F',
  dob: '1998-05-15', // 28
  monthlySalary: 45000,
  employmentMode: EMPLOYMENT_MODE.SALARIED,
};

const rules = (input: Partial<typeof valid> & Record<string, unknown>, now = NOW) =>
  evaluateBRE({ ...valid, ...input } as typeof valid, now).failures.map((f) => f.rule);

describe('calculateAge', () => {
  it('counts a birthday that falls today', () => {
    expect(calculateAge('2000-10-10', NOW)).toBe(26);
  });

  it('does not count a birthday that is tomorrow', () => {
    expect(calculateAge('2000-10-11', NOW)).toBe(25);
  });

  it('returns -1 for impossible or future dates', () => {
    expect(calculateAge('2001-02-29', NOW)).toBe(-1);
    expect(calculateAge('not-a-date', NOW)).toBe(-1);
    expect(calculateAge('2030-01-01', NOW)).toBe(-1);
  });

  it('uses the business (IST) calendar day, not the server time zone', () => {
    // 19:00 UTC on 9 Oct is already 10 Oct (00:30) in India → the birthday has arrived.
    const lateUtc = new Date('2026-10-09T19:00:00Z');
    expect(calculateAge('2003-10-10', lateUtc)).toBe(23);
    // 18:00 UTC on 9 Oct is still 9 Oct (23:30) in India → not yet.
    const earlierUtc = new Date('2026-10-09T18:00:00Z');
    expect(calculateAge('2003-10-10', earlierUtc)).toBe(22);
  });
});

describe('evaluateBRE', () => {
  it('passes a fully eligible applicant', () => {
    const result = evaluateBRE(valid, NOW);
    expect(result).toEqual({ eligible: true, failures: [] });
  });

  describe('age rule (23–50 inclusive)', () => {
    it.each([
      ['exactly 23 today', '2003-10-10', true],
      ['one day short of 23', '2003-10-11', false],
      ['exactly 50 today', '1976-10-10', true],
      ['50, the day before turning 51', '1975-10-11', true],
      ['turned 51 today', '1975-10-10', false],
      ['well under age', '2010-01-01', false],
    ])('%s (%s) → eligible=%s', (_label, dob, eligible) => {
      expect(rules({ dob }).includes('AGE_RESTRICTION')).toBe(!eligible);
      expect(evaluateBRE({ ...valid, dob }, NOW).eligible).toBe(eligible);
    });

    it('reports an invalid DOB separately from the age rule', () => {
      expect(rules({ dob: '1990-13-01' })).toEqual(['INVALID_DOB']);
      expect(rules({ dob: '2027-01-01' })).toEqual(['INVALID_DOB']);
    });
  });

  describe('salary rule (≥ ₹25,000)', () => {
    it.each([
      [25000, true],
      [25000.5, true],
      [24999.99, false],
      [0, false],
      [Number.NaN, false],
    ])('salary %s → eligible=%s', (monthlySalary, eligible) => {
      expect(rules({ monthlySalary }).includes('MIN_SALARY_THRESHOLD')).toBe(!eligible);
    });
  });

  describe('PAN rule (^[A-Z]{5}[0-9]{4}[A-Z]$)', () => {
    it.each(['ABCDE1234F', 'abcde1234f', '  ABCDE1234F  ', 'ZZZZZ0000Z'])('accepts %j', (pan) => {
      expect(rules({ pan })).toEqual([]);
    });

    it.each(['ABCDE1234', 'ABCDE12345', 'ABCD1234EF', '1BCDE1234F', 'ABCDE1234FG', 'ABCDE-1234F', 'ABCDE 1234F', ''])(
      'rejects %j',
      (pan) => {
        expect(rules({ pan })).toEqual(['INVALID_PAN_FORMAT']);
      }
    );
  });

  describe('employment rule', () => {
    it('rejects unemployed applicants', () => {
      expect(rules({ employmentMode: EMPLOYMENT_MODE.UNEMPLOYED })).toEqual(['DISALLOWED_EMPLOYMENT']);
    });

    it('accepts salaried and self-employed applicants', () => {
      expect(rules({ employmentMode: EMPLOYMENT_MODE.SELF_EMPLOYED })).toEqual([]);
      expect(rules({ employmentMode: EMPLOYMENT_MODE.SALARIED })).toEqual([]);
    });
  });

  it('reports every failing rule with the field it applies to', () => {
    const result = evaluateBRE(
      { pan: 'INVALID', dob: '2010-01-01', monthlySalary: 15000, employmentMode: EMPLOYMENT_MODE.UNEMPLOYED },
      NOW
    );
    expect(result.eligible).toBe(false);
    expect(result.failures.map((f) => [f.rule, f.field])).toEqual([
      ['AGE_RESTRICTION', 'dob'],
      ['MIN_SALARY_THRESHOLD', 'monthlySalary'],
      ['INVALID_PAN_FORMAT', 'pan'],
      ['DISALLOWED_EMPLOYMENT', 'employmentMode'],
    ]);
  });
});
