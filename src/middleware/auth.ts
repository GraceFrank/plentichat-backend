import { FastifyRequest, FastifyReply } from 'fastify';
import { createSupabaseClient, getSupabaseServiceClient } from '@/lib/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.substring(7);

  // Use service client only to verify the token
  const serviceClient = getSupabaseServiceClient();
  const { data: { user }, error } = await serviceClient.auth.getUser(token);

  if (error || !user) {
    return reply.status(401).send({ error: 'Unauthorized: Invalid token' });
  }

  // Attach user and RLS-enabled Supabase client to request
  request.user = user;
  request.supabase = createSupabaseClient(token);
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email?: string;
      [key: string]: any;
    };
    supabase?: SupabaseClient;
  }
}
