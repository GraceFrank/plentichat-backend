import { EscalationChannel } from '@/types/escalationChannel';
import { EmailService } from './email.service';
import { SMSService } from './sms.service';
import { frontendPaths } from '@/config/frontend-paths.config';
import { logger } from '@/config/logger';
import * as React from 'react';
import EscalationEmail from '@/emails/EscalationEmail';

interface EscalationParams {
  summary: string; // short summary (from AI)
  context: string; // detailed context (from AI)
  conversationId: string;
  socialAccountID: string;
  userName?: string;
  escalationChannel: EscalationChannel
}

export class AgentEscalationService {
  /**
   * Escalate a conversation to a human agent via email and/or SMS
   */
  static async escalateToHumanAgent(params: EscalationParams) {
    const {
      summary,
      context,
      conversationId,
      socialAccountID,
      userName,
      escalationChannel

    } = params;

    const conversationURL = frontendPaths.messages(socialAccountID, conversationId);

    try {
      if (escalationChannel.channel === 'email') {

        await this.sendEscalationEmail({
          to: escalationChannel.destination,
          subject: summary,
          context,
          link: conversationURL,
          ...(userName !== undefined ? { userName } : {}),
        });
      } else {
        await this.sendEscalationSMS(escalationChannel.destination, summary, conversationURL);

      }



    } catch (error) {
      logger.error(
        { err: error },
        'Failed to send escalation'
      );
      throw new Error('Failed to send escalation notification.');
    }
  }

  /**
   * Send escalation email notification using React email template
   */
  private static async sendEscalationEmail({
    to,
    subject,
    context,
    link,
    userName = "A customer"
  }: {
    to: string;
    subject: string;
    context: string;
    link: string;
    userName?: string
  }) {
    if (!to) throw new Error('Recipient email required.');

    const emailProps = {
      context,
      link,
      userName
    };


    return EmailService.sendReactEmail(
      to,
      subject,
      React.createElement(EscalationEmail, emailProps)
    );
  }

  /**
   * Send escalation SMS notification
   */
  private static async sendEscalationSMS(to: string, summary: string, link: string) {
    const shortBody = `⚠️ Escalation: ${summary}. View: ${link}`;
    return SMSService.send({ to, body: shortBody });
  }
}