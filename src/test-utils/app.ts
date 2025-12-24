import Fastify, { FastifyInstance, FastifyRequest } from 'fastify';
import { registerRoutes } from '@/routes';

/**
 * Build a test Fastify app with all routes registered
 * Generic helper that can be used across all tests
 */
export async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false,
  });

  // Raw body parser for webhook signature verification
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    async (req: FastifyRequest, body: Buffer) => {
      req.rawBody = body;
      return JSON.parse(body.toString());
    }
  );

  // Register all application routes
  await app.register(registerRoutes);
  await app.ready();

  return app;
}
