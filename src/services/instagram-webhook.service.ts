import { SupabaseClient } from '@supabase/supabase-js';
import { HumanMessage, BaseMessage } from 'langchain';
import { buildRagAgent, AgentContext } from '@/services/agent-factory';
import InstagramService from '@/services/instagram.service';
import { Message } from '@/models/Message.model';
import { logger } from '@/config/logger';
import type { Assistant } from '@/types/assistant';
import type { InstagramMessage } from '@/types/instagram';
import type { SocialAccountData } from '@/types/SocialAccount';
import { getSupabaseServiceClient } from '@/config/supabase';

export interface GenerateAIResponseParams {
  messageText: string;
  senderId: string;
  recipientId: string;
  accessToken: string;
  assistant: Assistant; // Must include escalationChannel property
  socialAccount: SocialAccountData;
  conversationId: string;
  senderUsername?: string;
  recentMessages?: InstagramMessage[];
}

export interface AIResponseResult {
  response: string;
  messageId: string | null;
  success: boolean;
}

export class MessageHandlerService {
  /**
   * Generate and send AI response to a customer message
   * Returns the AI response and message ID if successful
   */
  static async generateAndSendAIResponse(
    params: GenerateAIResponseParams
  ): Promise<AIResponseResult> {
    const {
      messageText,
      senderId,
      recipientId,
      accessToken,
      assistant,
      socialAccount,
      conversationId,
      senderUsername,
      recentMessages = [],
    } = params;

    try {
      // Convert Instagram messages to LangChain format for context
      let conversationHistory: BaseMessage[] = [];
      if (recentMessages.length > 0) {
        conversationHistory = InstagramService.convertInstagramMessagesToLangChainFormat(
          recentMessages,
          recipientId
        );
        logger.info({ historyLength: conversationHistory.length }, 'Converted conversation history');
      }

      const supabase = getSupabaseServiceClient();

      // Get escalation channel - either from assistant or user's email
      let escalationChannel = assistant.escalationChannel;

      if (!escalationChannel) {
        // Fallback: Use user's email as escalation channel
        const { data: user } = await supabase.auth.admin.getUserById(assistant.user_id);

        if (user?.user?.email) {
          escalationChannel = {
            id: 'fallback',
            channel: 'email',
            destination: user.user.email,
            user_id: assistant.user_id,
            name: 'User Email (Fallback)',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          logger.info({ userId: assistant.user_id, email: user.user.email }, 'Using user email as fallback escalation channel');
        } else {
          logger.warn({ userId: assistant.user_id }, 'No escalation channel configured and user email not found');
        }
      }

      // Build agent context
      const agentContext: AgentContext = {
        assistant,
        supabase,
        escalationChannel: escalationChannel!,
        socialAccount,
        conversationId,
        ...(senderUsername ? { senderUsername } : {}),
      };

      // Build and invoke AI agent with conversation history and context
      const agent = buildRagAgent(assistant);

      // Combine conversation history with the new message
      const allMessages = [...conversationHistory, new HumanMessage(messageText)];

      const result = await agent.invoke(
        {
          messages: allMessages,
        },
        {
          context: agentContext,
        }
      );

      const lastMessage = result.messages[result.messages.length - 1];
      const agentResponse =
        typeof lastMessage.content === 'string'
          ? lastMessage.content
          : JSON.stringify(lastMessage.content);

      logger.info({ agentResponse }, 'Generated AI response');

      // Send response via Instagram
      const sentMessageResponse = await InstagramService.sendTextMessage({
        igId: recipientId,
        recipientId: senderId,
        accessToken,
        text: agentResponse,
        message: { text: agentResponse },
      });

      logger.info({ senderId }, 'Successfully sent AI response');

      // Log the AI-sent message in the database
      let messageId: string | null = null;
      if (sentMessageResponse?.message_id) {
        messageId = sentMessageResponse.message_id;
        await this.logAIMessage({
          messageId,
          senderId: recipientId,
          recipientId: senderId,
          text: agentResponse,
          socialAccountId: socialAccount.id,
          supabase: getSupabaseServiceClient(),
        });
      } else {
        logger.warn('No message_id returned from Instagram API, skipping database log');
      }

      return {
        response: agentResponse,
        messageId,
        success: true,
      };
    } catch (error) {
      logger.error({ err: error, senderId, messageText }, 'Failed to generate and send AI response');
      throw error;
    }
  }

  /**
   * Log AI-sent message to database
   */
  static async logAIMessage(params: {
    messageId: string;
    senderId: string;
    recipientId: string;
    text: string;
    socialAccountId: string;
    supabase: SupabaseClient;
  }): Promise<void> {
    const { messageId, senderId, recipientId, text, socialAccountId, supabase } = params;

    try {
      await Message.create(supabase, {
        platform_message_id: messageId,
        sender_id: senderId,
        recipient_id: recipientId,
        text,
        sender_type: 'AI',
        platform: 'INSTAGRAM',
        conversation_id: null,
        social_account_id: socialAccountId,
        attachments: null,
      });
      logger.info({ messageId }, 'AI message logged in database');
    } catch (error) {
      logger.error({ err: error, messageId }, 'Failed to log AI message in database');
      throw error;
    }
  }

  /**
   * Check if last message from our account was sent by AI or human
   * Returns 'AI' if message exists in DB with sender_type='AI', 'HUMAN' if not found in DB, or null if no message from us
   */
  static async checkLastMessageSender(
    recentMessages: InstagramMessage[],
    ourAccountId: string,
    supabase: SupabaseClient
  ): Promise<'AI' | 'HUMAN' | null> {
    // Sort messages by created_time descending (newest first) and find the most recent from our account
    const messagesFromUs = recentMessages
      .filter((msg) => msg.from.id === ourAccountId)
      .sort((a, b) => new Date(b.created_time).getTime() - new Date(a.created_time).getTime());

    const lastMessageFromUs = messagesFromUs[0];

    if (!lastMessageFromUs) {
      logger.debug('No previous message from our account found');
      return null;
    }

    // Check if this message exists in our database with sender_type='AI'
    const aiMessage = await Message.find(supabase, {
      platform_message_id: lastMessageFromUs.id,
      sender_type: 'AI',
    });

    if (aiMessage) {
      logger.info({ messageId: lastMessageFromUs.id }, 'Last message was sent by AI');
      return 'AI';
    } else {
      logger.info({ messageId: lastMessageFromUs.id }, 'Last message was sent by HUMAN');
      return 'HUMAN';
    }
  }
}
