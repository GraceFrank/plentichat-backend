import { FastifyRequest, FastifyReply } from 'fastify';
import { Messaging, WebhookPayload } from '@/types/webhook';
import { getSupabaseServiceClient } from '@/config/supabase';
import InstagramService from '@/services/instagram.service';
import { MessageHandlerService } from '@/services/instagram-webhook.service';
import { SocialAccount } from '@/models/SocialAccount';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import messageHandoffQueue from '@/queues/message-handoff/queue';

export class InstagramWebhookController {

  /**
   * Handle incoming message event
   */
  private static async handleMessageEvent(messaging: Messaging): Promise<void> {
    const senderId = messaging.sender.id;
    const recipientId = messaging.recipient.id;
    const message = messaging.message;

    console.log('\n\n\n\Messaging:', senderId, "\n\n\n\n");

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

    try {
      // Fetch conversation history (last 20 messages for comprehensive context)
      const recentMessages = await InstagramService.getConversationAndMessagesWithIgUserId(
        senderId,
        decryptedToken,
        20
      );

      // Check if last message from our account was sent by a human
      const lastSender = await MessageHandlerService.checkLastMessageSender(
        recentMessages,
        recipientId,
        supabase
      );

      if (lastSender === 'HUMAN') {
        // Last message was from a human, add to queue for human handoff with delay
        const replyTimeoutSeconds = socialAccount.replyTimeoutSeconds;
        const delayMs = replyTimeoutSeconds * 1000;

        logger.info(`Last message was from HUMAN. Adding to queue with ${replyTimeoutSeconds}s delay for handoff.`);
        await messageHandoffQueue.add(
          'human-handoff',
          {
            messaging,
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

      // Generate and send AI response using the service
      await MessageHandlerService.generateAndSendAIResponse({
        messageText,
        senderId,
        recipientId,
        accessToken: decryptedToken,
        assistant,
        socialAccountId: socialAccount.id,
        recentMessages,
      });
    } catch (error) {
      logger.error({ err: error, senderId, messageText }, 'Failed to handle message event');
      throw error;
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
