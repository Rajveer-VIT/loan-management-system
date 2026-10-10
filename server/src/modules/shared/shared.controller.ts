import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { Loan } from '../../models/Loan.model.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import { ROLES } from '../../constants/roles.js';

export const getSalarySlipFile = asyncHandler(async (req: Request, res: Response) => {
  const loanId = req.params.id;
  const user = req.user!;

  // Least privilege access control check:
  // Allowed: SANCTION, DISBURSEMENT, ADMIN, or owning BORROWER.
  // Blocked: SALES, COLLECTION (HTTP 403).
  const allowedStaffRoles = [ROLES.ADMIN, ROLES.SANCTION, ROLES.DISBURSEMENT];
  const isAllowedStaff = allowedStaffRoles.includes(user.role);

  if (!isAllowedStaff && user.role !== ROLES.BORROWER) {
    throw new AppError(
      `Access denied. Role '${user.role}' is not authorized to access salary slip documents.`,
      403,
      undefined,
      'FORBIDDEN'
    );
  }

  const loan = await Loan.findById(loanId);
  if (!loan) {
    throw new AppError('Loan application not found', 404);
  }

  // If user is BORROWER, verify ownership (return 404 if not owner to avoid leaking existence)
  if (user.role === ROLES.BORROWER && loan.borrower.toString() !== user.id) {
    throw new AppError('Loan application not found', 404);
  }

  if (!loan.salarySlip || !loan.salarySlip.storedName) {
    throw new AppError('Salary slip has not been uploaded for this loan', 404);
  }

  const filePath = path.resolve(process.cwd(), 'uploads', loan.salarySlip.storedName);

  if (!fs.existsSync(filePath)) {
    throw new AppError('Salary slip file not found on disk', 404);
  }

  res.setHeader('Content-Type', loan.salarySlip.mimeType || 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${loan.salarySlip.originalName}"`);
  return res.sendFile(filePath);
});
