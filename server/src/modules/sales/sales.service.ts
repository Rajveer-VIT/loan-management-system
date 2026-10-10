import mongoose, { PipelineStage } from 'mongoose';
import { User, IUser } from '../../models/User.model.js';
import { ROLES } from '../../constants/roles.js';
import { LOAN_STATUS } from '../../constants/loanStatus.js';
import { escapeRegex } from '../../utils/regex.js';
import { startOfBusinessDay } from '../../utils/dates.js';
import { buildPaginationMeta, PaginationInput } from '../../utils/pagination.js';

/** How far a lead has got through the application wizard without submitting. */
export const LEAD_STAGES = ['REGISTERED', 'PROFILE_SAVED', 'SLIP_UPLOADED'] as const;
export type LeadStage = (typeof LEAD_STAGES)[number];

/** Any loan in one of these means the borrower has applied at least once ⇒ no longer a lead. */
const SUBMITTED_STATUSES = Object.values(LOAN_STATUS).filter((s) => s !== LOAN_STATUS.DRAFT);

export interface Lead {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  stage: LeadStage;
  lastActivityAt: Date;
}

/**
 * Pipeline producing one row per pre-application lead: an active borrower with no
 * submitted loan. The stage comes from their DRAFT (if any). Only contact details
 * and progress are exposed to Sales; PAN, DOB and salary are not.
 */
function leadPipeline(search?: string): PipelineStage[] {
  const match: mongoose.FilterQuery<IUser> = { role: ROLES.BORROWER, isActive: true };
  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    match.$or = [{ name: regex }, { email: regex }];
  }

  return [
    { $match: match },
    {
      $lookup: {
        from: 'loans',
        localField: '_id',
        foreignField: 'borrower',
        as: 'loans',
        pipeline: [{ $project: { status: 1, updatedAt: 1, 'personalDetails.fullName': 1, 'salarySlip.storedName': 1 } }],
      },
    },
    { $match: { 'loans.status': { $nin: SUBMITTED_STATUSES } } },
    { $addFields: { draft: { $first: { $filter: { input: '$loans', cond: { $eq: ['$$this.status', LOAN_STATUS.DRAFT] } } } } } },
    {
      $project: {
        _id: 0,
        id: { $toString: '$_id' },
        name: 1,
        email: 1,
        createdAt: 1,
        lastActivityAt: { $ifNull: ['$draft.updatedAt', '$createdAt'] },
        stage: {
          $switch: {
            branches: [
              { case: { $ne: [{ $ifNull: ['$draft.salarySlip.storedName', null] }, null] }, then: 'SLIP_UPLOADED' },
              { case: { $ne: [{ $ifNull: ['$draft.personalDetails.fullName', null] }, null] }, then: 'PROFILE_SAVED' },
            ],
            default: 'REGISTERED',
          },
        },
      },
    },
  ];
}

export class SalesService {
  static async getLeads(pagination: PaginationInput, search?: string, stage?: LeadStage) {
    const pipeline = leadPipeline(search);
    if (stage) pipeline.push({ $match: { stage } });
    pipeline.push({
      $facet: {
        leads: [{ $sort: { lastActivityAt: -1, id: -1 } }, { $skip: pagination.skip }, { $limit: pagination.limit }],
        total: [{ $count: 'count' }],
      },
    });

    const [result] = await User.aggregate<{ leads: Lead[]; total: { count: number }[] }>(pipeline);
    const total = result?.total[0]?.count ?? 0;
    return { leads: result?.leads ?? [], pagination: buildPaginationMeta(pagination, total) };
  }

  static async getStats() {
    const [funnelRows, newLeadsToday, convertedBorrowers] = await Promise.all([
      User.aggregate<{ _id: LeadStage; count: number }>([
        ...leadPipeline(),
        { $group: { _id: '$stage', count: { $sum: 1 } } },
      ]),
      User.countDocuments({ role: ROLES.BORROWER, isActive: true, createdAt: { $gte: startOfBusinessDay() } }),
      User.aggregate<{ count: number }>([
        { $match: { role: ROLES.BORROWER } },
        {
          $lookup: {
            from: 'loans',
            localField: '_id',
            foreignField: 'borrower',
            as: 'submitted',
            pipeline: [{ $match: { status: { $in: SUBMITTED_STATUSES } } }, { $limit: 1 }],
          },
        },
        { $match: { 'submitted.0': { $exists: true } } },
        { $count: 'count' },
      ]),
    ]);

    const funnel: Record<LeadStage, number> = { REGISTERED: 0, PROFILE_SAVED: 0, SLIP_UPLOADED: 0 };
    funnelRows.forEach((row) => {
      funnel[row._id] = row.count;
    });

    return {
      totalLeads: funnel.REGISTERED + funnel.PROFILE_SAVED + funnel.SLIP_UPLOADED,
      newLeadsToday,
      convertedBorrowers: convertedBorrowers[0]?.count ?? 0,
      funnel,
    };
  }
}
