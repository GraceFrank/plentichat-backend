// nodes/gradeDocuments.ts
import { RetrievalGraphState } from "@/types/agentState";
import { Assistant } from "@/types/assistant";
import { ChatOpenAI } from "@langchain/openai";

export function makeGradeDocuments(assistant: Assistant) {
  const grader = new ChatOpenAI({
    modelName: assistant.llm_model,
    temperature: 0,
  });

  return async function gradeDocuments(state: RetrievalGraphState) {
    const question = state.messages[0].content;
    const context = state.messages[state.messages.length - 1].content;
    const prompt = `Is this context relevant to the question? Question: ${question} Context: ${context} Reply 'yes' or 'no'.`;
    const res = await grader.invoke([{ role: "user", content: prompt }]);
    const content =
      typeof res.content === "string" ? res.content : String(res.content);
    return content.toLowerCase().includes("yes")
      ? "generate_answer"
      : "rewrite_question";
  };
}
