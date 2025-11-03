import twilio from 'twilio';
import { env } from '@/config/env';
import { logger } from '@/config/logger';

export interface SendSMSParams {
  to: string;
  body: string;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * SMS service using Twilio
 * Provides a reusable static interface for sending SMS messages
 */
export class SMSService {
  private static client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  private static fromNumber = env.TWILIO_PHONE_NUMBER;

  /**
   * Send an SMS message using Twilio
   */
  static async send(params: SendSMSParams): Promise<SMSResult> {
    try {
      const { to, body } = params;

      const message = await this.client.messages.create({
        from: this.fromNumber,
        to,
        body,
      });

      logger.info({ messageId: message.sid, to }, 'SMS sent successfully');

      return {
        success: true,
        messageId: message.sid,
      };
    } catch (error) {
      logger.error({ err: error, params }, 'Error sending SMS');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
