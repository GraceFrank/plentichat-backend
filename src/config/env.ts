import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  IS_DEVELOPMENT: z.boolean().default(process.env["NODE_ENV"] === "development"),

  PORT: z.string().transform(Number),
  HOST: z.string().default('0.0.0.0'),
  CORS_ALLOWED_ORIGINS: z.string().default('https://plentichat.com,https://www.plentichat.com,https://app.plentichat.com'),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_API_KEY: z.string(), // Service role key
  SUPABASE_ANON_KEY: z.string(), // Public anon key for RLS

  // Meta (Instagram/WhatsApp)
  META_APP_SECRET: z.string(),

  // Instagram
  INSTAGRAM_WEBHOOK_VERIFY_TOKEN: z.string(),
  INSTAGRAM_API_BASE_URL: z.string().default('https://graph.instagram.com/v23.0'),

  // WhatsApp
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string(),

  // Google Cloud KMS
  GOOGLE_PROJECT_ID: z.string(),
  GOOGLE_CLIENT_EMAIL: z.string(),
  GOOGLE_PRIVATE_KEY: z.string(),
  GOOGLE_CLOUD_KMS_KEY_RING: z.string(),
  GOOGLE_CLOUD_KMS_KEY: z.string(),
  GOOGLE_CLOUD_KMS_LOCATION: z.string(),

  // OpenAI
  OPENAI_API_KEY: z.string(),

  // Resend (Email)
  RESEND_API_KEY: z.string(),
  RESEND_FROM_EMAIL: z.string().email().default('notification@mail.plentichat.com'),

  // Twilio (SMS)
  TWILIO_ACCOUNT_SID: z.string(),
  TWILIO_AUTH_TOKEN: z.string(),
  TWILIO_PHONE_NUMBER: z.string(),

  // Redis
  REDIS_URL: z.string(),
  REDIS_CHECKPOINTER_URL: z.string(),

  // Bull Board (Queue Dashboard)
  BULLBOARD_USER: z.string(),
  BULLBOARD_PASS: z.string(),

  FRONTEND_APP_URL: z.string(),

  // Sentry
  SENTRY_DSN: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);
