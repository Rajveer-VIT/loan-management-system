import { describe, it, expect } from 'vitest';
import {
  businessDateOf,
  compareCalendarDates,
  parseCalendarDate,
  startOfBusinessDay,
} from '../utils/dates.js';
import { parsePagination, buildPaginationMeta, parseSearch } from '../utils/pagination.js';
import { escapeRegex } from '../utils/regex.js';
import { isValidStatusTransition, LOAN_STATUS } from '../constants/loanStatus.js';

describe('dates', () => {
  it('parses YYYY-MM-DD as a calendar date without time-zone shift', () => {
    expect(parseCalendarDate('2026-01-31')).toEqual({ year: 2026, month: 1, day: 31 });
  });

  it('rejects impossible calendar dates', () => {
    expect(parseCalendarDate('2026-02-30')).toBeNull();
    expect(parseCalendarDate('2026-13-01')).toBeNull();
    expect(parseCalendarDate('garbage')).toBeNull();
  });

  it('maps instants to the IST calendar day', () => {
    expect(businessDateOf(new Date('2026-10-09T18:29:59Z'))).toEqual({ year: 2026, month: 10, day: 9 });
    expect(businessDateOf(new Date('2026-10-09T18:30:00Z'))).toEqual({ year: 2026, month: 10, day: 10 });
  });

  it('computes the start of the IST day', () => {
    expect(startOfBusinessDay(new Date('2026-10-10T06:00:00Z')).toISOString()).toBe('2026-10-09T18:30:00.000Z');
  });

  it('orders calendar dates', () => {
    const a = { year: 2026, month: 10, day: 9 };
    const b = { year: 2026, month: 10, day: 10 };
    expect(compareCalendarDates(a, b)).toBeLessThan(0);
    expect(compareCalendarDates(b, a)).toBeGreaterThan(0);
    expect(compareCalendarDates(a, { ...a })).toBe(0);
  });
});

describe('pagination', () => {
  it('falls back to defaults for invalid input', () => {
    expect(parsePagination({ page: 'abc', limit: '-5' })).toEqual({ page: 1, limit: 10, skip: 0 });
    expect(parsePagination({ page: '2.5', limit: '0' })).toEqual({ page: 1, limit: 10, skip: 0 });
  });

  it('caps the limit at 50', () => {
    expect(parsePagination({ page: '3', limit: '1000' })).toEqual({ page: 3, limit: 50, skip: 100 });
  });

  it('builds metadata', () => {
    expect(buildPaginationMeta({ page: 2, limit: 10, skip: 10 }, 25)).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNext: true,
      hasPrev: true,
    });
  });

  it('normalises search terms', () => {
    expect(parseSearch('  rahul ')).toBe('rahul');
    expect(parseSearch('   ')).toBeUndefined();
    expect(parseSearch(['a', 'b'])).toBeUndefined();
  });
});

describe('escapeRegex', () => {
  it('neutralises regex metacharacters', () => {
    expect(new RegExp(escapeRegex('a.*b')).test('aXXb')).toBe(false);
    expect(new RegExp(escapeRegex('a.*b')).test('a.*b')).toBe(true);
  });
});

describe('loan status transitions', () => {
  it.each([
    [LOAN_STATUS.DRAFT, LOAN_STATUS.APPLIED, true],
    [LOAN_STATUS.APPLIED, LOAN_STATUS.SANCTIONED, true],
    [LOAN_STATUS.APPLIED, LOAN_STATUS.REJECTED, true],
    [LOAN_STATUS.SANCTIONED, LOAN_STATUS.DISBURSED, true],
    [LOAN_STATUS.DISBURSED, LOAN_STATUS.CLOSED, true],
    [LOAN_STATUS.APPLIED, LOAN_STATUS.DISBURSED, false],
    [LOAN_STATUS.SANCTIONED, LOAN_STATUS.REJECTED, false],
    [LOAN_STATUS.REJECTED, LOAN_STATUS.SANCTIONED, false],
    [LOAN_STATUS.CLOSED, LOAN_STATUS.DISBURSED, false],
  ])('%s → %s allowed=%s', (from, to, allowed) => {
    expect(isValidStatusTransition(from, to)).toBe(allowed);
  });
});
