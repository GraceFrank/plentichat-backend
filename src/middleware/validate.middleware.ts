import { FastifyRequest, FastifyReply } from 'fastify';
import { ZodType, ZodError } from 'zod';

export interface ValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/**
 * Validation middleware factory that creates a middleware for validating request data
 * @param schemas - Object containing Zod schemas for body, query, and/or params
 * @returns Fastify middleware function
 */
export function validate(schemas: ValidationSchemas) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Validate request body if schema provided
      if (schemas.body) {
        request.body = schemas.body.parse(request.body);
      }

      // Validate query parameters if schema provided
      if (schemas.query) {
        request.query = schemas.query.parse(request.query);
      }

      // Validate route parameters if schema provided
      if (schemas.params) {
        request.params = schemas.params.parse(request.params);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }

      // Re-throw unexpected errors
      throw error;
    }
  };
}
