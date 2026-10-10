import { Router } from 'express';
import { signup, login, getMe } from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { signupSchema, loginSchema } from './auth.schema.js';

const router = Router();

router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);
router.get('/me', authenticate, getMe);

export default router;
