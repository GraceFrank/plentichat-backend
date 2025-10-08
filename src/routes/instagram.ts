import { FastifyInstance } from 'fastify';
import { InstagramController } from '@/controllers/instagramController';
import { authMiddleware } from '@/middleware/auth';

interface GetConversationsQuery {
  // No query params needed - userId comes from auth token
}

interface GetMessagesQuery {
  conversationId: string;
}

interface SendMessageBody {
  recipientId: string;
  message: string;
}

export async function instagramRoutes(fastify: FastifyInstance) {
  // GET /api/instagram/conversations - Fetch Instagram conversations
  fastify.get<{ Querystring: GetConversationsQuery }>('/instagram/conversations', {
    preHandler: authMiddleware
  }, InstagramController.getConversations);

  // GET /api/instagram/messages - Fetch messages for a specific conversation
  fastify.get<{ Querystring: GetMessagesQuery }>('/instagram/messages', {
    preHandler: authMiddleware
  }, InstagramController.getMessages);

  // POST /api/instagram/send-message - Send Instagram message
  fastify.post<{ Body: SendMessageBody }>('/instagram/send-message', {
    preHandler: authMiddleware
  }, InstagramController.sendMessage);
}
