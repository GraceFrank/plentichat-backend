import { FastifyRequest, FastifyReply } from 'fastify';
import { getSupabaseServiceClient } from '@/config/supabase';
import redis from '@/config/redis';

export class HealthController {
  /**
   * Basic health check - returns if server is running
   */
  static async getHealth(_request: FastifyRequest, reply: FastifyReply) {
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }

  /**
   * Readiness check - verifies all dependencies are healthy
   */
  static async getReadiness(_request: FastifyRequest, reply: FastifyReply) {
    try {
      const checks: Record<string, string> = {};

      // Check Supabase connection
      const supabase = getSupabaseServiceClient();
      const { error: supabaseError } = await supabase
        .from('assistants')
        .select('count')
        .limit(1);

      if (supabaseError) {
        checks.supabase = 'error';
        throw new Error(`Supabase health check failed: ${supabaseError.message}`);
      }
      checks.supabase = 'ok';

      // Check Redis connection
      try {
        await redis.ping();
        checks.redis = 'ok';
      } catch (redisError) {
        checks.redis = 'error';
        throw new Error(
          `Redis health check failed: ${redisError instanceof Error ? redisError.message : 'Unknown error'}`
        );
      }

      return reply.send({
        status: 'ready',
        checks,
      });
    } catch (error) {
      return reply.status(503).send({
        status: 'not ready',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
