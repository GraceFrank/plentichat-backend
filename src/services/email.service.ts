import { CreateEmailOptions, Resend } from 'resend';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { ReactElement } from 'react';

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  react?: ReactElement;
  from?: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Email service using Resend
 * Provides a reusable static interface for sending emails
 */
export class EmailService {
  private static resend = new Resend(env.RESEND_API_KEY);
  private static fromEmail = env.RESEND_FROM_EMAIL;

  /**
   * Send an email using Resend
   */
  static async send(params: SendEmailParams): Promise<EmailResult> {
    try {
      const { to, subject, html, text, react, from, replyTo } = params;

      // Validate that exactly one of html, text, or react is provided
      const providedFormats = [html, text, react].filter(Boolean).length;

      if (providedFormats === 0) {
        return {
          success: false,
          error: 'Either html, text, or react must be provided',
        };
      }

      if (providedFormats > 1) {
        return {
          success: false,
          error: 'Only one of html, text, or react should be provided',
        };
      }

      const sendOptions = {
        from: from || this.fromEmail,
        to: Array.isArray(to) ? to : [to],
        subject,
        ...(html ? { html } : {}),
        ...(text ? { text } : {}),
        ...(react ? { react } : {}),
        ...(replyTo ? { replyTo } : {}),
      } as CreateEmailOptions

      const { data, error } = await this.resend.emails.send(sendOptions);

      if (error) {
        logger.error({ err: error, to, subject }, 'Failed to send email via Resend');
        return {
          success: false,
          error: error.message || 'Failed to send email',
        };
      }

      logger.info({ messageId: data?.id, to, subject }, 'Email sent successfully');

      return {
        success: true,
        messageId: data?.id,
      };
    } catch (error) {
      logger.error({ err: error, params }, 'Error sending email');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send a simple text email
   */
  static async sendText(to: string, subject: string, text: string): Promise<EmailResult> {
    return this.send({
      to,
      subject,
      text,
    });
  }

  /**
   * Send an email using a React email template
   */
  static async sendReactEmail(
    to: string | string[],
    subject: string,
    reactElement: ReactElement,
    options?: { from?: string; replyTo?: string }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject,
      react: reactElement,
      ...(options?.from ? { from: options.from } : {}),
      ...(options?.replyTo ? { replyTo: options.replyTo } : {}),
    });
  }
}
