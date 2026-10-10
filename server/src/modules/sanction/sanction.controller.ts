import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { parsePagination, parseSearch } from '../../utils/pagination.js';
import { SanctionService } from './sanction.service.js';

export const getAppliedLoans = asyncHandler(async (req: Request, res: Response) => {
  const result = await SanctionService.getAppliedLoans(parsePagination(req.query), parseSearch(req.query.search));
  res.status(200).json({ success: true, data: result.loans, pagination: result.pagination });
});

export const getLoanById = asyncHandler(async (req: Request, res: Response) => {
  const loan = await SanctionService.getLoanById(req.params.id);
  res.status(200).json({ success: true, data: loan });
});

export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await SanctionService.getStats();
  res.status(200).json({ success: true, data: stats });
});

export const approveLoan = asyncHandler(async (req: Request, res: Response) => {
  const loan = await SanctionService.approveLoan(req.params.id, req.user!.id);
  res.status(200).json({ success: true, message: 'Loan application approved and sanctioned', data: loan });
});

export const rejectLoan = asyncHandler(async (req: Request, res: Response) => {
  const loan = await SanctionService.rejectLoan(req.params.id, req.user!.id, req.body.rejectionReason);
  res.status(200).json({ success: true, message: 'Loan application rejected', data: loan });
});
