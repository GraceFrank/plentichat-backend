import { FastifyInstance } from 'fastify';
import { HealthController } from '@/controllers/health.controller';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', HealthController.getHealth);
  fastify.get('/health/ready', HealthController.getReadiness);
}
