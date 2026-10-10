import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { parsePagination, parseSearch } from '../../utils/pagination.js';
import { CollectionService, CollectionStatusFilter } from './collection.service.js';

export const getDisbursedLoans = asyncHandler(async (req: Request, res: Response) => {
  const result = await CollectionService.getLoans(
    parsePagination(req.query),
    parseSearch(req.query.search),
    req.query.status as CollectionStatusFilter | undefined // validated by listCollectionSchema
  );
  res.status(200).json({ success: true, data: result.loans, pagination: result.pagination });
});

export const getLoanById = asyncHandler(async (req: Request, res: Response) => {
  const result = await CollectionService.getLoanWithPayments(req.params.id);
  res.status(200).json({ success: true, data: result });
});

export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await CollectionService.getStats();
  res.status(200).json({ success: true, data: stats });
});

export const recordPayment = asyncHandler(async (req: Request, res: Response) => {
  const result = await CollectionService.recordPayment(req.params.id, req.body, req.user!.id);
  res.status(201).json({
    success: true,
    message: result.isClosed
      ? 'Payment recorded. The loan is fully repaid and has been CLOSED.'
      : 'Payment recorded successfully',
    data: result,
  });
});
