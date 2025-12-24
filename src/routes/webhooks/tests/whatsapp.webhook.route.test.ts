import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildTestApp } from '@/test-utils/app';
import { generateMetaWebhookSignature } from '@/utils/signature.util';
import { FastifyInstance } from 'fastify';

// Test constants (match values in .env.test)
const TEST_VERIFY_TOKEN = 'test-verify-token';
const TEST_APP_SECRET = 'test-app-secret';

describe('WhatsApp Webhook Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/webhooks/whatsapp - Verification', () => {
    it('should verify webhook with correct token and return challenge', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/webhooks/whatsapp',
        query: {
          'hub.mode': 'subscribe',
          'hub.verify_token': TEST_VERIFY_TOKEN,
          'hub.challenge': 'test-challenge-string',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.body).toBe('test-challenge-string');
    });

    it('should return 403 when verify token is incorrect', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/webhooks/whatsapp',
        query: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong-token',
          'hub.challenge': 'test-challenge-string',
        },
      });

      expect(response.statusCode).toBe(403);
      expect(response.body).toBe('Forbidden');
    });

    it('should return 400 when required query params are missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/webhooks/whatsapp',
        query: {
          'hub.mode': 'subscribe',
          // Missing verify_token and challenge
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/webhooks/whatsapp - Event Handling', () => {
    const webhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: '123456789',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                metadata: {
                  display_phone_number: '1234567890',
                  phone_number_id: '987654321',
                },
                messages: [
                  {
                    from: '1234567890',
                    id: 'wamid.test123',
                    timestamp: '1234567890',
                    type: 'text',
                    text: {
                      body: 'Hello, this is a test message',
                    },
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    it('should accept webhook event with valid signature and return 200', async () => {
      const payload = JSON.stringify(webhookPayload);
      const signature = generateMetaWebhookSignature(
        Buffer.from(payload),
        TEST_APP_SECRET
      );

      const response = await app.inject({
        method: 'POST',
        url: '/api/webhooks/whatsapp',
        headers: {
          'content-type': 'application/json',
          'x-hub-signature-256': signature,
        },
        payload,
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe('OK');
    });

    it('should return 401 when signature is invalid', async () => {
      const payload = JSON.stringify(webhookPayload);

      const response = await app.inject({
        method: 'POST',
        url: '/api/webhooks/whatsapp',
        headers: {
          'content-type': 'application/json',
          'x-hub-signature-256': 'sha256=invalid-signature',
        },
        payload,
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid signature');
    });

    it('should return 401 when signature header is missing', async () => {
      const payload = JSON.stringify(webhookPayload);

      const response = await app.inject({
        method: 'POST',
        url: '/api/webhooks/whatsapp',
        headers: {
          'content-type': 'application/json',
        },
        payload,
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Missing signature');
    });
  });
});
