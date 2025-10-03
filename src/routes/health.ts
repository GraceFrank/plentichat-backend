import { FastifyInstance } from 'fastify';
import { getSupabaseClient } from '@/lib/supabase';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (_request, reply) => {
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  fastify.get('/health/ready', async (_request, reply) => {
    try {
      // Check Supabase connection
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('assistants').select('count').limit(1);

      if (error) {
        throw error;
      }

      return reply.send({
        status: 'ready',
        checks: {
          supabase: 'ok',
        },
      });
    } catch (error) {
      return reply.status(503).send({
        status: 'not ready',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
}
