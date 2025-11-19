import { RedisSaver } from '@langchain/langgraph-checkpoint-redis';
import { logger } from './logger';

let redisSaver: RedisSaver | null = null;

const REDIS_URL = "redis://default:ASpsAAIncDJlYjBhYWIyNTBiZWQ0MDk1OTVkMWUyNDE1NDQ2MTQxM3AyMTA4NjA@noted-penguin-10860.upstash.io:6379";

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
    logger.info('✓ TTL: 60 minutes (1 hour, refreshed on read)');
    logger.info('✓ Redis checkpointer ready to save conversation state');

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
