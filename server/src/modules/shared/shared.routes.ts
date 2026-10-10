import { Router } from 'express';
import { getSalarySlipFile } from './shared.controller.js';
import { authenticate } from '../../middleware/authenticate.js';

const router = Router();

// Endpoint accessible by authenticated staff or owner borrower
router.get('/loans/:id/salary-slip', authenticate, getSalarySlipFile);

export default router;
