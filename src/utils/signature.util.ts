import crypto from 'crypto';

/**
 * Verify Meta (Instagram/Facebook/WhatsApp) webhook signature
 * Uses HMAC SHA256 to validate the x-hub-signature-256 header
 */
export function verifySignature(
  rawBody: Buffer,
  signature: string,
  secret: string
): boolean {
  if (!signature) return false;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature.replace('sha256=', '')),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    // timingSafeEqual throws if buffer lengths don't match
    return false;
  }
}

/**
 * Generate Meta webhook signature for debugging/testing
 */
export function generateMetaWebhookSignature(
  rawBody: Buffer,
  secret: string
): string {
  const signature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  return `sha256=${signature}`;
}
