import { FastifyRequest, FastifyReply } from 'fastify';
import { env } from '@/config/env';
import { logger } from '@/config/logger';

export class WhatsappWebhookController {


  /**
  * Handle webhook verification (GET request)
  */
  static async verifyWebhook(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const query = request.query as {
      'hub.mode'?: string;
      'hub.verify_token'?: string;
      'hub.challenge'?: string;
    };

    logger.info(
      {
        mode: query['hub.mode'],
        hasToken: !!query['hub.verify_token'],
        hasChallenge: !!query['hub.challenge'],
      },
      'WhatsApp webhook verification request'
    );

    if (
      query['hub.mode'] === 'subscribe' &&
      query['hub.verify_token'] === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
    ) {
      logger.info('WhatsApp webhook verification successful');
      return reply.status(200).type('text/plain').send(query['hub.challenge']);
    }

    logger.warn('WhatsApp webhook verification failed');
    return reply.status(403).send('Forbidden');
  }

  /**
   * Handle webhook events (POST request)
   * Note: Signature verification is handled by middleware
   */
  static async handleWebhookEvent(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const rawBody = request.rawBody as Buffer;
    const payload = JSON.parse(rawBody.toString());

    logger.info({ payload }, 'WhatsApp webhook payload received');

    // Process in background, return 200 immediately
    setImmediate(async () => {
      try {
        // TODO: Implement WhatsApp message handling logic
        logger.info('Processing WhatsApp webhook event');
      } catch (error) {
        logger.error({ err: error, payload }, 'Error processing WhatsApp webhook event');
      }
    });

    return reply.status(200).send('OK');
  }
}
