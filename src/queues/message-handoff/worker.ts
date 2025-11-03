import { Worker, Job } from 'bullmq';
import redisConnection from '@/config/redis';
import { getSupabaseServiceClient } from '@/config/supabase';
import { SocialAccount } from '@/models/SocialAccount';
import InstagramService from '@/services/instagram.service';
import { MessageHandlerService } from '@/services/instagram-webhook.service';
import { logger } from '@/config/logger';
import type { InstagramMessage } from '@/types/instagram';
import { Messaging } from '@/types/webhook';
import { env } from '@/config/env';

interface HandoffJobData {
  messaging: Messaging;
  conversationId: string;
  senderUsername?: string;
}

/**
 * Process message handoff job
 * This worker runs after the reply timeout period has elapsed
 */
async function processHandoffJob(job: Job<HandoffJobData>) {
  const { messaging } = job.data;


  const senderId = messaging.sender.id;
  const recipientId = messaging.recipient.id;
  const message = messaging.message;

  logger.info(
    messaging,
    'Processing message handoff job'
  );

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


    logger.info({ messageCount: recentMessages.length }, 'Fetched recent messages from Instagram');

    // Step 2: Find the index of the original queued message
    const queuedMessageIndex = recentMessages.findIndex(
      (msg: InstagramMessage) => msg.message === messageText && msg.from.id === senderId
    );

    // If message not found in conversation, user probably sent too many messages - do nothing
    if (queuedMessageIndex === -1) {
      if (env.IS_DEVELOPMENT) {
        await MessageHandlerService.generateAndSendAIResponse({
          messageText,
          senderId,
          recipientId,
          accessToken: decryptedToken,
          assistant,
          socialAccount: socialAccount.toJSON(),
          conversationId: job.data.conversationId,
          ...(job.data.senderUsername ? { senderUsername: job.data.senderUsername } : {}),
          recentMessages,
        });
      } else
        logger.info(
          { messageText, senderId },
          'Queued message not found in recent conversation, skipping (user likely sent multiple messages)'
        );
      return;
    }

    logger.info({ queuedMessageIndex }, 'Found queued message in conversation');

    // Step 3: Check if our account has replied or sent any message after the queued message
    // Messages are ordered newest first, so check messages with index < queuedMessageIndex
    const messagesAfterQueued = recentMessages.slice(0, queuedMessageIndex);
    const accountRepliedAfter = messagesAfterQueued.some(
      (msg: InstagramMessage) => msg.from.id === recipientId
    );

    if (accountRepliedAfter) {
      logger.info(
        { queuedMessageIndex },
        'Human already replied after queued message, skipping AI response'
      );
      return;
    }

    logger.info('No human reply detected, generating AI response');

    // Step 4: Generate AI reply since human hasn't responded
    try {
      await MessageHandlerService.generateAndSendAIResponse({
        messageText,
        senderId,
        recipientId,
        accessToken: decryptedToken,
        assistant,
        socialAccount: socialAccount.toJSON(),
        conversationId: job.data.conversationId,
        ...(job.data.senderUsername ? { senderUsername: job.data.senderUsername } : {}),
        recentMessages,
      });

      logger.info({ jobId: job.id }, 'Message handoff job completed successfully');
    } catch (error) {
      logger.error({ err: error, jobId: job.id }, 'Failed to generate AI response in worker');
      throw error;
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch conversation or process message');
    throw error;
  }
}

// Create the worker
const messageHandoffWorker = new Worker<HandoffJobData>(
  'message-handoff',
  async (job) => {
    try {
      await processHandoffJob(job);
    } catch (error) {
      logger.error(
        { err: error, jobId: job.id, jobData: job.data },
        'Error processing message handoff job'
      );
      throw error; // Re-throw to allow BullMQ to handle retries
    }
  },
  {
    connection: redisConnection,
    concurrency: 5, // Process up to 5 jobs concurrently
  }
);

// Worker event handlers
messageHandoffWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Message handoff job completed');
});

messageHandoffWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, 'Message handoff job failed');
});

messageHandoffWorker.on('error', (err) => {
  logger.error({ error: err.message }, 'Message handoff worker error');
});

logger.info('Message handoff worker started');

export default messageHandoffWorker;
