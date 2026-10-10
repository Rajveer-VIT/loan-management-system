import { Router } from 'express';
import { getSalarySlipFile } from './shared.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { ROLES } from '../../constants/roles.js';
import { idParamSchema } from '../../utils/validation.js';

const router = Router();

// Least privilege: the underwriting (Sanction) and payout (Disbursement) teams need the
// income document; Sales and Collection do not. Borrowers can fetch only their own.
const SALARY_SLIP_READERS = [ROLES.ADMIN, ROLES.SANCTION, ROLES.DISBURSEMENT, ROLES.BORROWER] as const;

router.get(
  '/loans/:id/salary-slip',
  authenticate,
  authorize(SALARY_SLIP_READERS),
  validate(idParamSchema),
  getSalarySlipFile
);

export default router;
