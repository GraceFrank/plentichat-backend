import * as Sentry from '@sentry/node';
import { env } from './env';

/**
 * Initialize Sentry for error tracking and performance monitoring
 */
export function initializeSentry() {
  if (!env.SENTRY_DSN) {
    console.warn('Sentry DSN not configured, skipping Sentry initialization');
    return;
  }

  // Try to load profiling integration (may not be available in all environments)
  let profilingIntegration;
  try {
    const { nodeProfilingIntegration } = require('@sentry/profiling-node');
    profilingIntegration = nodeProfilingIntegration();
    console.log('✓ Sentry profiling integration loaded');
  } catch (error) {
    console.warn('⚠️  Sentry profiling not available (this is normal in development/Docker):', (error as Error).message);
  }

  const integrations = profilingIntegration ? [profilingIntegration] : [];

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring
    // In production, consider reducing this to a lower percentage
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Set profilesSampleRate to 1.0 to capture 100% of transactions for profiling
    // In production, consider reducing this to a lower percentage
    profilesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,

    integrations,

    // Filter out sensitive data
    beforeSend(event, hint) {
      // Don't send certain errors
      if (event.exception) {
        const error = hint.originalException;
        if (error instanceof Error) {
          // Skip specific errors you don't want to track
          if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
            return null;
          }
        }
      }

      // Remove sensitive data from context
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }
      }

      return event;
    },
  });

  console.log('✓ Sentry initialized');
}

export { Sentry };
