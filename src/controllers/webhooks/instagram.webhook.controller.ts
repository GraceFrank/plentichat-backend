import { FastifyRequest, FastifyReply } from 'fastify';
import { Messaging, WebhookPayload } from '@/types/webhook';
import { getSupabaseServiceClient } from '@/config/supabase';
import { buildRagGraph } from '@/services/agent/ragFactory';
import { HumanMessage, BaseMessage } from '@langchain/core/messages';
import InstagramService from '@/services/instagram.service';
import { SocialAccount } from '@/models/SocialAccount';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import messageHandoffQueue from '@/queues/message-handoff/queue';
import type { InstagramMessage } from '@/types/instagram';
import { Message } from '@/models/Message.model';

export class InstagramWebhookController {
  /**
   * Check if the last message from our account was sent by AI or human
   * Returns 'AI' if message exists in DB with sender_type='AI', 'HUMAN' if not found in DB, or null if no message from us
   */
  private static async checkLastMessageSender(
    recentMessages: InstagramMessage[],
    ourAccountId: string
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
    const supabase = getSupabaseServiceClient();
    const aiMessage = await Message.find(supabase, {
      platform_message_id: lastMessageFromUs.id,
      sender_type: 'AI',
    });

    if (aiMessage) {
      logger.info(`Last message (${lastMessageFromUs.id}) was sent by AI`);
      return 'AI';
    } else {
      logger.info(`Last message (${lastMessageFromUs.id}) was sent by HUMAN (not found in DB with sender_type=AI)`);
      return 'HUMAN';
    }
  }

  /**
   * Handle incoming message event
   */
  private static async handleMessageEvent(messaging: Messaging): Promise<void> {
    const senderId = messaging.sender.id;
    const recipientId = messaging.recipient.id;
    const message = messaging.message;

    // if messages is from User
    if (message.is_echo) {
      logger.info("Ignore echo messaging")
      return
    }

    if (!message?.text) {
      logger.debug('Skipping non-text message');
      return;
    }

    const messageText = message.text;
    logger.info(`Processing message from ${senderId} to ${recipientId}: "${messageText}"`);

    // Use service client for webhooks - they don't have user auth
    const supabase = getSupabaseServiceClient();

    // Find social account using the model
    const socialAccount = await SocialAccount.findByPlatformUserId(
      supabase,
      recipientId,
      'instagram',
      true
    );


    if (!socialAccount) {
      logger.warn(`No social account found for Instagram account ${recipientId}`);
      return;
    }

    // Check if account is active and has an assistant
    if (!socialAccount.isActive || !socialAccount.assistantId) {
      logger.warn(`Social account ${recipientId} is inactive or has no assistant`);
      return;
    }

    // Fetch assistant details using the model
    const assistant = socialAccount.assistant
    if (!assistant) {
      logger.warn(`Assistant not found for account ${recipientId}`);
      return;
    }

    logger.info(`Using assistant: ${assistant.name} (${assistant.id})`);

    // Fetch recent conversation history for context
    const decryptedToken = await socialAccount.getAccessToken();

    let conversationHistory: BaseMessage[] = [];

    try {
      // Fetch conversation history (last 20 messages for comprehensive context)
      const recentMessages = await InstagramService.getConversationAndMessagesWithIgUserId(
        senderId,
        decryptedToken,
        20
      );

      // Check if last message from our account was sent by a human
      const lastSender = await this.checkLastMessageSender(recentMessages, recipientId);

      if (lastSender === 'HUMAN') {
        // Last message was from a human, add to queue for human handoff with delay
        const replyTimeoutSeconds = socialAccount.replyTimeoutSeconds
        const delayMs = replyTimeoutSeconds * 1000;

        logger.info(`Last message was from HUMAN. Adding to queue with ${replyTimeoutSeconds}s delay for handoff.`);
        await messageHandoffQueue.add(
          'human-handoff',
          {
            senderId,
            recipientId,
            messageText,
            socialAccountId: socialAccount.id,
            assistantId: assistant.id,
            timestamp: new Date().toISOString(),
          },
          {
            delay: delayMs,
          }
        );
        logger.info(`Message queued for human handoff (will process after ${replyTimeoutSeconds}s)`);
        return;
      }

      // Convert Instagram messages to LangChain format
      if (recentMessages.length > 0) {
        conversationHistory = InstagramService.convertInstagramMessagesToLangChainFormat(
          recentMessages,
          recipientId
        );
        logger.info(`Fetched ${conversationHistory.length} messages for context`);
      }
    } catch (error) {
      logger.warn({ err: error }, 'Failed to fetch conversation history, proceeding without context');
    }

    // Build and invoke AI agent with conversation history
    const graph = buildRagGraph(assistant, supabase);

    // Combine conversation history with the new message
    const allMessages = [...conversationHistory, new HumanMessage(messageText)];

    const result = await graph.invoke({
      messages: allMessages,
      assistant,
      userId: assistant.user_id,
    });

    const lastMessage = result.messages[result.messages.length - 1];
    const agentResponse =
      typeof lastMessage.content === 'string'
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);

