import { FastifyInstance } from 'fastify';
import { checkDisposableEmail } from '../controllers/email.controller';

/**
 * Email validation routes
 */
export async function emailRoutes(fastify: FastifyInstance) {
  fastify.post('/email/check-disposable', checkDisposableEmail);
}
