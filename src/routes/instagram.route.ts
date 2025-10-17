import { FastifyInstance } from 'fastify';
import { InstagramController } from '@/controllers/instagram.controller';
import { authMiddleware } from '@/middleware/auth';
import { validate } from '@/middleware/validate.middleware';
import {
  getConversationsQuerySchema,
  getMessagesQuerySchema,
  sendMessageQuerySchema,
  sendMessageBodySchema,
  type GetConversationsQuery,
  type GetMessagesQuery,
  type SendMessageBody,
  type SendMessageQuery,
} from '@/validations/instagram.validation';

export async function instagramRoutes(fastify: FastifyInstance) {
  // GET /api/instagram/conversations - Fetch Instagram conversations
  fastify.get<{ Querystring: GetConversationsQuery }>(
    '/instagram/conversations',
    {
      preHandler: [
        authMiddleware,
        validate({ query: getConversationsQuerySchema }),
      ],
    },
    InstagramController.getConversations
  );

  // GET /api/instagram/messages - Fetch messages for a specific conversation
  fastify.get<{ Querystring: GetMessagesQuery }>(
    '/instagram/messages',
    {
      preHandler: [
        authMiddleware,
        validate({ query: getMessagesQuerySchema }),
      ],
    },
    InstagramController.getMessages
  );

  // POST /api/instagram/send-message - Send Instagram message
  fastify.post<{ Body: SendMessageBody; Querystring: SendMessageQuery }>(
    '/instagram/send-message',
    {
      preHandler: [
        authMiddleware,
        validate({
          query: sendMessageQuerySchema,
          body: sendMessageBodySchema,
        }),
      ],
    },
    InstagramController.sendMessage
  );
}
