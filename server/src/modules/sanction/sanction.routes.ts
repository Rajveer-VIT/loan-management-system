import { Router } from 'express';
import { getAppliedLoans, getLoanById, getStats, approveLoan, rejectLoan } from './sanction.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { MODULE_ACCESS } from '../../constants/roles.js';
import { idParamSchema } from '../../utils/validation.js';
import { rejectLoanSchema } from './sanction.schema.js';

const router = Router();

router.use(authenticate, authorize(MODULE_ACCESS.sanction));

router.get('/loans', getAppliedLoans);
router.get('/stats', getStats);
router.get('/loans/:id', validate(idParamSchema), getLoanById);
router.patch('/loans/:id/approve', validate(idParamSchema), approveLoan);
router.patch('/loans/:id/reject', validate(rejectLoanSchema), rejectLoan);

export default router;
