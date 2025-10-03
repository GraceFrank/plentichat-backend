export type KnowledgeSource = {
    id: string; // UUID
    assistant_id: string;
    title: string;
    source_type: SourceType;
    source_url?: string | null;
    raw_text?: string | null;
    file_path?: string | null;
    created_at: string; // ISO timestamp
    updated_at: string; // ISO timestamp
    file_url?: string | null;
};

export type SourceType = "text" | "url" | "file" | AllowedFileTypes;

export type AllowedFileTypes = "pdf" | "docx" | "doc" | "txt" | "csv" | "json";
