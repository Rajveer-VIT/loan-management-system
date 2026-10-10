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
import { MODULE_ACCESS } from '../../constants/roles.js';
import { idParamSchema } from '../../utils/validation.js';
import { saveProfileSchema, applyLoanSchema } from './borrower.schema.js';

const router = Router();

// Borrowers only. Staff (including Admin) never apply for loans through this portal.
router.use(authenticate, authorize(MODULE_ACCESS.borrower));

router.get('/loans/draft', getDraftLoan);
router.post('/profile', validate(saveProfileSchema), saveProfile);
// Params are validated before multer runs, so a bad ID never writes a file to disk.
router.post('/loans/:id/salary-slip', validate(idParamSchema), uploadSalarySlip.single('file'), uploadSlip);
router.post('/loans/:id/apply', validate(applyLoanSchema), applyLoan);
router.get('/loans', getMyLoans);
router.get('/loans/:id', validate(idParamSchema), getMyLoanById);

export default router;
