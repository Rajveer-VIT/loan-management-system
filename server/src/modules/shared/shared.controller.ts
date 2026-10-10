import { Request, Response } from 'express';
import fs from 'fs';
import { Loan } from '../../models/Loan.model.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import { ROLES } from '../../constants/roles.js';
import { resolveUploadedFile } from '../../middleware/upload.js';

/** RFC 6266/5987 Content-Disposition that is safe for any original file name. */
function contentDisposition(fileName: string): string {
  const asciiFallback = fileName.replace(/[^\x20-\x7e]|["\\]/g, '_');
  return `inline; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

/**
 * Streams a loan's salary slip. Route-level RBAC already limits this to
 * BORROWER / SANCTION / DISBURSEMENT / ADMIN; a borrower may only fetch their own.
 */
export const getSalarySlipFile = asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const ownerFilter = user.role === ROLES.BORROWER ? { borrower: user.id } : {};

  // For a borrower, someone else's loan yields the same 404 as a missing one.
  const loan = await Loan.findOne({ _id: req.params.id, ...ownerFilter }).select('salarySlip');
  if (!loan) throw new AppError('Loan application not found', 404, undefined, 'NOT_FOUND');

  const slip = loan.salarySlip;
  if (!slip?.storedName) {
    throw new AppError('No salary slip has been uploaded for this loan', 404, undefined, 'NOT_FOUND');
  }

  const filePath = resolveUploadedFile(slip.storedName);
  if (!fs.existsSync(filePath)) {
    throw new AppError('Salary slip file is missing from storage', 404, undefined, 'NOT_FOUND');
  }

  res.setHeader('Content-Type', slip.mimeType);
  res.setHeader('Content-Disposition', contentDisposition(slip.originalName || 'salary-slip'));
  res.setHeader('Cache-Control', 'private, no-store');
  res.sendFile(filePath);
});
