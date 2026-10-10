import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { SanctionService } from './sanction.service.js';

export const getAppliedLoans = asyncHandler(async (req: Request, res: Response) => {
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  const search = req.query.search ? String(req.query.search) : undefined;

  const result = await SanctionService.getAppliedLoans(page, limit, search);
  res.status(200).json({
    success: true,
    data: result.loans,
    pagination: result.pagination,
  });
});

export const getLoanById = asyncHandler(async (req: Request, res: Response) => {
  const loan = await SanctionService.getLoanById(req.params.id);
  res.status(200).json({
    success: true,
    data: loan,
  });
});

export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await SanctionService.getStats();
  res.status(200).json({
    success: true,
    data: stats,
  });
});

export const approveLoan = asyncHandler(async (req: Request, res: Response) => {
  const loanId = req.params.id;
  const sanctionUserId = req.user!.id;

  const loan = await SanctionService.approveLoan(loanId, sanctionUserId);
  res.status(200).json({
    success: true,
    message: 'Loan application approved and sanctioned successfully',
    data: loan,
  });
});

export const rejectLoan = asyncHandler(async (req: Request, res: Response) => {
  const loanId = req.params.id;
  const { rejectionReason } = req.body;

  const loan = await SanctionService.rejectLoan(loanId, rejectionReason);
  res.status(200).json({
    success: true,
    message: 'Loan application rejected successfully',
    data: loan,
  });
});
