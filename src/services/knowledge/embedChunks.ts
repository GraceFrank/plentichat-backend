import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";

export async function embedChunks(chunks: Document[]) {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required");
  }

  const embedder = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    apiKey,
  });
  const vectors = await embedder.embedDocuments(
    chunks.map((c) => c.pageContent)
  );

  return vectors;
}

export async function embedQuery(query: string): Promise<number[]> {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required");
  }

  const embedder = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    apiKey,
  });
  const vector = await embedder.embedQuery(query);
  return vector;
}
