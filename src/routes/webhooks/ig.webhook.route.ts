import { FastifyInstance } from 'fastify';
import { InstagramWebhookController } from '@/controllers/webhooks/instagram.webhook.controller';
import { validate } from '@/middleware/validate.middleware';
import { verifyMetaSignature } from '@/middleware/metaSignature.middleware';
import { instagramWebhookVerificationSchema } from '@/validations/webhooks/instagram.validation';
import { env } from '@/config/env';

/**
 * Register Instagram webhook routes
 */
export async function instagramWebhookRoutes(fastify: FastifyInstance) {
  // GET - Webhook verification
  fastify.get(
    '/webhooks/instagram',
    {
      preHandler: [validate({ query: instagramWebhookVerificationSchema })],
    },
    InstagramWebhookController.verifyWebhook
  );

  // POST - Webhook events
  fastify.post(
    '/webhooks/instagram',
    {
      preHandler: [verifyMetaSignature(env.META_APP_SECRET)],
    },
    InstagramWebhookController.handleWebhookEvent
  );
}
