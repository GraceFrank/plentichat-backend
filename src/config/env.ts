import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  PORT: z.string().transform(Number),
  HOST: z.string().default('0.0.0.0'),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_API_KEY: z.string(),

  // Instagram/Meta
  INSTAGRAM_APP_SECRET: z.string(),
  META_VERIFY_TOKEN: z.string(),

  // Google Cloud KMS
  GOOGLE_PROJECT_ID: z.string(),
  GOOGLE_CLIENT_EMAIL: z.string(),
  GOOGLE_PRIVATE_KEY: z.string(),
  GOOGLE_CLOUD_KMS_KEY_RING: z.string(),
  GOOGLE_CLOUD_KMS_KEY: z.string(),
  GOOGLE_CLOUD_KMS_LOCATION: z.string(),

  // OpenAI
  OPENAI_API_KEY: z.string(),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);
