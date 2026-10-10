import { Router } from 'express';
import { z } from 'zod';
import { getLeads, getStats } from './sales.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { MODULE_ACCESS } from '../../constants/roles.js';
import { LEAD_STAGES } from './sales.service.js';

const listLeadsSchema = z.object({
  query: z.object({ stage: z.enum(LEAD_STAGES).optional() }),
});

const router = Router();

router.use(authenticate, authorize(MODULE_ACCESS.sales));

router.get('/leads', validate(listLeadsSchema), getLeads);
router.get('/stats', getStats);

export default router;
