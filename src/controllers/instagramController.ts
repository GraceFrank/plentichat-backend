import { FastifyRequest, FastifyReply } from 'fastify';
import { InstagramMessagingService } from '@/services/instagram';
import { SocialAccount } from '@/models/SocialAccount';
import { logger } from '@/config/logger';
import axios from 'axios';

interface ConversationMessage {
  id: string;
  from: {
    id: string;
    username: string;
  };
  to: {
    id: string;
    username: string;
  };
  message: string;
  created_time: string;
  is_from_me: boolean;
}

interface Conversation {
  id: string;
  participant: {
    id: string;
    username: string;
    name?: string;
    profile_picture_url?: string;
  };
  messages: ConversationMessage[];
  updated_time: string;
  unread_count?: number;
}

interface GetConversationsQuery {
  social_account_id?: string;
}

interface SendMessageBody {
  recipientId: string;
  message: string;
}

interface GetMessagesQuery {
  conversationId: string;
  social_account_id?: string;
}

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

      if (!accountId) {
        return reply.send({
          success: true,
          data: [],
        });
      }


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

        console.log(socialAccount)

        if (!igUserId) {
          logger.warn({ accountId: socialAccount.id }, 'Account missing platform_user_id');
          return reply.send({ success: true, data: [] });
        }

        // Fetch conversations from Instagram API (without messages)
        const conversationsResponse = await axios.get(
          `https://graph.instagram.com/v23.0/me/conversations`,
          {
            params: {
              platform: "instagram",
              access_token: accessToken,
              fields: 'id,participants,updated_time',
            },
          }
        );

        console.log("\n\n\n\n\n\nCONVERSATION response:\n", JSON.stringify(conversationsResponse.data, null, 2));
        console.log("\nInstagram API status:", conversationsResponse.status + "\n\n\n\n\n");


        const conversations = conversationsResponse.data.data || [];

        // Transform conversations
        for (const conv of conversations) {
          // Get participant info (the other person in the conversation)
          const participant = conv.participants?.data?.find(
            (p: { id: string }) => p.id !== igUserId
          );

          console.log('participant', JSON.stringify(participant, null, 2));

          if (!participant) continue;

          // Fetch participant details
          let participantDetails = {
            id: participant.id,
            username: participant.username || 'Unknown',
            name: undefined,
            profile_picture_url: undefined,
          };

          try {
            const userResponse = await axios.get(
              `https://graph.instagram.com/v23.0/${participant.id}`,
              {
                params: {
                  access_token: accessToken,
                  fields: 'id,username,name,profile_pic',
                },
              }
            );
            participantDetails = {
              ...participantDetails,
              username: userResponse.data.username || participantDetails.username,
              name: userResponse.data.name,
              profile_picture_url: userResponse.data.profile_pic,
            };
          } catch (err: any) {
            logger.warn({
              err: err.response?.data || err.message,
              participantId: participant.id
            }, 'Failed to fetch participant details');
          }

          allConversations.push({
            id: conv.id,
            participant: participantDetails,
            messages: [], // Messages will be fetched separately
            updated_time: conv.updated_time,
            unread_count: 0,
          });
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
      if (!accountId) return []
      const supabase = request.supabase!;
      const { conversationId } = request.query;

      if (!conversationId) {
        return reply.status(400).send({
          success: false,
          error: 'conversationId is required',
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

      // Fetch messages for the specific conversation
      const messagesResponse = await axios.get(
        `https://graph.instagram.com/v23.0/${conversationId}`,
        {
          params: {
            access_token: accessToken,
            fields: 'messages{id,from,to,message,created_time}',
          },
        }
      );

      const messages: ConversationMessage[] = (messagesResponse.data.messages?.data || []).map(
        (msg: {
          id: string;
          from: { id: string; username?: string };
          to: { id: string; username?: string };
          message: string;
          created_time: string;
        }) => ({
          id: msg.id,
          from: {
            id: msg.from.id,
            username: msg.from.username || 'Unknown',
          },
          to: {
            id: msg.to.id,
            username: msg.to.username || 'Unknown',
          },
          message: msg.message,
          created_time: msg.created_time,
          is_from_me: msg.from.id === igUserId,
        })
      );

      // Sort messages by created_time ascending (oldest first)
      messages.sort((a, b) => new Date(a.created_time).getTime() - new Date(b.created_time).getTime());

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
    request: FastifyRequest<{ Body: SendMessageBody; Querystring: { social_account_id?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const accountId = request.query.social_account_id;
      if (!accountId) return []
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
      const result = await InstagramMessagingService.sendTextMessage({
        igId: igUserId,
        recipientId,
        accessToken,
        text: message,
        message: { text: message },
      });

      logger.info({ recipientId, messageId: result.message_id }, 'Message sent successfully');

      return reply.send({
        success: true,
        messageId: result.message_id || result.id,
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
