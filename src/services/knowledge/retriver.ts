// lib/rag/retrieve.ts
import { SupabaseClient } from "@supabase/supabase-js";
import { embedQuery } from "./embedChunks";

interface RetrieveFromSupabaseProps {
  assistantId: string;
  query: string;
  k: number;
  supabase: SupabaseClient;
}

export async function retrieveFromSupabase({
  assistantId,
  query,
  k,
  supabase,
}: RetrieveFromSupabaseProps): Promise<
  { id: string; text_chunk: string; similarity: number }[]
> {
  const embeddings = await embedQuery(query);

  const { data } = await supabase.rpc("match_document_chunks", {
    query_embedding: Array.from(embeddings),
    match_count: k,
    in_assistant: assistantId,
  });

  return data || [];
}
