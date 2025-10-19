import { FastifyInstance } from 'fastify';
import basicAuth from '@fastify/basic-auth';
import { FastifyAdapter } from '@bull-board/fastify';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import messageHandoffQueue from '@/queues/message-handoff/queue';
import { env } from '@/config/env';
import { logger } from '@/config/logger';

/**
 * Register Bull Board dashboard with Basic Auth protection
 */
export async function registerBullBoard(fastify: FastifyInstance) {
  // Register Basic Auth plugin
  await fastify.register(basicAuth, {
    validate: async (username, password, _req, reply) => {
      if (username !== env.BULLBOARD_USER || password !== env.BULLBOARD_PASS) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
    },
    authenticate: true,
  });

  // Create Fastify adapter for Bull Board
  const serverAdapter = new FastifyAdapter();
  serverAdapter.setBasePath('/admin/queues');

  // Create Bull Board with all queues
  createBullBoard({
    queues: [new BullMQAdapter(messageHandoffQueue)],
    serverAdapter,
  });

  // Mount Bull Board routes with Basic Auth protection
  await fastify.register(
    async (instance) => {
      instance.addHook('preHandler', instance.basicAuth);
      await instance.register(serverAdapter.registerPlugin());
    },
    { prefix: '/admin/queues' }
  );

  logger.info('✅ Bull Board dashboard registered at /admin/queues (protected with Basic Auth)');
}
