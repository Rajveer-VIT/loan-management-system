import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { parsePagination, parseSearch } from '../../utils/pagination.js';
import { DisbursementService } from './disbursement.service.js';

export const getSanctionedLoans = asyncHandler(async (req: Request, res: Response) => {
  const result = await DisbursementService.getSanctionedLoans(parsePagination(req.query), parseSearch(req.query.search));
  res.status(200).json({ success: true, data: result.loans, pagination: result.pagination });
});

export const getLoanById = asyncHandler(async (req: Request, res: Response) => {
  const loan = await DisbursementService.getLoanById(req.params.id);
  res.status(200).json({ success: true, data: loan });
});

export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await DisbursementService.getStats();
  res.status(200).json({ success: true, data: stats });
});

export const disburseLoan = asyncHandler(async (req: Request, res: Response) => {
  const loan = await DisbursementService.disburseLoan(req.params.id, req.user!.id);
  res.status(200).json({ success: true, message: 'Loan marked as disbursed', data: loan });
});
