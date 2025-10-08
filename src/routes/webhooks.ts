import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { Messaging, WebhookPayload } from '@/types/webhook';
import { getSupabaseServiceClient } from '@/lib/supabase';
import { buildRagGraph } from '@/services/agent/ragFactory';
import { HumanMessage } from '@langchain/core/messages';
import { InstagramMessagingService } from '@/services/instagram';
import { decryptToken } from '@/lib/crypto';
import { env } from '@/config/env';
import { logger } from '@/config/logger';

function verifyWebhookSignature(
  rawBody: Buffer,
  signature: string,
  appSecret: string
): boolean {
  if (!signature) return false;

  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature.replace('sha256=', '')),
    Buffer.from(expectedSignature)
  );
}

async function processMessage(messaging: Messaging) {
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

  const { data: socialAccount, error: accountError } = await supabase
    .from('social_accounts')
    .select(`
      *,
      assistants (*)
    `)
    .eq('platform_user_id', recipientId)
    .eq('platform', 'instagram')
    .eq('is_active', true)
    .not('assistant_id', 'is', null)
    .single();

  if (accountError || !socialAccount) {
    logger.warn(`No social account found for Instagram account ${recipientId}`);
    return;
  }

  const assistant = socialAccount.assistants;
  if (!assistant) {
    logger.warn(`Assistant not found or inactive for account ${recipientId}`);
    return;
  }

  logger.info(`Using assistant: ${assistant.name} (${assistant.id})`);

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

  logger.info(`Agent response: "${agentResponse}"`);

  const decryptedToken = await decryptToken(socialAccount.access_token as string);

  await InstagramMessagingService.sendTextMessage({
    igId: recipientId,
    recipientId: senderId,
    accessToken: decryptedToken,
    text: agentResponse,
    message: { text: agentResponse },
  });

  logger.info(`Successfully sent response to ${senderId}`);
}

export async function webhookRoutes(fastify: FastifyInstance) {
  // GET - Webhook verification
  fastify.get('/webhooks/instagram', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as { 'hub.mode'?: string; 'hub.verify_token'?: string; 'hub.challenge'?: string };

    logger.info({
      mode: query['hub.mode'],
      hasToken: !!query['hub.verify_token'],
      hasChallenge: !!query['hub.challenge'],
    }, 'Received webhook verification request');

    if (query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === env.META_VERIFY_TOKEN) {
      logger.info('Webhook verification successful');
      return reply.status(200).type('text/plain').send(query['hub.challenge']);
    }

    logger.warn('Webhook verification failed');
    return reply.status(403).send('Forbidden');
  });

  // POST - Webhook events
  fastify.post('/webhooks/instagram', async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers['x-hub-signature-256'] as string;

    if (!signature) {
      logger.warn('Missing webhook signature');
      return reply.status(401).send({ error: 'Missing signature' });
    }

    const rawBody = request.rawBody as Buffer;

    const isValid = verifyWebhookSignature(rawBody, signature, env.INSTAGRAM_APP_SECRET);

    if (!isValid) {
      logger.warn('Invalid webhook signature');
      return reply.status(401).send({ error: 'Invalid signature' });
    }

    const payload: WebhookPayload = JSON.parse(rawBody.toString());
    logger.info({ entryCount: payload.entry.length }, 'Webhook payload received');

    // Process in background, return 200 immediately
    setImmediate(async () => {
      for (const entry of payload.entry) {
        for (const messaging of entry.messaging) {
          try {
            await processMessage(messaging);
          } catch (error) {
            logger.error({ err: error, messaging }, 'Error processing message');
          }
        }
      }
    });

    return reply.status(200).send('OK');
  });
}
