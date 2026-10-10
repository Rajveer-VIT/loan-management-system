import { Router } from 'express';
import { getDisbursedLoans, getLoanById, getStats, recordPayment, getPaymentHistory } from './collection.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { ROLES } from '../../constants/roles.js';
import { recordPaymentSchema, loanIdParamSchema } from './collection.schema.js';

const router = Router();

router.use(authenticate, authorize(ROLES.COLLECTION));

router.get('/loans', getDisbursedLoans);
router.get('/stats', getStats);
router.get('/loans/:id', validate(loanIdParamSchema), getLoanById);
router.post('/loans/:id/payments', validate(recordPaymentSchema), recordPayment);
router.get('/loans/:id/payments', validate(loanIdParamSchema), getPaymentHistory);

export default router;
