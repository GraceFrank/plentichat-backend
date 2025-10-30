export type MessagePlatform = 'INSTAGRAM' | 'FACEBOOK' | 'WHATSAPP';

export type MessageSenderType = 'CUSTOMER' | 'HUMAN' | 'AI';

export interface MessageData {
  id: string;
  created_at: string;
  text: string | null;
  platform_message_id: string;
  sender_id: string;
  platform: MessagePlatform | null;
  recipient_id: string | null;
  sender_type: MessageSenderType | null;
  attachments: Record<string, unknown> | unknown[] | null;
  conversation_id: string | null;
  social_account_id: string | null;
}

export type MessageInsert = Omit<MessageData, 'id' | 'created_at'>;
