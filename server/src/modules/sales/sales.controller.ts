import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { parsePagination, parseSearch } from '../../utils/pagination.js';
import { LeadStage, SalesService } from './sales.service.js';

export const getLeads = asyncHandler(async (req: Request, res: Response) => {
  const result = await SalesService.getLeads(
    parsePagination(req.query),
    parseSearch(req.query.search),
    req.query.stage as LeadStage | undefined // validated by listLeadsSchema
  );
  res.status(200).json({ success: true, data: result.leads, pagination: result.pagination });
});

export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await SalesService.getStats();
  res.status(200).json({ success: true, data: stats });
});
