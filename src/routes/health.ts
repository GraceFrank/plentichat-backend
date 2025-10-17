import { FastifyInstance } from 'fastify';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { generateMetaWebhookSignature } from '@/utils/signature.util';

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
      // Check Supabase connection - use service client for health check
      const supabase = getSupabaseServiceClient();
      const { error } = await supabase.from('assistants').select('count').limit(1);

      generateMetaWebhookSignature({

      })

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
