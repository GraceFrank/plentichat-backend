import { FastifyInstance } from 'fastify';
import { InstagramController } from '@/controllers/instagramController';

export async function instagramRoutes(fastify: FastifyInstance) {
  // GET /api/instagram/conversations - Fetch Instagram conversations
  fastify.get('/instagram/conversations', InstagramController.getConversations);

  // GET /api/instagram/messages - Fetch messages for a specific conversation
  fastify.get('/instagram/messages', InstagramController.getMessages);

  // POST /api/instagram/send-message - Send Instagram message
  fastify.post('/instagram/send-message', InstagramController.sendMessage);
}
