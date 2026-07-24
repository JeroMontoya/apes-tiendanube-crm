import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
// Also load server/.env for server-specific variables
dotenv.config({ path: 'server/.env' });

// Export a function to ensure env is loaded
export function ensureEnvLoaded() {}