import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * Connects to MongoDB and builds the declared indexes. The unique UTR index and the
 * one-draft-per-borrower partial index enforce data-integrity rules, so they are built
 * eagerly. If pre-existing data violates one (e.g. legacy duplicate drafts), the build
 * fails; that is reported loudly instead of crashing the server.
 */
export const connectDB = async (uri: string = env.MONGODB_URI): Promise<typeof mongoose> => {
  const conn = await mongoose.connect(uri);

  const results = await Promise.allSettled(
    Object.values(conn.models).map((model) => model.createIndexes())
  );
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      const modelName = Object.keys(conn.models)[i];
      console.warn(`WARNING: index build failed for model '${modelName}':`, (result.reason as Error).message);
    }
  });

  console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
};
