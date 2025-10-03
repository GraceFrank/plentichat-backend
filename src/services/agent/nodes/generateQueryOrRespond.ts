// nodes/generateQueryOrRespond.ts
import { ChatOpenAI } from "@langchain/openai";
import { Assistant } from "@/types/assistant";
import { RetrievalGraphState } from "@/types/agentState";
import { DynamicStructuredTool } from "@langchain/core/tools";

export function makeGenerateQueryOrRespond(
  assistant: Assistant,
  retrieveTool: DynamicStructuredTool
) {
  const llm = new ChatOpenAI({
    modelName: assistant.llm_model,
    temperature: assistant.llm_model_temperature ?? 0.2,
  });

  return async function generateQueryOrRespond(state: RetrievalGraphState) {
    const res = await llm.bindTools([retrieveTool]).invoke(state.messages);
    return { messages: [res] };
  };
}
