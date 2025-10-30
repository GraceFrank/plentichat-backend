import { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import basicAuth from '@fastify/basic-auth';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { createBullBoardAdapter } from './bullboard.plugin';

/**
 * Register all Fastify plugins
 */
export async function registerPlugins(fastify: FastifyInstance) {
  // Security headers
  await fastify.register(helmet, {
    contentSecurityPolicy: false,
  });

  // CORS
  await fastify.register(cors, {
    origin: env.NODE_ENV === 'production'
      ? env.CORS_ALLOWED_ORIGINS.split(',')
      : true,
    credentials: true,
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    allowList: ['127.0.0.1'],
  });

  // Basic Auth for Bull Board
  await fastify.register(basicAuth, {
    validate: async (username, password, _req, reply) => {
      if (username !== env.BULLBOARD_USER || password !== env.BULLBOARD_PASS) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
    },
    authenticate: true,
  });

  // Bull Board dashboard
  const serverAdapter = createBullBoardAdapter();
  await fastify.register(
    async (instance) => {
      instance.addHook('preHandler', instance.basicAuth);
      await instance.register(serverAdapter.registerPlugin());
    },
    { prefix: '/admin/queues' }
  );

  logger.info('✅ Bull Board dashboard registered at /admin/queues (protected with Basic Auth)');
}
