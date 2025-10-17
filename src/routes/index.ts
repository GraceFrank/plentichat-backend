import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health';
import { instagramWebhookRoutes } from './webhooks/ig.webhook.route';
import { chatRoutes } from './chat';
import { instagramRoutes } from './instagram.route';

/**
 * Register all application routes
 */
export async function registerRoutes(fastify: FastifyInstance) {
  await fastify.register(healthRoutes);
  await fastify.register(instagramWebhookRoutes, { prefix: '/api' });
  await fastify.register(chatRoutes, { prefix: '/api' });
  await fastify.register(instagramRoutes, { prefix: '/api' });
}
