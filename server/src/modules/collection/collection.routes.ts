import { Router } from 'express';
import { getDisbursedLoans, getLoanById, getStats, recordPayment } from './collection.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { MODULE_ACCESS } from '../../constants/roles.js';
import { idParamSchema } from '../../utils/validation.js';
import { listCollectionSchema, recordPaymentSchema } from './collection.schema.js';

const router = Router();

router.use(authenticate, authorize(MODULE_ACCESS.collection));

router.get('/loans', validate(listCollectionSchema), getDisbursedLoans);
router.get('/stats', getStats);
router.get('/loans/:id', validate(idParamSchema), getLoanById);
// Loan + payment history (kept as a separate path for API compatibility).
router.get('/loans/:id/payments', validate(idParamSchema), getLoanById);
router.post('/loans/:id/payments', validate(recordPaymentSchema), recordPayment);

export default router;
