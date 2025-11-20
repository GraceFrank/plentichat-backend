import { FastifyRequest, FastifyReply } from 'fastify';
import InstagramService from '@/services/instagram.service';
import { SocialAccount } from '@/models/SocialAccount';
import { logger } from '@/config/logger';
import type { Conversation } from '@/types/instagram';
import type {
  GetConversationsQuery,
  GetMessagesQuery,
  SendMessageBody,
  SendMessageQuery,
} from '@/validations/instagram.validation';

export class InstagramController {
  /**
   * Get all conversations for a user's Instagram accounts
   */
  static async getConversations(
    request: FastifyRequest<{ Querystring: GetConversationsQuery }>,
    reply: FastifyReply
  ) {
    try {
      const supabase = request.supabase!;
      const accountId = request.query.social_account_id;

      // Get user's Instagram accounts using the model (don't filter by is_active)
      const socialAccount = await SocialAccount.findById(supabase, accountId, undefined);

      if (!socialAccount) {
        return reply.send({
          success: true,
          data: [],
        });
      }
      const allConversations: Conversation[] = [];

      // Fetch conversations for each account
      try {
        const accessToken = await socialAccount.getAccessToken();
        const igUserId = socialAccount.platformUserId;


        if (!igUserId) {
          logger.warn({ accountId: socialAccount.id }, 'Account missing platform_user_id');
          return reply.send({ success: true, data: [] });
        }

        // Fetch conversations from Instagram API
        const conversationsResponse = await InstagramService.getConversations(accessToken);


        const conversations = conversationsResponse.data || [];

        // Transform conversations
        for (const conv of conversations) {
          // Get participant info (the other person in the conversation)
          const participant = conv.participants?.data?.find(
            (p: { id: string }) => p.id !== igUserId
          );


          if (!participant) continue;

          // Fetch participant details using service
          const participantDetails = await InstagramService.getIgUserProfile(
            participant.id,
            accessToken
          );

          // Format and add conversation
          const formattedConversation = InstagramService.formatConversation(
            conv,
            participantDetails
          );

          allConversations.push(formattedConversation);
        }
      } catch (err) {
        logger.error({ err, accountId: socialAccount.id }, 'Error fetching conversations for account');
      }


      // Sort by updated_time
      allConversations.sort(
        (a, b) => new Date(b.updated_time).getTime() - new Date(a.updated_time).getTime()
      );

      return reply.send({
        success: true,
        data: allConversations,
      });
    } catch (error) {
      logger.error({ err: error }, 'Error in getConversations controller');
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch conversations',
      });
    }
  }

  /**
   * Get messages for a specific conversation
   */
  static async getMessages(
    request: FastifyRequest<{ Querystring: GetMessagesQuery }>,
    reply: FastifyReply
  ) {
    try {
      const accountId = request.query.social_account_id;
      const supabase = request.supabase!;
      const { conversationId } = request.query;

      // Get user's Instagram accounts
      const socialAccount = await SocialAccount.findById(supabase, accountId);

      if (!socialAccount) {
        return reply.status(404).send({
          success: false,
          error: 'No active Instagram account found',
        });
      }

      // Use the first active account
      const accessToken = await socialAccount.getAccessToken();
      const igUserId = socialAccount.platformUserId;

      if (!igUserId) {
        return reply.status(400).send({
          success: false,
          error: 'Account missing platform_user_id',
        });
      }

      // Fetch messages for the specific conversation using service
      const messagesData = await InstagramService.getConversationMessages(
        conversationId,
        accessToken
      );

      // Format messages using service
      const messages = InstagramService.formatMessages(messagesData, igUserId);



      return reply.send({
        success: true,
        data: messages,
      });
    } catch (error) {
      logger.error({ err: error }, 'Error in getMessages controller');
      return reply.status(500).send({
        success: false,
        error: 'Failed to fetch messages',
      });
    }
  }

  /**
   * Send a message to an Instagram user
   */
  static async sendMessage(
    request: FastifyRequest<{ Body: SendMessageBody; Querystring: SendMessageQuery }>,
    reply: FastifyReply
  ) {
    try {
      const accountId = request.query.social_account_id;
      const supabase = request.supabase!;
      const { recipientId, message } = request.body;

      if (!recipientId || !message) {
        return reply.status(400).send({
          success: false,
          error: 'recipientId and message are required',
        });
      }

      // Get user's Instagram accounts
      const socialAccount = await SocialAccount.findById(supabase, accountId);

      if (!socialAccount) {
        return reply.status(404).send({
          success: false,
          error: 'No active Instagram account found',
        });
      }

      // Use the first active account
      const accessToken = await socialAccount.getAccessToken();
      const igUserId = socialAccount.platformUserId;

      if (!igUserId) {
        return reply.status(400).send({
          success: false,
          error: 'Account missing platform_user_id',
        });
      }

      // Send message using Instagram API
      const result = await InstagramService.sendTextMessage({
        igId: igUserId,
        recipientId,
        accessToken,
        text: message,
        message: { text: message },
      });

      logger.info({ recipientId, messageId: result.message_id }, 'Message sent successfully');

      return reply.send({
        success: true,
        messageId: result.message_id,
      });
    } catch (error) {
      logger.error({ err: error }, 'Error in sendMessage controller');
      return reply.status(500).send({
        success: false,
        error: 'Failed to send message',
      });
    }
  }
}
