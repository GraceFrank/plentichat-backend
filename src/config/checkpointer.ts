import { RedisSaver } from '@langchain/langgraph-checkpoint-redis';
import { logger } from './logger';
import { env } from './env';

let redisSaver: RedisSaver | null = null;

const REDIS_URL=env.REDIS_CHECKPOINTER_URL

/**
 * Initialize Redis checkpointer for conversation state persistence
 * Uses RedisSaver.fromUrl() which automatically creates required indices
 */
export async function initializeCheckpointer(): Promise<RedisSaver> {
  if (redisSaver) {
    return redisSaver;
  }

  try {
    logger.info({ redisUrl: REDIS_URL.replace(/:[^:@]+@/, ':***@') }, 'Initializing Redis checkpointer...');

    // Create RedisSaver using fromUrl() which automatically sets up indices
    // IMPORTANT: RedisSaver.fromUrl() returns a Promise, so we must await it
    redisSaver = await RedisSaver.fromUrl(REDIS_URL, {
      // TTL is in MINUTES for RedisSaver
      // 60 minutes = 1 hour
      defaultTTL: 60,
      refreshOnRead: true, // Refresh TTL when conversation is accessed
    });

    logger.info('✓ Redis checkpointer initialized successfully');

    return redisSaver;
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize Redis checkpointer');
    throw error;
  }
}

/**
 * Get the Redis checkpointer instance (lazy initialization)
 */
export async function getCheckpointer(): Promise<RedisSaver> {
  if (!redisSaver) {
    return initializeCheckpointer();
  }
  return redisSaver;
}

/**
 * Close Redis checkpointer connection
 */
export async function closeCheckpointer(): Promise<void> {
  if (redisSaver) {
    // RedisSaver manages its own Redis connection, we just need to clear the reference
    redisSaver = null;
    logger.info('Redis checkpointer reference cleared');
  }
}
