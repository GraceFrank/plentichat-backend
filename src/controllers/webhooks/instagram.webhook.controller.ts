import { FastifyRequest, FastifyReply } from 'fastify';
import { Messaging, WebhookPayload } from '@/types/webhook';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { buildRagGraph } from '@/services/agent/ragFactory';
import { HumanMessage } from '@langchain/core/messages';
import InstagramService from '@/services/instagram.service';
import { SocialAccount } from '@/models/SocialAccount';
import { decryptToken } from '@/services/googleKms.service';
import { env } from '@/config/env';
import { logger } from '@/config/logger';

export class InstagramWebhookController {
  /**
   * Process incoming Instagram message
   */
  private static async processMessage(messaging: Messaging): Promise<void> {
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
      'instagram'
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

    // Fetch assistant details
    const { data: assistant, error: assistantError } = await supabase
      .from('assistants')
      .select('*')
      .eq('id', socialAccount.assistantId)
      .single();

    if (assistantError || !assistant) {
      logger.warn(`Assistant not found for account ${recipientId}`);
      return;
    }

    logger.info(`Using assistant: ${assistant.name} (${assistant.id})`);

    // Build and invoke AI agent
    const graph = buildRagGraph(assistant, supabase);

    const result = await graph.invoke({
      messages: [new HumanMessage(messageText)],
      assistant: assistant,
      userId: assistant.user_id,
    });

    const lastMessage = result.messages[result.messages.length - 1];
    const agentResponse =
      typeof lastMessage.content === 'string'
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);

    // Add AI disclosure to the message
    const messageWithDisclosure = `${agentResponse}\n\n*Sent by AI`;

    logger.info(`Agent response: "${agentResponse}"`);

    // Decrypt token and send response
    const decryptedToken = await decryptToken(socialAccount.accessToken as string);

    await InstagramService.sendTextMessage({
      igId: recipientId,
      recipientId: senderId,
      accessToken: decryptedToken,
      text: messageWithDisclosure,
      message: { text: messageWithDisclosure },
    });

    logger.info(`Successfully sent response to ${senderId}`);
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
            await this.processMessage(messaging);
          } catch (error) {
            logger.error({ err: error, messaging }, 'Error processing message');
          }
        }
      }
    });

    return reply.status(200).send('OK');
  }
}
