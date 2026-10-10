import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { AppError } from '../../utils/AppError.js';
import { BorrowerService } from './borrower.service.js';

export const getDraftLoan = asyncHandler(async (req: Request, res: Response) => {
  const result = await BorrowerService.getDraftLoan(req.user!.id);
  res.status(200).json({ success: true, data: result });
});

export const saveProfile = asyncHandler(async (req: Request, res: Response) => {
  const loan = await BorrowerService.saveProfileAndRunBRE(req.user!.id, req.body);
  res.status(200).json({ success: true, message: 'Eligibility check passed. Personal details saved.', data: loan });
});

export const uploadSlip = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new AppError('Salary slip file is required (form field "file").', 400, undefined, 'FILE_REQUIRED');
  }
  const loan = await BorrowerService.uploadSalarySlip(req.user!.id, req.params.id, req.file);
  res.status(200).json({ success: true, message: 'Salary slip uploaded successfully', data: loan });
});

export const applyLoan = asyncHandler(async (req: Request, res: Response) => {
  const loan = await BorrowerService.applyForLoan(req.user!.id, req.params.id, req.body);
  res.status(200).json({ success: true, message: 'Loan application submitted successfully', data: loan });
});

export const getMyLoans = asyncHandler(async (req: Request, res: Response) => {
  const loans = await BorrowerService.getBorrowerLoans(req.user!.id);
  res.status(200).json({ success: true, data: loans });
});

export const getMyLoanById = asyncHandler(async (req: Request, res: Response) => {
  const result = await BorrowerService.getBorrowerLoanById(req.user!.id, req.params.id);
  res.status(200).json({ success: true, data: result });
});
