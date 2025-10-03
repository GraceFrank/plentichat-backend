// nodes/generateAnswer.ts
import { RetrievalGraphState } from "@/types/agentState";
import { Assistant } from "@/types/assistant";
import { ChatOpenAI } from "@langchain/openai";

export function makeGenerateAnswer(assistant: Assistant) {
  const llm = new ChatOpenAI({
    modelName: assistant.llm_model,
    temperature: 0,
  });

  return async function generateAnswer(state: RetrievalGraphState) {
    const question = state.messages[0].content;
    const context = state.messages[state.messages.length - 1].content;
    const prompt = `Answer in 3 sentences max.\nQuestion: ${question}\nContext: ${context}`;
    const res = await llm.invoke([{ role: "user", content: prompt }]);
    return { messages: [res] };
  };
}
