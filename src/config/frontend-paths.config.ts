import { env } from './env';

/**
 * Frontend application paths configuration
 * Centralized location for all frontend routes to make updates easier
 */
export const frontendPaths = {
  baseUrl: env.FRONTEND_APP_URL,

  /**
   * Get the messages/conversations page URL
   */
  messages: (accountId?: string, conversationId?: string) => {
    let url = `${env.FRONTEND_APP_URL}/messages`;
    let queryString = '';

    if (accountId) queryString += `accountId=${accountId}`;
    if (conversationId) queryString += `${queryString ? '&' : ''}conversation_id=${conversationId}`;

    return queryString ? `${url}?${queryString}` : url;
  },
} as const;
