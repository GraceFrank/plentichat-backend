import { z } from 'zod';

/**
 * WhatsApp webhook verification query schema (GET request)
 */
export const whatsappWebhookVerificationSchema = z.object({
  'hub.mode': z.string(),
  'hub.verify_token': z.string(),
  'hub.challenge': z.string(),
});

// Type export
export type WhatsappWebhookVerification = z.infer<typeof whatsappWebhookVerificationSchema>;
