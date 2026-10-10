import { Router } from 'express';
import { getLeads, getStats } from './sales.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { ROLES } from '../../constants/roles.js';

const router = Router();

router.use(authenticate, authorize(ROLES.SALES));

router.get('/leads', getLeads);
router.get('/stats', getStats);

export default router;
