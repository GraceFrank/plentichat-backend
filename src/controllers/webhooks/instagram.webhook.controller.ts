import { FastifyRequest, FastifyReply } from 'fastify';
import { Messaging, WebhookPayload } from '@/types/webhook';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { buildRagGraph } from '@/services/agent/ragFactory';
import { HumanMessage, BaseMessage } from '@langchain/core/messages';
import InstagramService from '@/services/instagram.service';
import { SocialAccount } from '@/models/SocialAccount';
import { env } from '@/config/env';
import { logger } from '@/config/logger';

export class InstagramWebhookController {
  /**
   * Handle incoming message event
   */
  private static async handleMessageEvent(messaging: Messaging): Promise<void> {
    const senderId = messaging.sender.id;
    const recipientId = messaging.recipient.id;
    const message = messaging.message;


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
    console.log("ASSISTANT", assistant, "Assistant")

    if (!assistant) {
      logger.warn(`Assistant not found for account ${recipientId}`);
      return;
    }

    logger.info(`Using assistant: ${assistant.name} (${assistant.id})`);

    // Fetch recent conversation history for context
    const decryptedToken = await socialAccount.getAccessToken();

    let conversationHistory: BaseMessage[] = [];

    try {
      // Fetch conversation history (last 100 messages for comprehensive context)
      const recentMessages = await InstagramService.getConversationAndMessagesWithIgUserId(
        senderId,
        decryptedToken,
      );

      // console.log("Messages", JSON.stringify(recentMessages))


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
    await InstagramService.sendTextMessage({
      igId: recipientId,
      recipientId: senderId,
      accessToken: decryptedToken,
      text: agentResponse,
      message: { text: agentResponse },
    });

    logger.info(`Successfully sent response to ${senderId}`);
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
