import { describe, it, expect } from 'vitest';
import { verifySignature, generateMetaWebhookSignature } from '../signature.util';

describe('Signature Utility', () => {
  const TEST_SECRET = 'test-app-secret';
  const TEST_PAYLOAD = { message: 'Hello, World!' };
  const TEST_BODY = Buffer.from(JSON.stringify(TEST_PAYLOAD));

  describe('generateMetaWebhookSignature', () => {
    it('should generate a valid signature with sha256= prefix', () => {
      const signature = generateMetaWebhookSignature(TEST_BODY, TEST_SECRET);

      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
      expect(signature).toContain('sha256=');
    });

    it('should generate consistent signatures for same input', () => {
      const signature1 = generateMetaWebhookSignature(TEST_BODY, TEST_SECRET);
      const signature2 = generateMetaWebhookSignature(TEST_BODY, TEST_SECRET);

      expect(signature1).toBe(signature2);
    });

    it('should generate different signatures for different secrets', () => {
      const signature1 = generateMetaWebhookSignature(TEST_BODY, 'secret1');
      const signature2 = generateMetaWebhookSignature(TEST_BODY, 'secret2');

      expect(signature1).not.toBe(signature2);
    });

    it('should generate different signatures for different payloads', () => {
      const body1 = Buffer.from(JSON.stringify({ data: 'test1' }));
      const body2 = Buffer.from(JSON.stringify({ data: 'test2' }));

      const signature1 = generateMetaWebhookSignature(body1, TEST_SECRET);
      const signature2 = generateMetaWebhookSignature(body2, TEST_SECRET);

      expect(signature1).not.toBe(signature2);
    });
  });

  describe('verifySignature', () => {
    it('should return true for valid signature', () => {
      const signature = generateMetaWebhookSignature(TEST_BODY, TEST_SECRET);
      const isValid = verifySignature(TEST_BODY, signature, TEST_SECRET);

      expect(isValid).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const invalidSignature = 'sha256=invalid0000000000000000000000000000000000000000000000000000000000';
      const isValid = verifySignature(TEST_BODY, invalidSignature, TEST_SECRET);

      expect(isValid).toBe(false);
    });

    it('should return false when secret is wrong', () => {
      const signature = generateMetaWebhookSignature(TEST_BODY, TEST_SECRET);
      const isValid = verifySignature(TEST_BODY, signature, 'wrong-secret');

      expect(isValid).toBe(false);
    });

    it('should return false when payload is modified', () => {
      const signature = generateMetaWebhookSignature(TEST_BODY, TEST_SECRET);
      const modifiedBody = Buffer.from(JSON.stringify({ message: 'Modified' }));
      const isValid = verifySignature(modifiedBody, signature, TEST_SECRET);

      expect(isValid).toBe(false);
    });

    it('should return false for empty signature', () => {
      const isValid = verifySignature(TEST_BODY, '', TEST_SECRET);

      expect(isValid).toBe(false);
    });

    it('should return false when signature has different length', () => {
      const shortSignature = 'sha256=short';
      const isValid = verifySignature(TEST_BODY, shortSignature, TEST_SECRET);

      expect(isValid).toBe(false);
    });
  });

  describe('Integration: generate and verify', () => {
    it('should verify signature that was just generated', () => {
      const payload = { event: 'test', data: { id: 123, value: 'test' } };
      const body = Buffer.from(JSON.stringify(payload));
      const secret = 'my-secret-key';

      const signature = generateMetaWebhookSignature(body, secret);
      const isValid = verifySignature(body, signature, secret);

      expect(isValid).toBe(true);
    });

    it('should work with complex nested payload', () => {
      const complexPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '123456789',
            changes: [
              {
                value: {
                  messages: [{ from: '1234567890', text: { body: 'test' } }],
                },
              },
            ],
          },
        ],
      };
      const body = Buffer.from(JSON.stringify(complexPayload));

      const signature = generateMetaWebhookSignature(body, TEST_SECRET);
      const isValid = verifySignature(body, signature, TEST_SECRET);

      expect(isValid).toBe(true);
    });
  });
});
