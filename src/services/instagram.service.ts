import axios from 'axios';
import { env } from '@/config/env';
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import type {
  ConversationMessage,
  IgUserProfile,
  Conversation,
  InstagramMessage,
  InstagramConversation,
  Message,
  SendMessageParams,
  ConversationsResponse,
} from '@/types/instagram';

export default class InstagramService {
  private static readonly baseUrl = env.INSTAGRAM_API_BASE_URL;

  private static handleError(error: unknown, context: string): never {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      const statusCode = error.response?.status;
      throw new Error(
        `Instagram API Error [${context}]${statusCode ? ` (${statusCode})` : ''}: ${errorMessage}`
      );
    }
    throw error;
  }

  private static async sendMessage({
    igId,
    recipientId,
    accessToken,
    message,
  }: SendMessageParams) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/${igId}/messages`,
        {
          recipient: { id: recipientId },
          message,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error) {
      this.handleError(error, 'Send Message');
    }
  }

  static async sendTextMessage({
    igId,
    recipientId,
    accessToken,
    text,
  }: SendMessageParams & { text: string }) {
    const message: Message = { text };
    return this.sendMessage({ igId, recipientId, accessToken, message });
  }

  static async getConversations(accessToken: string): Promise<ConversationsResponse> {
    try {
      // Fetch conversations from Instagram API (without messages)
      const conversationsResponse = await axios.get<ConversationsResponse>(
        `${this.baseUrl}/me/conversations`,
        {
          params: {
            platform: 'instagram',
            access_token: accessToken,
            fields: 'id,participants,updated_time',
          },
        }
      );

      return conversationsResponse.data;
    } catch (error) {
      this.handleError(error, 'Get Conversations');
    }
  }

  static async getIgUserProfile(
    userId: string,
    accessToken: string
  ): Promise<IgUserProfile> {
    try {
      const userResponse = await axios.get(
        `${this.baseUrl}/${userId}`,
        {
          params: {
            access_token: accessToken,
            fields: 'id,username,name,profile_pic',
          },
        }
      );

      return {
        id: userResponse.data.id,
        username: userResponse.data.username,
        name: userResponse.data.name,
        profile_picture_url: userResponse.data.profile_pic,
      };
    } catch (error) {
      // Return minimal data if API call fails
      return {
        id: userId,
        username: 'Unknown',
      };
    }
  }

  static async getConversationMessages(
    conversationId: string,
    accessToken: string,
    limit: number = 10
  ): Promise<InstagramMessage[]> {
    try {
      const messagesResponse = await axios.get(
        `${this.baseUrl}/${conversationId}`,
        {
          params: {
            access_token: accessToken,
            fields: `messages.limit(${limit}){id,from,to,message,created_time}`,
          },
        }
      );

      return messagesResponse.data.messages?.data || [];
    } catch (error) {
      this.handleError(error, 'Get Conversation Messages');
    }
  }

  /**
   * Find conversation between the Instagram account and a specific user
   */
  static async findConversationWithUser(
    igId: string,
    userId: string,
    accessToken: string
  ): Promise<string | null> {
    try {
      const conversationsResponse = await axios.get<ConversationsResponse>(
        `${this.baseUrl}/${igId}/conversations`,
        {
          params: {
            platform: 'instagram',
            access_token: accessToken,
            fields: 'id,participants',
          },
        }
      );

      // Find conversation that includes the specific user
      const conversation = conversationsResponse.data.data.find((conv) =>
        conv.participants?.data.some((p) => p.id === userId)
      );

      return conversation?.id || null;
    } catch (error) {
      this.handleError(error, 'Find Conversation');
    }
  }

  /**
   * Get recent messages from a conversation with a specific user
   */
  static async getRecentMessagesWithUser(
    igId: string,
    userId: string,
    accessToken: string,
    limit: number = 10
  ): Promise<InstagramMessage[]> {
    try {
      const conversationId = await this.findConversationWithUser(igId, userId, accessToken);

      if (!conversationId) {
        return [];
      }

      return await this.getConversationMessages(conversationId, accessToken, limit);
    } catch (error) {
      this.handleError(error, 'Get Recent Messages');
    }
  }

  /**
   * Convert Instagram messages to LangChain BaseMessage format for AI context
   * Maps Instagram messages to HumanMessage (from user) or AIMessage (from bot)
   */
  static convertInstagramMessagesToLangChainFormat(
    messages: InstagramMessage[],
    igAccountId: string
  ): BaseMessage[] {
    return messages.map((msg) => {
      const isFromBot = msg.from.id === igAccountId;
      const content = msg.message || '';

      if (isFromBot) {
        return new AIMessage(content);
      } else {
        return new HumanMessage(content);
      }
    });
  }

  static formatConversation(
    conversation: InstagramConversation,
    participantDetails: IgUserProfile
  ): Conversation {
    return {
      id: conversation.id,
      participant: participantDetails,
      messages: [],
      updated_time: conversation.updated_time,
      unread_count: 0,
    };
  }

  static formatMessages(
    messages: InstagramMessage[],
    igUserId: string
  ): ConversationMessage[] {
    return messages
      .map((msg) => ({
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
      }))
      .sort((a, b) => new Date(a.created_time).getTime() - new Date(b.created_time).getTime());
  }
}
