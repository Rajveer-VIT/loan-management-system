import mongoose, { PipelineStage } from 'mongoose';
import { User, IUser } from '../../models/User.model.js';
import { Loan } from '../../models/Loan.model.js';
import { ROLES } from '../../constants/roles.js';
import { LOAN_STATUS } from '../../constants/loanStatus.js';
import { escapeRegex } from '../../utils/regex.js';

export interface SalesLeadFilter {
  page?: number;
  limit?: number;
  search?: string;
}

export class SalesService {
  static async getLeads(filter: SalesLeadFilter) {
    const page = Math.max(1, Number(filter.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(filter.limit) || 10)); // Cap limit at 50
    const skip = (page - 1) * limit;

    const matchStage: mongoose.FilterQuery<IUser> = { role: ROLES.BORROWER, isActive: true };

    if (filter.search && filter.search.trim() !== '') {
      const safeSearch = escapeRegex(filter.search.trim());
      const searchRegex = new RegExp(safeSearch, 'i');
      matchStage.$or = [{ name: searchRegex }, { email: searchRegex }];
    }

    const pipeline: PipelineStage[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'loans',
          localField: '_id',
          foreignField: 'borrower',
          as: 'loans',
        },
      },
      {
        $project: {
          id: '$_id',
          name: 1,
          email: 1,
          createdAt: 1,
          latestLoan: { $arrayElemAt: ['$loans', 0] },
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const leads = await User.aggregate(pipeline);
    const total = await User.countDocuments(matchStage);
    const totalPages = Math.ceil(total / limit) || 1;

    const formattedLeads = leads.map((lead) => {
      let stage = 'REGISTERED';
      let loanId = null;
      let loanAmount = null;

      if (lead.latestLoan) {
        loanId = lead.latestLoan._id;
        loanAmount = lead.latestLoan.amount;
        const status = lead.latestLoan.status;

        if (status === LOAN_STATUS.DRAFT) {
          if (lead.latestLoan.salarySlip && lead.latestLoan.salarySlip.path) {
            stage = 'SLIP_UPLOADED';
          } else if (lead.latestLoan.personalDetails && lead.latestLoan.personalDetails.fullName) {
            stage = 'PROFILE_SAVED';
          } else {
            stage = 'REGISTERED';
          }
        } else {
          stage = status;
        }
      }

      return {
        id: lead._id.toString(),
        name: lead.name,
        email: lead.email,
        createdAt: lead.createdAt,
        stage,
        loanId,
        loanAmount,
      };
    });

    return {
      leads: formattedLeads,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  static async getStats() {
    const totalLeads = await User.countDocuments({ role: ROLES.BORROWER, isActive: true });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newLeadsToday = await User.countDocuments({
      role: ROLES.BORROWER,
      createdAt: { $gte: today },
    });

    const registeredOnly = await User.aggregate([
      { $match: { role: ROLES.BORROWER, isActive: true } },
      {
        $lookup: {
          from: 'loans',
          localField: '_id',
          foreignField: 'borrower',
          as: 'loans',
        },
      },
      { $match: { loans: { $size: 0 } } },
      { $count: 'count' },
    ]);

    const profileSaved = await Loan.countDocuments({
      status: LOAN_STATUS.DRAFT,
      'personalDetails.fullName': { $exists: true },
      'salarySlip.path': { $exists: false },
    });

    const slipUploaded = await Loan.countDocuments({
      status: LOAN_STATUS.DRAFT,
      'salarySlip.path': { $exists: true },
    });

    const appliedLoans = await Loan.countDocuments({ status: LOAN_STATUS.APPLIED });

    return {
      totalLeads,
      newLeadsToday,
      funnel: {
        registered: registeredOnly[0]?.count || 0,
        profileSaved,
        slipUploaded,
        applied: appliedLoans,
      },
    };
  }
}
