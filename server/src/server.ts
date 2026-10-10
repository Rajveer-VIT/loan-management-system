import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';

const startServer = async () => {
  await connectDB();

  app.listen(env.PORT, () => {
    console.log(`LMS server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    console.log(`Health check: http://localhost:${env.PORT}/health`);
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
