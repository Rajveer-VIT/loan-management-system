import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { BorrowerService } from './borrower.service.js';
import { AppError } from '../../utils/AppError.js';

export const getDraftLoan = asyncHandler(async (req: Request, res: Response) => {
  const borrowerId = req.user!.id;
  const result = await BorrowerService.getDraftLoan(borrowerId);
  res.status(200).json({
    success: true,
    data: result,
  });
});

export const saveProfile = asyncHandler(async (req: Request, res: Response) => {
  const borrowerId = req.user!.id;
  const loan = await BorrowerService.saveProfileAndRunBRE(borrowerId, req.body);
  res.status(200).json({
    success: true,
    message: 'Profile verified with BRE successfully',
    data: loan,
  });
});

export const uploadSlip = asyncHandler(async (req: Request, res: Response) => {
  const borrowerId = req.user!.id;
  const loanId = req.params.id;

  if (!req.file) {
    throw new AppError('Salary slip file is required', 400);
  }

  const loan = await BorrowerService.uploadSalarySlip(borrowerId, loanId, req.file);
  res.status(200).json({
    success: true,
    message: 'Salary slip uploaded successfully',
    data: loan,
  });
});

export const applyLoan = asyncHandler(async (req: Request, res: Response) => {
  const borrowerId = req.user!.id;
  const loanId = req.params.id;
  const loan = await BorrowerService.applyForLoan(borrowerId, loanId, req.body);
  res.status(200).json({
    success: true,
    message: 'Loan application submitted successfully',
    data: loan,
  });
});

export const getMyLoans = asyncHandler(async (req: Request, res: Response) => {
  const borrowerId = req.user!.id;
  const loans = await BorrowerService.getBorrowerLoans(borrowerId);
  res.status(200).json({
    success: true,
    data: loans,
  });
});

export const getMyLoanById = asyncHandler(async (req: Request, res: Response) => {
  const borrowerId = req.user!.id;
  const loanId = req.params.id;
  const result = await BorrowerService.getBorrowerLoanById(borrowerId, loanId);
  res.status(200).json({
    success: true,
    data: result,
  });
});
