import { BaseMessage } from '@langchain/core/messages';
import { Assistant } from '@/types/assistant';
import { Document } from 'langchain/document';
import { DynamicTool } from '@langchain/core/tools';

export interface RetrievalGraphState {
  messages: BaseMessage[];
  assistant: Assistant;
  userId: string;
  conversationId?: string;
  retrievedChunks?: Document[];
  tools?: DynamicTool[];
}
