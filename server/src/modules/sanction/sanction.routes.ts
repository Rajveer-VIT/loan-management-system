import { Router } from 'express';
import { getAppliedLoans, getLoanById, getStats, approveLoan, rejectLoan } from './sanction.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { ROLES } from '../../constants/roles.js';
import { rejectLoanSchema, loanIdParamSchema } from './sanction.schema.js';

const router = Router();

router.use(authenticate, authorize(ROLES.SANCTION));

router.get('/loans', getAppliedLoans);
router.get('/stats', getStats);
router.get('/loans/:id', validate(loanIdParamSchema), getLoanById);
router.patch('/loans/:id/approve', validate(loanIdParamSchema), approveLoan);
router.patch('/loans/:id/reject', validate(rejectLoanSchema), rejectLoan);

export default router;
