import { FastifyRequest, FastifyReply } from 'fastify';
import { verifySignature } from '@/utils/signature.util';
import { logger } from '@/config/logger';
import { env } from '@/config/env';

/**
 * Verify Meta (Instagram/Facebook/WhatsApp) webhook signature
 * This middleware validates the x-hub-signature-256 header
 */
export function verifyMetaSignature(appSecret: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Bypass signature verification in development mode
    if (env.NODE_ENV === 'development') {
      logger.info('⚠️  Skipping signature verification (development mode)');
      return;
    }

    const signature = request.headers['x-hub-signature-256'] as string;

    if (!signature) {
      logger.warn('Missing webhook signature');
      return reply.status(401).send({ error: 'Missing signature' });
    }

    const rawBody = request.rawBody as Buffer;

    if (!rawBody) {
      logger.warn('Missing raw body for signature verification');
      return reply.status(400).send({ error: 'Missing request body' });
    }

    const isValid = verifySignature(rawBody, signature, appSecret);

    if (!isValid) {
      logger.warn({
        receivedSignature: signature,
        rawBodyPreview: rawBody.toString().substring(0, 200),
        rawBodyLength: rawBody.length
      }, 'Invalid webhook signature - Debug info');
      return reply.status(401).send({ error: 'Invalid signature' });
    }

    // Signature is valid, continue to route handler
  };
}
