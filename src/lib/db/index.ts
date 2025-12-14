import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Create a Neon SQL client
const sql = neon(process.env.DATABASE_URL!);

// Create and export the Drizzle ORM instance
export const db = drizzle(sql, { schema });

// Export schema for convenience
export * from './schema';
