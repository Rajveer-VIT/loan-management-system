import { describe, it, expect } from 'vitest';
import { evaluateBRE, calculateAge } from '../services/bre.service.js';
import { EMPLOYMENT_MODE } from '../constants/loanConfig.js';

describe('BRE Service Unit Tests', () => {
  const refDate = new Date('2026-10-10');

  describe('calculateAge', () => {
    it('should calculate age correctly for exact birthday today', () => {
      expect(calculateAge('2000-10-10', refDate)).toBe(26);
    });

    it('should calculate age correctly for birthday tomorrow', () => {
      expect(calculateAge('2000-10-11', refDate)).toBe(25);
    });

    it('should calculate age correctly for birthday yesterday', () => {
      expect(calculateAge('2000-10-09', refDate)).toBe(26);
    });
  });

  describe('evaluateBRE', () => {
    const validData = {
      fullName: 'Rahul Sharma',
      pan: 'ABCDE1234F',
      dob: '1998-05-15', // Age ~28
      monthlySalary: 45000,
      employmentMode: EMPLOYMENT_MODE.SALARIED,
    };

    it('should pass BRE for a valid applicant', () => {
      const result = evaluateBRE(validData, refDate);
      expect(result.eligible).toBe(true);
      expect(result.failures).toHaveLength(0);
    });

    it('should fail if age is less than 23', () => {
      const result = evaluateBRE({ ...validData, dob: '2005-01-01' }, refDate); // Age 21
      expect(result.eligible).toBe(false);
      expect(result.failures.some((f) => f.rule === 'AGE_RESTRICTION')).toBe(true);
    });

    it('should pass if age is exactly 23', () => {
      const result = evaluateBRE({ ...validData, dob: '2003-10-10' }, refDate); // Age 23
      expect(result.eligible).toBe(true);
    });

    it('should pass if age is exactly 50', () => {
      const result = evaluateBRE({ ...validData, dob: '1976-10-10' }, refDate); // Age 50
      expect(result.eligible).toBe(true);
    });

    it('should fail if age is greater than 50', () => {
      const result = evaluateBRE({ ...validData, dob: '1975-10-09' }, refDate); // Age 51
      expect(result.eligible).toBe(false);
      expect(result.failures.some((f) => f.rule === 'AGE_RESTRICTION')).toBe(true);
    });

    it('should fail if salary is less than 25000', () => {
      const result = evaluateBRE({ ...validData, monthlySalary: 24999 }, refDate);
      expect(result.eligible).toBe(false);
      expect(result.failures.some((f) => f.rule === 'MIN_SALARY_THRESHOLD')).toBe(true);
    });

    it('should pass if salary is exactly 25000', () => {
      const result = evaluateBRE({ ...validData, monthlySalary: 25000 }, refDate);
      expect(result.eligible).toBe(true);
    });

    it('should fail on invalid PAN formats', () => {
      const invalidPans = ['ABCDE1234', '12345ABCDE', 'ABCDE12345', 'INVALID123'];
      invalidPans.forEach((pan) => {
        const result = evaluateBRE({ ...validData, pan }, refDate);
        expect(result.eligible).toBe(false);
      });
    });

    it('should trim and uppercase valid lower-case PAN', () => {
      const result = evaluateBRE({ ...validData, pan: '  abcde1234f  ' }, refDate);
      expect(result.eligible).toBe(true);
    });

    it('should fail if employment mode is UNEMPLOYED', () => {
      const result = evaluateBRE({ ...validData, employmentMode: EMPLOYMENT_MODE.UNEMPLOYED }, refDate);
      expect(result.eligible).toBe(false);
      expect(result.failures.some((f) => f.rule === 'DISALLOWED_EMPLOYMENT')).toBe(true);
    });

    it('should return multiple failure reasons if multiple rules fail', () => {
      const result = evaluateBRE(
        {
          fullName: 'Test User',
          pan: 'INVALID',
          dob: '2010-01-01', // Underage
          monthlySalary: 15000, // Below threshold
          employmentMode: EMPLOYMENT_MODE.UNEMPLOYED,
        },
        refDate
      );

      expect(result.eligible).toBe(false);
      expect(result.failures.length).toBeGreaterThanOrEqual(3);
    });
  });
});
