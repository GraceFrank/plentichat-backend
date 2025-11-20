import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { TextLoader } from "@langchain/classic/document_loaders/fs/text";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { Document } from "@langchain/core/documents";
import { JSONLoader } from "@langchain/classic/document_loaders/fs/json";

import { SourceType } from "@/types/knowledge";

export async function loadSource({
  sourceType,
  rawText,
  filePath,
  sourceUrl,
}: {
  sourceType: SourceType;
  rawText?: string;
  filePath?: string;
  sourceUrl?: string;
}): Promise<Document[]> {
  switch (sourceType) {
    case "text":
      return [new Document({ pageContent: rawText || "" })];

    case "file":
      // For file type, we need to determine the actual file type from the path
      if (!filePath) {
        throw new Error("File path is required for file sources");
      }
      const fileExtension = filePath.split(".").pop()?.toLowerCase();
      switch (fileExtension) {
        case "pdf":
          return await new PDFLoader(filePath).load();
        case "docx":
          return await new DocxLoader(filePath).load();
        case "doc":
          return await new DocxLoader(filePath, { type: "doc" }).load();
        case "txt":
          return await new TextLoader(filePath).load();
        case "csv":
          return await new CSVLoader(filePath).load();
        case "json":
          return await new JSONLoader(filePath).load();
        default:
          throw new Error(`Unsupported file type: ${fileExtension}`);
      }

    case "pdf":
      return await new PDFLoader(filePath!).load();

    case "docx":
      return await new DocxLoader(filePath!).load();

    case "doc":
      return await new DocxLoader(filePath!, { type: "doc" }).load();

    case "txt":
      return await new TextLoader(filePath!).load();

    case "csv":
      return await new CSVLoader(filePath!).load();

    case "url":
      return await new CheerioWebBaseLoader(sourceUrl!).load();

    default:
      throw new Error("Unsupported source type");
  }
}
