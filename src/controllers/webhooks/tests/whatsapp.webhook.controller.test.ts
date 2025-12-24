import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WhatsappWebhookController } from '../whatsapp.webhook.controller';
import { FastifyRequest, FastifyReply } from 'fastify';

describe('WhatsappWebhookController', () => {
  const TEST_VERIFY_TOKEN = 'test-verify-token';

  beforeEach(() => {
    vi.stubEnv('WHATSAPP_WEBHOOK_VERIFY_TOKEN', TEST_VERIFY_TOKEN);
  });

  describe('verifyWebhook', () => {
    it('should return challenge on successful verification', async () => {
      const mockRequest = {
        query: {
          'hub.mode': 'subscribe',
          'hub.verify_token': TEST_VERIFY_TOKEN,
          'hub.challenge': 'test-challenge-123',
        },
      } as FastifyRequest;

      const mockReply = {
        status: vi.fn().mockReturnThis(),
        type: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      await WhatsappWebhookController.verifyWebhook(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(200);
      expect(mockReply.type).toHaveBeenCalledWith('text/plain');
      expect(mockReply.send).toHaveBeenCalledWith('test-challenge-123');
    });

    it('should return 403 when verify token is wrong', async () => {
      const mockRequest = {
        query: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong-token',
          'hub.challenge': 'test-challenge-123',
        },
      } as FastifyRequest;

      const mockReply = {
        status: vi.fn().mockReturnThis(),
        send: vi.fn(),
      } as unknown as FastifyReply;

      await WhatsappWebhookController.verifyWebhook(mockRequest, mockReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith('Forbidden');
    });
  });

  // TODO: Add tests for handleWebhookEvent once message handling logic is implemented
});
