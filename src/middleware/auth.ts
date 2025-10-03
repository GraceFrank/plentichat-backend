import { FastifyRequest, FastifyReply } from 'fastify';
import { getSupabaseClient } from '@/lib/supabase';

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.substring(7);
  const supabase = getSupabaseClient();

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return reply.status(401).send({ error: 'Unauthorized: Invalid token' });
  }

  // Attach user to request
  request.user = user;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email?: string;
      [key: string]: any;
    };
  }
}
