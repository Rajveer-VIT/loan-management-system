import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { CollectionService } from './collection.service.js';

export const getDisbursedLoans = asyncHandler(async (req: Request, res: Response) => {
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  const search = req.query.search ? String(req.query.search) : undefined;
  const status = req.query.status ? String(req.query.status) : undefined;

  const result = await CollectionService.getDisbursedLoans({ page, limit, search, status });
  res.status(200).json({
    success: true,
    data: result.loans,
    pagination: result.pagination,
  });
});

export const getLoanById = asyncHandler(async (req: Request, res: Response) => {
  const result = await CollectionService.getLoanById(req.params.id);
  res.status(200).json({
    success: true,
    data: result,
  });
});

export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await CollectionService.getStats();
  res.status(200).json({
    success: true,
    data: stats,
  });
});

export const recordPayment = asyncHandler(async (req: Request, res: Response) => {
  const loanId = req.params.id;
  const collectorUserId = req.user!.id;

  const result = await CollectionService.recordPayment(loanId, req.body, collectorUserId);
  res.status(201).json({
    success: true,
    message: result.isClosed
      ? 'Payment recorded successfully. Loan is now FULLY PAID and CLOSED!'
      : 'Payment recorded successfully',
    data: result,
  });
});

export const getPaymentHistory = asyncHandler(async (req: Request, res: Response) => {
  const loanId = req.params.id;

  const result = await CollectionService.getPaymentHistory(loanId);
  res.status(200).json({
    success: true,
    data: result,
  });
});
