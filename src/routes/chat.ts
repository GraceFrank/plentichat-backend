import { FastifyInstance } from 'fastify';
import { authMiddleware } from '@/middleware/auth';
import { sendChatMessage } from '@/controllers/chat.controller';

interface ChatBody {
  assistantId: string;
  text: string;
  sessionId?: string; // Optional session ID for conversation tracking
}

export async function chatRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: ChatBody }>('/chat/message', {
    preHandler: authMiddleware,
  }, sendChatMessage);
}