    // Add AI disclosure to the message

    logger.info(`Agent response: "${agentResponse}"`);

    // Send response using the already decrypted token
    const sentMessageResponse = await InstagramService.sendTextMessage({
      igId: recipientId,
      recipientId: senderId,
      accessToken: decryptedToken,
      text: agentResponse,
      message: { text: agentResponse },
    });

    logger.info(`Successfully sent response to ${senderId}`);

    // Log the AI-sent message in the database
    if (sentMessageResponse?.message_id) {
      try {
        await Message.create(supabase, {
          platform_message_id: sentMessageResponse.message_id,
          sender_id: recipientId,
          recipient_id: senderId,
          text: agentResponse,
          sender_type: 'AI',
          platform: 'INSTAGRAM',
          conversation_id: null,
          social_account_id: socialAccount.id,
          attachments: null,
        });
        logger.info(`AI message logged in database: ${sentMessageResponse.message_id}`);
      } catch (error) {
        logger.error({ err: error, messageId: sentMessageResponse.message_id }, 'Failed to log AI message in database');
      }
    } else {
      logger.warn('No message_id returned from Instagram API, skipping database log');
    }
  }

  /**
  * Handle webhook verification (GET request)
  */
  static async verifyWebhook(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const query = request.query as {
      'hub.mode'?: string;
      'hub.verify_token'?: string;
      'hub.challenge'?: string;
    };

    logger.info(
      {
        mode: query['hub.mode'],
        hasToken: !!query['hub.verify_token'],
        hasChallenge: !!query['hub.challenge'],
      },
      'Received webhook verification request'
    );

    if (
      query['hub.mode'] === 'subscribe' &&
      query['hub.verify_token'] === env.META_VERIFY_TOKEN
    ) {
      logger.info('Webhook verification successful');
      return reply.status(200).type('text/plain').send(query['hub.challenge']);
    }

    logger.warn('Webhook verification failed');
    return reply.status(403).send('Forbidden');
  }

  /**
   * Route messaging event to appropriate handler
   */
  private static async routeMessagingEvent(messaging: Messaging): Promise<void> {
    // Check which event type is present in the messaging object
    if (messaging.message) {
      await this.handleMessageEvent(messaging);
    } else {
      // Fallback for unsupported event types
      logger.debug({ messaging }, 'Unsupported webhook event type received');
    }
  }



  /**
   * Handle webhook events (POST request)
   * Routes events to appropriate handlers based on event type
   * Note: Signature verification is handled by middleware
   */
  static async handleWebhookEvent(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const rawBody = request.rawBody as Buffer;
    const payload: WebhookPayload = JSON.parse(rawBody.toString());

    logger.info({ entryCount: payload.entry.length }, 'Webhook payload received');

    logger.info(payload)

    // Process in background, return 200 immediately
    setImmediate(async () => {
      for (const entry of payload.entry) {
        for (const messaging of entry.messaging) {
          try {
            await InstagramWebhookController.routeMessagingEvent(messaging);
          } catch (error) {
            logger.error({ err: error, messaging }, 'Error routing webhook event');
          }
        }
      }
    });

    return reply.status(200).send('OK');
  }
}
