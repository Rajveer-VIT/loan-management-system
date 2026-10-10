import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { DisbursementService } from './disbursement.service.js';

export const getSanctionedLoans = asyncHandler(async (req: Request, res: Response) => {
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  const search = req.query.search ? String(req.query.search) : undefined;

  const result = await DisbursementService.getSanctionedLoans(page, limit, search);
  res.status(200).json({
    success: true,
    data: result.loans,
    pagination: result.pagination,
  });
});

export const getLoanById = asyncHandler(async (req: Request, res: Response) => {
  const loan = await DisbursementService.getLoanById(req.params.id);
  res.status(200).json({
    success: true,
    data: loan,
  });
});

export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await DisbursementService.getStats();
  res.status(200).json({
    success: true,
    data: stats,
  });
});

export const disburseLoan = asyncHandler(async (req: Request, res: Response) => {
  const loanId = req.params.id;
  const disburseUserId = req.user!.id;

  const loan = await DisbursementService.disburseLoan(loanId, disburseUserId);
  res.status(200).json({
    success: true,
    message: 'Loan marked as disbursed successfully',
    data: loan,
  });
});
