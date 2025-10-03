// tools/retrieveKb.ts
import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { retrieveFromSupabase } from "@/services/knowledge/retriver";
import { Assistant } from "@/types/assistant";
import { SupabaseClient } from "@supabase/supabase-js";

export function makeRetrieveTool(
  assistant: Assistant,
  supabase: SupabaseClient
) {
  return new DynamicStructuredTool({
    name: "retrieve_kb",
    description: `Retrieve KB for ${assistant.name}.`,
    schema: z.object({
      query: z.string().describe("The search query or question."),
      topK: z.number().min(1).max(10).default(4).describe("Number of results"),
    }),

    func: async ({ query, topK }) => {
      const hits = await retrieveFromSupabase({
        assistantId: assistant.id,
        query,
        k: topK,
        supabase,
      });
      return hits.map((h: { text_chunk: string }) => h.text_chunk);
    },
  });
}
