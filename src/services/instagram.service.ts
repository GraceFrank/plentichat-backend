import axios from 'axios';
import { env } from '@/config/env';
import { HumanMessage, AIMessage, BaseMessage } from 'langchain';
import type {
  ConversationMessage,
  IgUserProfile,
  Conversation,
  InstagramMessage,
  InstagramConversation,
  IgConversationParticipant,
  Message,
  SendMessageParams,
  ConversationsResponse,
  SendMessageResponse,
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
  }: SendMessageParams & { text: string }): Promise<SendMessageResponse> {
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
            fields: `messages.limit(${limit}){id,from,to,message,created_time,attachments}`,
          },
        }
      );


      return messagesResponse.data.messages?.data || [];
    } catch (error) {
      this.handleError(error, 'Get Conversation Messages');
    }
  }



  /**
   * Get recent messages from a conversation with a specific user
   * Uses a two-step approach: first get the conversation, then fetch messages with attachments
   *
   * @param limit - Number of messages to fetch (default: 25, Instagram API default)
   * @returns Conversation ID, messages, and sender username if available
   */
  static async getConversationAndMessagesWithIgUserId(
    participantId: string,
    accessToken: string,
    limit = 100
  ): Promise<{ conversationId: string; messages: InstagramMessage[]; senderUsername?: string }> {
    try {
      // Step 1: Get the conversation ID for the specific participant
      const conversationsResponse = await axios.get<ConversationsResponse>(
        `${this.baseUrl}/me/conversations`,
        {
          params: {
            user_id: participantId,
            platform: 'instagram',
            access_token: accessToken,
            fields: "username"
          },
        }
      );

      const conversation = conversationsResponse?.data?.data?.[0];
      if (!conversation) {
        console.log('No conversation found for participant:', participantId);
        return { conversationId: '', messages: [] };
      }

      console.log('Found conversation:', conversation.id);

      // Step 2: Fetch messages with attachments using the conversation ID
      const messagesResponse = await axios.get(
        `${this.baseUrl}/${conversation.id}/messages`,
        {
          params: {
            fields: 'id,from,to,message,attachments,created_time',
            limit: limit,
            access_token: accessToken,
          },
        }
      );

      const messages = (messagesResponse?.data?.data || []).sort(
        (a: InstagramMessage, b: InstagramMessage) => new Date(a.created_time).getTime() - new Date(b.created_time).getTime()
      );

      // Get sender username from the participant
      const senderUsername = conversation.participants?.data?.find(
        (p: IgConversationParticipant) => p.id === participantId
      )?.username;

      return {
        conversationId: conversation.id,
        messages,
        ...(senderUsername ? { senderUsername } : {}),
      };
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
      .map((msg) => {
        // 'to' is an array of participants, get the first one
        const toParticipant = msg.to.data[0];

        return {
          id: msg.id,
          from: {
            id: msg.from.id,
            username: msg.from.username || 'Unknown',
          },
          to: {
            id: toParticipant?.id || 'Unknown',
            username: toParticipant?.username || 'Unknown',
          },
          message: msg.message,
          created_time: msg.created_time,
          is_from_me: msg.from.id === igUserId,
          ...(msg.attachments?.data && { attachments: msg.attachments.data }),
        };
      })
      .sort((a, b) => new Date(a.created_time).getTime() - new Date(b.created_time).getTime());
  }
}
