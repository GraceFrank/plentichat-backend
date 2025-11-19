import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { BaseCheckpointSaver } from '@langchain/langgraph-checkpoint';
import tools from "./tools";
import { Assistant } from "@/types/assistant";
import { EscalationChannel } from "@/types/escalationChannel";
import { env } from "@/config/env";
import { SocialAccountData } from "@/types/SocialAccount";

/**
 * Build a LangChain agent with RAG capabilities
 * Uses the ReACT (Reasoning + Acting) pattern for tool calling and reasoning
 */

/**
 * Context that should be passed when invoking the agent
 * This context is accessible to all tools via config.context
 */
export interface AgentContext {
  assistant: Assistant;
  supabase: SupabaseClient;
  escalationChannel: EscalationChannel;
  socialAccount: SocialAccountData
  conversationId: string;
  senderUsername?: string;
}

const contextSchema = z.object({
  assistant: z.any(), // Assistant object
  supabase: z.any(), // SupabaseClient
  escalationChannel: z.any(), // EscalationChannel
  socialAccount: z.object({
    id: z.string(),
  }),
  conversationId: z.string(),
  senderUsername: z.string().optional(),
});


/**
 * Build a RAG agent with tools for knowledge base retrieval and escalation
 *
 * @param assistant - The assistant configuration
 * @param checkpointSaver - Optional Redis checkpointer for conversation memory
 * @returns Agent instance
 *
 * @example
 * // Without memory (stateless)
 * const agent = buildRagAgent(assistant);
 *
 * // With memory (stateful using Redis)
 * const checkpointer = await getCheckpointer();
 * const agent = buildRagAgent(assistant, checkpointer);
 *
 * // Invoke the agent with context and thread_id for memory
 * const result = await agent.invoke(
 *   {
 *     messages: [{ role: "user", content: "Hello!" }]
 *   },
 *   {
 *     context: {
 *       assistant,
 *       supabase,
 *       escalationChannel,
 *       socialAccount: { id: "social_123" },
 *       conversationId: "conv_456",
 *       senderUsername: "john_doe",
 *     },
 *     configurable: { thread_id: "session-123" } // For memory persistence
 *   }
 * );
 */
export function buildRagAgent(assistant: Assistant, checkpointSaver?: BaseCheckpointSaver) {
  // Initialize the LLM with assistant configuration
  const model = new ChatOpenAI({
    model: assistant.llm_model || "gpt-4o-mini",
    temperature: assistant.llm_model_temperature ?? 0.7,
    openAIApiKey: env.OPENAI_API_KEY,
  });

  // Build system prompt from assistant configuration
  const systemPrompt = `You are ${assistant.name}, an AI assistant for Instagram messaging.

${assistant.ai_persona_instruction || "Help users with their questions in a friendly and professional manner."}

When you need information to answer a question, use the retrieve_information_from_kb tool to search the knowledge base.
If a customer requests to speak with a human or if you cannot help them, use the escalate_to_human tool.
Always provide helpful, accurate, and concise responses.`;

  // Create the ReAct agent with the model, tools, and system prompt
  const agent = createAgent({
    model,
    tools,
    systemPrompt,
    contextSchema,
    ...(checkpointSaver ? { checkpointer: checkpointSaver } : {}), // Add checkpointer if provided
  });

  return agent;
}


