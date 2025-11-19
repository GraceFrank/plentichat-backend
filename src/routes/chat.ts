import { FastifyInstance } from 'fastify';
import { buildRagAgent, AgentContext } from '@/services/agent-factory';
import { HumanMessage } from 'langchain';
import { authMiddleware } from '@/middleware/auth';
import { logger } from '@/config/logger';
import { Assistant } from '@/models/Assistant.model';
import { getCheckpointer } from '@/config/checkpointer';

// Cache agents by assistant ID to maintain checkpointer state
const agentCache = new Map<string, ReturnType<typeof buildRagAgent>>();

interface ChatBody {
  assistantId: string;
  text: string;
  sessionId?: string; // Optional session ID for conversation tracking
}

export async function chatRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: ChatBody }>('/chat/message', {
    preHandler: authMiddleware,
  }, async (request, reply) => {
    const { assistantId, text, sessionId } = request.body;
    const userId = request.user!.id;
    const supabase = request.supabase!;

    if (!assistantId || !text) {
      return reply.status(400).send({ error: 'Missing assistantId or text' });
    }

    logger.info({ userId, assistantId, sessionId }, 'Chat request received');

    try {
      // Fetch assistant with escalation channel using the model
      const assistant = await Assistant.findById(supabase, assistantId, {
        includeEscalationChannel: true,
      });

      if (!assistant) {
        logger.warn({ assistantId }, 'Assistant not found');
        return reply.status(404).send({ error: 'Assistant not found' });
      }

      // Verify ownership
      if (assistant.userId !== userId) {
        logger.warn({ assistantId, userId }, 'Unauthorized access to assistant');
        return reply.status(403).send({ error: 'Unauthorized' });
      }

      // Get escalation channel - either from assistant or user's email as fallback
      let escalationChannel = assistant.toJSON().escalationChannel;

      if (!escalationChannel) {
        // Fallback: Use user's email as escalation channel
        const { data: user } = await supabase.auth.admin.getUserById(userId);

        if (user?.user?.email) {
          escalationChannel = {
            id: 'fallback',
            channel: 'email',
            destination: user.user.email,
            user_id: userId,
            name: 'User Email (Fallback)',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          logger.info({ userId, email: user.user.email }, 'Using user email as fallback escalation channel');
        } else {
          logger.warn({ userId }, 'No escalation channel configured and user email not found');
        }
      }

      // Generate or use provided session ID
      // If frontend provides sessionId, use it (continuing existing conversation)
      // Otherwise, generate a new unique session ID (new conversation)
      const chatSessionId = sessionId || `${userId}-${assistantId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // Build agent context with a mock social account for web chat
      const agentContext: AgentContext = {
        assistant: assistant.toJSON(),
        supabase,
        escalationChannel: escalationChannel!,
        socialAccount: {
          id: 'web-chat',
          created_at: new Date().toISOString(),
          user_id: userId,
          platform: 'web',
          platform_account_id: 'web-chat',
          access_token: '',
          token_expires_at: new Date().toISOString(),
          is_active: true,
          reply_timeout_seconds: 0,
        },
        conversationId: chatSessionId,
      };

      // Get or create cached agent for this assistant
      let agent = agentCache.get(assistantId);
      if (!agent) {
        // Build agent with Redis checkpointer for persistent conversation memory
        const checkpointer = await getCheckpointer();
        logger.info({ assistantId, hasCheckpointer: !!checkpointer }, 'Initializing agent with checkpointer');
        agent = buildRagAgent(assistant.toJSON(), checkpointer);
        agentCache.set(assistantId, agent);
        logger.info({ assistantId }, 'Created and cached new agent instance with Redis checkpointer');
      }

      // Invoke agent with thread_id for memory
      logger.info({ chatSessionId, threadId: chatSessionId }, 'Invoking agent with thread_id');

      // Check state before invocation
      try {
        const stateBefore = await agent.getState({ configurable: { thread_id: chatSessionId } });
        const messageCountBefore = (stateBefore as any)?.values?.messages?.length || 0;
        logger.info({
          chatSessionId,
          messageCountBefore,
          hasStateBefore: !!stateBefore
        }, 'Agent state BEFORE invocation');
      } catch (err) {
        logger.info({ chatSessionId }, 'No previous state found (this is expected for new conversations)');
      }

      const result = await agent.invoke(
        {
          messages: [new HumanMessage(text)],
        },
        {
          configurable: { thread_id: chatSessionId }, // Memory stores conversation state by thread_id
          context: agentContext, // Pass context for tools to access
        }
      );

      // Debug: Check state after invocation
      try {
        const state = await agent.getState({ configurable: { thread_id: chatSessionId } });
        const messageCount = (state as any)?.values?.messages?.length || 0;
        const stateValues = (state as any)?.values ? Object.keys((state as any).values) : [];
        logger.info({
          chatSessionId,
          messageCount,
          hasState: !!state,
          stateValues
        }, 'Agent state AFTER invocation');
      } catch (err) {
        logger.warn({ err }, 'Failed to get agent state after invocation');
      }

      const lastMessage = result.messages[result.messages.length - 1];
      const agentResponse =
        typeof lastMessage.content === 'string'
          ? lastMessage.content
          : JSON.stringify(lastMessage.content);

      logger.info({ assistantId, sessionId: chatSessionId }, 'Chat response generated with memory');

      return reply.send({
        reply: agentResponse,
        sessionId: chatSessionId, // Return session ID to frontend for next requests
      });
    } catch (error) {
      logger.error({ err: error, assistantId }, 'Failed to generate chat response');
      return reply.status(500).send({ error: 'Failed to generate response' });
    }
  });
}
