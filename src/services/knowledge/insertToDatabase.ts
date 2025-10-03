import { SupabaseClient } from "@supabase/supabase-js";

export async function insertToDatabase({
  supabase,
  assistantId,
  title,
  sourceType,
  sourceUrl,
  rawText,
  chunks,
  embeddings,
}: {
  supabase: SupabaseClient;
  assistantId: string;
  title: string;
  sourceType: string;
  sourceUrl?: string;
  rawText?: string;
  chunks: { pageContent: string }[];
  embeddings: number[][];
}) {
  const { data: knowledgeSource, error: sourceError } = await supabase
    .from("knowledge_sources")
    .insert({
      assistant_id: assistantId,
      title,
      source_type: sourceType,
      source_url: sourceUrl,
      raw_text: rawText,
      // Note: We don't store file_path since it's a temporary file that gets deleted
    })
    .select()
    .single();

  if (sourceError) throw sourceError;

  const chunkData = chunks.map((chunk, i) => ({
    assistant_id: assistantId,
    knowledge_source_id: knowledgeSource.id,
    text_chunk: chunk.pageContent,
    embedding: embeddings[i],
  }));

  const { error: chunkError } = await supabase
    .from("document_chunks")
    .insert(chunkData);

  if (chunkError) throw chunkError;

  return knowledgeSource.id;
}
