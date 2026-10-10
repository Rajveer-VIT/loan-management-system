import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

import authRoutes from './modules/auth/auth.routes.js';
import borrowerRoutes from './modules/borrower/borrower.routes.js';
import salesRoutes from './modules/sales/sales.routes.js';
import sanctionRoutes from './modules/sanction/sanction.routes.js';
import disbursementRoutes from './modules/disbursement/disbursement.routes.js';
import collectionRoutes from './modules/collection/collection.routes.js';
import sharedRoutes from './modules/shared/shared.routes.js';

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: env.CLIENT_ORIGINS,
    credentials: true,
  })
);

if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '100kb' }));

// Public health check for deploy probes.
app.get('/health', (_req, res) => {
  res.status(200).json({ success: true, status: 'OK', timestamp: new Date().toISOString() });
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many authentication requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/borrower', borrowerRoutes);
app.use('/api/v1/sales', salesRoutes);
app.use('/api/v1/sanction', sanctionRoutes);
app.use('/api/v1/disbursement', disbursementRoutes);
app.use('/api/v1/collection', collectionRoutes);
app.use('/api/v1', sharedRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
