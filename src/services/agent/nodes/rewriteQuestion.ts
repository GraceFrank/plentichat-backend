// nodes/rewriteQuestion.ts
import { ChatOpenAI } from "@langchain/openai";
import { Assistant } from "@/types/assistant";
import { RetrievalGraphState } from "@/types/agentState";

export function makeRewriteQuestion(assistant: Assistant) {
  const llm = new ChatOpenAI({
    modelName: assistant.llm_model,
    temperature: 0,
  });

  return async function rewriteQuestion(state: RetrievalGraphState) {
    const question = state.messages[0].content;
    const prompt = `Rewrite the question to be more specific and clear:\n${question}`;
    const res = await llm.invoke([{ role: "user", content: prompt }]);
    return { messages: [{ role: "user", content: res.content }] };
  };
}
