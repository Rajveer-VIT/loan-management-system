import { Router } from 'express';
import { getSanctionedLoans, getLoanById, getStats, disburseLoan } from './disbursement.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { MODULE_ACCESS } from '../../constants/roles.js';
import { idParamSchema } from '../../utils/validation.js';

const router = Router();

router.use(authenticate, authorize(MODULE_ACCESS.disbursement));

router.get('/loans', getSanctionedLoans);
router.get('/stats', getStats);
router.get('/loans/:id', validate(idParamSchema), getLoanById);
router.patch('/loans/:id/disburse', validate(idParamSchema), disburseLoan);

export default router;
