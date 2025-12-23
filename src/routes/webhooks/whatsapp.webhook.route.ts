import { FastifyInstance } from 'fastify';
import { WhatsappWebhookController } from '@/controllers/webhooks/whatsapp.webhook.controller';
import { validate } from '@/middleware/validate.middleware';
import { verifyMetaSignature } from '@/middleware/metaSignature.middleware';
import { whatsappWebhookVerificationSchema } from '@/validations/webhooks/whatsapp.validation';
import { env } from '@/config/env';

/**
 * Register WhatsApp webhook routes
 */
export async function whatsappWebhookRoutes(fastify: FastifyInstance) {
  // GET - Webhook verification
  fastify.get(
    '/webhooks/whatsapp',
    {
      preHandler: [validate({ query: whatsappWebhookVerificationSchema })],
    },
    WhatsappWebhookController.verifyWebhook
  );

  // POST - Webhook events
  fastify.post(
    '/webhooks/whatsapp',
    {
      preHandler: [verifyMetaSignature(env.META_APP_SECRET)],
    },
    WhatsappWebhookController.handleWebhookEvent
  );
}
