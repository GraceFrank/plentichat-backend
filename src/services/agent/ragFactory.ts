// ragGraphFactory.ts
import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { BaseMessage } from "@langchain/core/messages";
import { Document } from "langchain/document";
import { DynamicTool } from "@langchain/core/tools";
import { makeRetrieveTool } from "./tools/retrieveKb";
import { makeGenerateQueryOrRespond } from "./nodes/generateQueryOrRespond";
import { makeGradeDocuments } from "./nodes/gradeDocuments";
import { makeRewriteQuestion } from "./nodes/rewriteQuestion";
import { makeGenerateAnswer } from "./nodes/generateAnswer";
import { Assistant } from "@/types/assistant";
import { SupabaseClient } from "@supabase/supabase-js";

const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  assistant: Annotation<Assistant>({
    reducer: (x, y) => y ?? x,
  }),
  userId: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  conversationId: Annotation<string>({
    reducer: (x, y) => y ?? x,
  }),
  retrievedChunks: Annotation<Document[]>({
    reducer: (x, y) => y ?? x,
  }),
  tools: Annotation<DynamicTool[]>({
    reducer: (x, y) => y ?? x,
  }),
});

export function buildRagGraph(assistant: Assistant, supabase: SupabaseClient) {
  const workflow = new StateGraph(GraphState);

  const retrieveTool = makeRetrieveTool(assistant, supabase);

  workflow
    .addNode(
      "generate_query_or_respond",
      makeGenerateQueryOrRespond(assistant, retrieveTool)
    )
    .addNode("retrieve", new ToolNode([retrieveTool]))
    .addNode("rewrite_question", makeRewriteQuestion(assistant))
    .addNode("generate_answer", makeGenerateAnswer(assistant))
    .addEdge(START, "generate_query_or_respond")
    .addConditionalEdges("generate_query_or_respond", toolsCondition, {
      tools: "retrieve",
      [END]: END, // <-- handle the "no tools, just end" case
    })
    .addConditionalEdges("retrieve", makeGradeDocuments(assistant))
    .addEdge("generate_answer", END)
    .addEdge("rewrite_question", "generate_query_or_respond");

  return workflow.compile();
}
