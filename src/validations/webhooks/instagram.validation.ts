import { z } from 'zod';

/**
 * Instagram webhook verification query schema (GET request)
 */
export const instagramWebhookVerificationSchema = z.object({
  'hub.mode': z.string(),
  'hub.verify_token': z.string(),
  'hub.challenge': z.string(),
});

/**
 * Instagram webhook payload schema (POST request)
 * Based on Meta's webhook payload structure
 */
export const instagramWebhookPayloadSchema = z.object({
  object: z.string(),
  entry: z.array(
    z.object({
      id: z.string(),
      time: z.number(),
      messaging: z.array(
        z.object({
          sender: z.object({
            id: z.string(),
          }),
          recipient: z.object({
            id: z.string(),
          }),
          timestamp: z.number(),
          message: z
            .object({
              mid: z.string(),
              text: z.string().optional(),
            })
            .optional(),
        })
      ),
    })
  ),
});

// Type exports
export type InstagramWebhookVerification = z.infer<typeof instagramWebhookVerificationSchema>;
export type InstagramWebhookPayload = z.infer<typeof instagramWebhookPayloadSchema>;
