import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { errorHandler } from '@/middleware/errorHandler';
import { webhookRoutes } from '@/routes/webhooks';
import { chatRoutes } from '@/routes/chat';
import { healthRoutes } from '@/routes/health';

const fastify = Fastify({
  logger,
  bodyLimit: 10485760, // 10MB
  trustProxy: true,
  disableRequestLogging: env.NODE_ENV === 'production',
});

// Register plugins
async function registerPlugins() {
  // Security headers
  await fastify.register(helmet, {
    contentSecurityPolicy: false,
  });

  // CORS
  await fastify.register(cors, {
    origin: env.NODE_ENV === 'production'
      ? ['https://plentichat.com', 'https://www.plentichat.com']
      : true,
    credentials: true,
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    allowList: ['127.0.0.1'],
  });
}

// Register routes
async function registerRoutes() {
  await fastify.register(healthRoutes);
  await fastify.register(webhookRoutes);
  await fastify.register(chatRoutes);
}

// Error handler
fastify.setErrorHandler(errorHandler);

// Raw body plugin for webhook signature verification
fastify.addContentTypeParser(
  'application/json',
  { parseAs: 'buffer' },
  async (req, body: Buffer) => {
    (req as any).rawBody = body;
    return JSON.parse(body.toString());
  }
);

// Start server
async function start() {
  try {
    await registerPlugins();
    await registerRoutes();

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
