import { Router } from 'express';
import { getSanctionedLoans, getLoanById, getStats, disburseLoan } from './disbursement.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { ROLES } from '../../constants/roles.js';

const router = Router();

router.use(authenticate, authorize(ROLES.DISBURSEMENT));

router.get('/loans', getSanctionedLoans);
router.get('/stats', getStats);
router.get('/loans/:id', getLoanById);
router.patch('/loans/:id/disburse', disburseLoan);

export default router;
