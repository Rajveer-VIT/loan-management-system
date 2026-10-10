import { Router } from 'express';
import {
  getDraftLoan,
  saveProfile,
  uploadSlip,
  applyLoan,
  getMyLoans,
  getMyLoanById,
} from './borrower.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { uploadSalarySlip } from '../../middleware/upload.js';
import { ROLES } from '../../constants/roles.js';
import {
  saveProfileSchema,
  applyLoanSchema,
  loanParamSchema,
} from './borrower.schema.js';

const router = Router();

// Require Borrower role (Admin passes as per authorize logic)
router.use(authenticate, authorize(ROLES.BORROWER));

router.get('/loans/draft', getDraftLoan);
router.post('/profile', validate(saveProfileSchema), saveProfile);
router.post('/loans/:id/salary-slip', validate(loanParamSchema), uploadSalarySlip.single('file'), uploadSlip);
router.post('/loans/:id/apply', validate(applyLoanSchema), applyLoan);
router.get('/loans', getMyLoans);
router.get('/loans/:id', validate(loanParamSchema), getMyLoanById);

export default router;
