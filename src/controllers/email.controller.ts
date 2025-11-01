import { FastifyRequest, FastifyReply } from 'fastify';
import * as disposableDomains from '../config/disposable-domains.json';

interface CheckEmailRequest {
  email: string;
}

/**
 * Check if an email domain is disposable
 */
export async function checkDisposableEmail(
  request: FastifyRequest<{ Body: CheckEmailRequest }>,
  reply: FastifyReply
) {
  try {
    const { email } = request.body;

    if (!email) {
      return reply.status(400).send({
        error: 'Email is required',
      });
    }

    // Extract domain from email
    const domain = email.split('@')[1]?.toLowerCase();

    if (!domain) {
      return reply.status(400).send({
        error: 'Invalid email format',
      });
    }

    // Check if domain is in disposable list
    const isDisposable = (disposableDomains as string[]).includes(domain);

    return reply.send({
      isDisposable,
      domain,
      message: isDisposable
        ? 'This email has been flagged as disposable and will be removed from the system after 24 hours'
        : 'Email domain is acceptable',
    });
  } catch (error) {
    console.error('Error checking disposable email:', error);
    return reply.status(500).send({
      error: 'Internal server error',
    });
  }
}
