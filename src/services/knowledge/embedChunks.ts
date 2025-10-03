import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "langchain/document";

export async function embedChunks(chunks: Document[]) {
  const embedder = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    apiKey: process.env.OPENAI_API_KEY,
  });
  const vectors = await embedder.embedDocuments(
    chunks.map((c) => c.pageContent)
  );

  return vectors;
}

export async function embedQuery(query: string): Promise<number[]> {
  const embedder = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    apiKey: process.env.OPENAI_API_KEY,
  });
  const vector = await embedder.embedQuery(query);
  return vector;
}
