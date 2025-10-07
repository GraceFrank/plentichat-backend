import { FastifyRequest, FastifyReply } from 'fastify';
import { getSupabaseClient } from '@/lib/supabase';
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
  userId: string;
}

interface SendMessageBody {
  recipientId: string;
  message: string;
  userId: string;
}

interface GetMessagesQuery {
  userId: string;
  conversationId: string;
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
      const { userId } = request.query;

      if (!userId) {
        return reply.status(400).send({
          success: false,
          error: 'userId is required',
        });
      }

      const supabase = getSupabaseClient();

      // Get user's Instagram accounts using the model
      const socialAccounts = await SocialAccount.findByUserId(supabase, userId, 'instagram');

      if (socialAccounts.length === 0) {
        return reply.send({
          success: true,
          data: [],
        });
      }

      const allConversations: Conversation[] = [];

      // Fetch conversations for each account
      for (const account of socialAccounts) {
        try {
          const accessToken = await account.getAccessToken();
          const igUserId = account.platformUserId;

          if (!igUserId) {
            logger.warn({ accountId: account.id }, 'Account missing platform_user_id');
            continue;
          }

          // Fetch conversations from Instagram API (without messages)
          const conversationsResponse = await axios.get(
            `https://graph.instagram.com/v23.0/${igUserId}/conversations`,
            {
              params: {
                access_token: accessToken,
                fields: 'id,participants,updated_time',
              },
            }
          );

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
          logger.error({ err, accountId: account.id }, 'Error fetching conversations for account');
        }
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
      const { userId, conversationId } = request.query;

      if (!userId || !conversationId) {
        return reply.status(400).send({
          success: false,
          error: 'userId and conversationId are required',
        });
      }

      const supabase = getSupabaseClient();

      // Get user's Instagram accounts
      const socialAccounts = await SocialAccount.findByUserId(supabase, userId, 'instagram');

      if (socialAccounts.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'No active Instagram account found',
        });
      }

      // Use the first active account
      const account = socialAccounts[0];
      const accessToken = await account.getAccessToken();
      const igUserId = account.platformUserId;

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
    request: FastifyRequest<{ Body: SendMessageBody }>,
    reply: FastifyReply
  ) {
    try {
      const { recipientId, message, userId } = request.body;

      if (!recipientId || !message || !userId) {
        return reply.status(400).send({
          success: false,
          error: 'recipientId, message, and userId are required',
        });
      }

      const supabase = getSupabaseClient();

      // Get user's Instagram accounts
      const socialAccounts = await SocialAccount.findByUserId(supabase, userId, 'instagram');

      if (socialAccounts.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'No active Instagram account found',
        });
      }

      // Use the first active account
      const account = socialAccounts[0];
      const accessToken = await account.getAccessToken();
      const igUserId = account.platformUserId;

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
