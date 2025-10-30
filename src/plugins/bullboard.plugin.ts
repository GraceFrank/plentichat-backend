import { FastifyAdapter } from '@bull-board/fastify';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import messageHandoffQueue from '@/queues/message-handoff/queue';

/**
 * Create and configure Bull Board dashboard adapter
 */
export function createBullBoardAdapter() {
  // Create Fastify adapter for Bull Board
  const serverAdapter = new FastifyAdapter();
  serverAdapter.setBasePath('/admin/queues');

  // Create Bull Board with all queues
  createBullBoard({
    queues: [new BullMQAdapter(messageHandoffQueue)],
    serverAdapter,
  });

  return serverAdapter;
}
