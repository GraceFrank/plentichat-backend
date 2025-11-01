import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/config/logger';
import type {
  MessageData,
  MessageInsert,
  MessageSenderType,
  MessagePlatform,
} from '@/types/message';

export class Message {
  private data: MessageData;

  constructor(data: MessageData) {
    this.data = data;
  }

  get id(): string {
    return this.data.id;
  }

  get createdAt(): string {
    return this.data.created_at;
  }

  get text(): string | null {
    return this.data.text;
  }

  get platform_message_id(): string {
    return this.data.platform_message_id;
  }

  get senderId(): string {
    return this.data.sender_id;
  }

  get platform(): MessagePlatform {
    return this.data.platform;
  }

  get recipientId(): string {
    return this.data.recipient_id;
  }

  get senderType(): MessageSenderType {
    return this.data.sender_type;
  }

  get attachments(): Record<string, unknown> | unknown[] | null {
    return this.data.attachments;
  }

  get repliedByAi(): boolean {
    return this.data.sender_type === "AI";
  }

  get conversationId(): string | null {
    return this.data.conversation_id;
  }

  get socialAccountId(): string {
    return this.data.social_account_id;
  }

  /**
   * Convert to plain object
   */
  toJSON(): MessageData {
    return { ...this.data };
  }

  /**
   * Build model from Supabase row
   */
  private static fromRow(row: MessageData): Message {
    return new Message(row);
  }

  /**
   * Create a new message record
   */
  static async create(supabase: SupabaseClient, payload: MessageInsert): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert(payload)
      .select()
      .single();

    if (error || !data) {
      logger.error({ err: error, payload }, 'Failed to create message record');
      throw new Error('Failed to create message');
    }

    return Message.fromRow(data as MessageData);
  }



  /**
   * Find a message with flexible filtering
   */
  static async find(
    supabase: SupabaseClient,
    filter?: Partial<Omit<MessageData, 'attachments'>>
  ): Promise<Message | null> {
    let query = supabase
      .from('messages')
      .select('*');

    // Apply filters dynamically
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      logger.error({ err: error, filter }, 'Error fetching message with filter');
      throw new Error('Failed to fetch message');
    }

    if (!data) {
      return null;
    }

    return Message.fromRow(data as MessageData);
  }


}
