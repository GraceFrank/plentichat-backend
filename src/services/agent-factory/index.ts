import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { SupabaseClient } from "@supabase/supabase-js";
import { makeRetrieveTool } from "./tools/retrieveKb";
import { Assistant } from "@/types/assistant";
import { env } from "@/config/env";

/**
 * Build a LangChain agent with RAG capabilities
 * Uses the ReACT (Reasoning + Acting) pattern for tool calling and reasoning
 */
export function buildRagAgent(assistant: Assistant, supabase: SupabaseClient) {
  // Initialize the LLM with assistant configuration
  const model = new ChatOpenAI({
    model: assistant.llm_model || "gpt-4o-mini",
    temperature: assistant.llm_model_temperature ?? 0.7,
    openAIApiKey: env.OPENAI_API_KEY,
  });


  // Create the retrieve tool for knowledge base access
  const retrieveTool = makeRetrieveTool(assistant, supabase);

  // Build system prompt from assistant configuration
  const systemPrompt = `You are ${assistant.name}, an AI assistant for Instagram messaging.

${assistant.ai_persona_instruction || "Help users with their questions in a friendly and professional manner."}

When you need information to answer a question, use the retrieve_kb tool to search the knowledge base.
Always provide helpful, accurate, and concise responses.`;

  // Create the ReAct agent with the model, tools, and system prompt
  const agent = createAgent({
    model,
    tools: [retrieveTool],
    systemPrompt,
  });

  return agent;
}
