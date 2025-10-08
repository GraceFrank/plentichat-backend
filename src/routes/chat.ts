import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { buildRagGraph } from '@/services/agent/ragFactory';
import { HumanMessage } from '@langchain/core/messages';
import { authMiddleware } from '@/middleware/auth';
import { logger } from '@/config/logger';

interface ChatBody {
  assistantId: string;
  text: string;
}

export async function chatRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: ChatBody }>('/chat/message', {
    preHandler: authMiddleware,
  }, async (request, reply) => {
    const { assistantId, text } = request.body;
    const userId = request.user!.id;
    const supabase = request.supabase!;

    if (!assistantId || !text) {
      return reply.status(400).send({ error: 'Missing assistantId or text' });
    }

    logger.info(`Chat request from user ${userId} to assistant ${assistantId}`);

    const { data: assistant, error } = await supabase
      .from('assistants')
      .select('*')
      .eq('id', assistantId)
      .single();

    if (error || !assistant) {
      logger.warn(`Assistant not found: ${assistantId}`);
      return reply.status(404).send({ error: 'Assistant not found' });
    }

    // RLS will ensure user can only access their own assistants
    // No need for manual check since RLS policies handle this

    const graph = buildRagGraph(assistant, supabase);

    const result = await graph.invoke({
      messages: [new HumanMessage(text)],
    });

    const finalReply = result.messages[result.messages.length - 1].content;

    logger.info(`Chat response generated for assistant ${assistantId}`);

    return reply.send({ reply: finalReply });
  });
}
