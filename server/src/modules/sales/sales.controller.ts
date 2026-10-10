import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { SalesService } from './sales.service.js';

export const getLeads = asyncHandler(async (req: Request, res: Response) => {
  const page = req.query.page ? Number(req.query.page) : 1;
  const limit = req.query.limit ? Number(req.query.limit) : 10;
  const search = req.query.search ? String(req.query.search) : undefined;

  const result = await SalesService.getLeads({ page, limit, search });
  res.status(200).json({
    success: true,
    data: result.leads,
    pagination: result.pagination,
  });
});

export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await SalesService.getStats();
  res.status(200).json({
    success: true,
    data: stats,
  });
});
