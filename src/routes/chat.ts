import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { buildRagGraph } from '@/services/agent/ragFactory';
import { getSupabaseClient } from '@/lib/supabase';
import { HumanMessage } from '@langchain/core/messages';
import { authMiddleware } from '@/middleware/auth';
import { logger } from '@/config/logger';

interface ChatBody {
  assistantId: string;
  text: string;
}

export async function chatRoutes(fastify: FastifyInstance) {
  fastify.post('/chat/message', {
    preHandler: authMiddleware,
  }, async (request: FastifyRequest<{ Body: ChatBody }>, reply: FastifyReply) => {
    const { assistantId, text } = request.body;
    const userId = request.user?.id;

    if (!assistantId || !text) {
      return reply.status(400).send({ error: 'Missing assistantId or text' });
    }

    logger.info(`Chat request from user ${userId} to assistant ${assistantId}`);

    const supabase = getSupabaseClient();

    const { data: assistant, error } = await supabase
      .from('assistants')
      .select('*')
      .eq('id', assistantId)
      .single();

    if (error || !assistant) {
      logger.warn(`Assistant not found: ${assistantId}`);
      return reply.status(404).send({ error: 'Assistant not found' });
    }

    // Verify user owns this assistant
    if (assistant.user_id !== userId) {
      logger.warn(`User ${userId} attempted to access assistant ${assistantId} owned by ${assistant.user_id}`);
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const graph = buildRagGraph(assistant, supabase);

    const result = await graph.invoke({
      messages: [new HumanMessage(text)],
    });

    const finalReply = result.messages[result.messages.length - 1].content;

    logger.info(`Chat response generated for assistant ${assistantId}`);

    return reply.send({ reply: finalReply });
  });
}
