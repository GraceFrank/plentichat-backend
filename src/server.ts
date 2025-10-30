import Fastify, { FastifyRequest } from 'fastify';
import { env } from '@/config/env';
import { logger, fastifyLoggerConfig } from '@/config/logger';
import { errorHandler } from '@/middleware/errorHandler';
import { registerRoutes } from '@/routes';
import { registerPlugins } from '@/plugins';

const fastify = Fastify({
  logger: fastifyLoggerConfig,
  bodyLimit: 10485760, // 10MB
  trustProxy: true,
  disableRequestLogging: env.NODE_ENV === 'production',
});

// Error handler
fastify.setErrorHandler(errorHandler);

// Extend FastifyRequest to include rawBody
declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: Buffer;
  }
}

// Raw body plugin for webhook signature verification
fastify.addContentTypeParser(
  'application/json',
  { parseAs: 'buffer' },
  async (req: FastifyRequest, body: Buffer) => {
    req.rawBody = body;
    return JSON.parse(body.toString());
  }
);

// Start server
async function start() {
  try {
    await registerPlugins(fastify);
    await registerRoutes(fastify);

    await fastify.listen({
      port: env.PORT,
      host: env.HOST,
    });

    logger.info(`🚀 Server listening on ${env.HOST}:${env.PORT}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}

// Graceful shutdown
const signals = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    await fastify.close();
    process.exit(0);
  });
});

start();
