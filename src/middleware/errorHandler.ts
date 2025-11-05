import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { logger } from '@/config/logger';
import { env } from '@/config/env';
import { Sentry } from '@/config/sentry';

export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  logger.error({
    err: error,
    req: request,
    msg: 'Request error',
  });

  // Send error to Sentry for 5xx errors
  const statusCode = error.statusCode || 500;
  if (statusCode >= 500) {
    Sentry.captureException(error, {
      contexts: {
        request: {
          method: request.method,
          url: request.url,
          headers: {
            'user-agent': request.headers['user-agent'],
            'content-type': request.headers['content-type'],
          },
        },
      },
      tags: {
        endpoint: request.routeOptions?.url || request.url,
        method: request.method,
      },
    });
  }

  const message = error.message || 'Internal Server Error';

  return reply.status(statusCode).send({
    error: {
      message,
      statusCode,
      ...(env.IS_DEVELOPMENT && { stack: error.stack }),
    },
  });
}
