// tools/retrieveKb.ts
import { z } from "zod";
import { tool } from "langchain";
import { retrieveFromSupabase } from "@/services/knowledge/retriver";
import type { AgentContext } from "../index";

const ragTool = tool(
  async ({ query, topK }: { query: string; topK: number }, config: any) => {
    const toolContext = config.context as AgentContext;
    const { assistant, supabase } = toolContext;

    const hits = await retrieveFromSupabase({
      assistantId: assistant.id,
      query,
      k: topK,
      supabase,
    });

    return hits.map((h: { text_chunk: string }) => h.text_chunk);
  },
  {
    name: "retrieve_information_from_kb",
    description: `Use this tool to search for information from the knowledge base`,
    schema: z.object({
      query: z.string().describe("The search query or question."),
      topK: z.number().min(1).max(10).default(4).describe("Number of results"),
    }),
  }
);

export default ragTool;