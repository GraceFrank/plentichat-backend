import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/config/logger';
import type {
  EscalationChannel as EscalationChannelData,
  EscalationChannelInsert,
  EscalationChannelUpdate,
} from '@/types/escalationChannel';

export class EscalationChannel {
  private data: EscalationChannelData;

  constructor(data: EscalationChannelData) {
    this.data = data;
  }

  get id(): string {
    return this.data.id;
  }

  get channel(): string {
    return this.data.channel;
  }

  get destination(): string {
    return this.data.destination;
  }

  get verified(): boolean {
    return this.data.verified ?? false;
  }

  get createdAt(): string {
    return this.data.created_at;
  }

  get updatedAt(): string {
    return this.data.updated_at;
  }

  /**
   * Convert to plain object
   */
  toJSON(): EscalationChannelData {
    return { ...this.data };
  }

  /**
   * Build model from Supabase row
   */
  private static fromRow(row: EscalationChannelData): EscalationChannel {
    return new EscalationChannel(row);
  }

  /**
   * Create a new escalation channel
   */
  static async create(
    supabase: SupabaseClient,
    payload: EscalationChannelInsert
  ): Promise<EscalationChannel> {
    const { data, error } = await supabase
      .from('escalation_channels')
      .insert(payload)
      .select()
      .single();

    if (error || !data) {
      logger.error({ err: error, payload }, 'Failed to create escalation channel');
      throw new Error('Failed to create escalation channel');
    }

    return EscalationChannel.fromRow(data as EscalationChannelData);
  }

  /**
   * Find an escalation channel by ID
   */
  static async findById(
    supabase: SupabaseClient,
    id: string
  ): Promise<EscalationChannel | null> {
    const { data, error } = await supabase
      .from('escalation_channels')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      logger.error({ err: error, id }, 'Error fetching escalation channel by ID');
      throw new Error('Failed to fetch escalation channel');
    }

    if (!data) {
      return null;
    }

    return EscalationChannel.fromRow(data as EscalationChannelData);
  }

  /**
   * Find escalation channel with flexible filtering
   */
  static async find(
    supabase: SupabaseClient,
    filter?: Partial<Omit<EscalationChannelData, 'created_at' | 'updated_at'>>
  ): Promise<EscalationChannel | null> {
    let query = supabase.from('escalation_channels').select('*');

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
      logger.error({ err: error, filter }, 'Error fetching escalation channel with filter');
      throw new Error('Failed to fetch escalation channel');
    }

    if (!data) {
      return null;
    }

    return EscalationChannel.fromRow(data as EscalationChannelData);
  }

  /**
   * Update an escalation channel
   */
  static async update(
    supabase: SupabaseClient,
    id: string,
    payload: EscalationChannelUpdate
  ): Promise<EscalationChannel> {
    const { data, error } = await supabase
      .from('escalation_channels')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      logger.error({ err: error, id, payload }, 'Failed to update escalation channel');
      throw new Error('Failed to update escalation channel');
    }

    return EscalationChannel.fromRow(data as EscalationChannelData);
  }

  /**
   * Delete an escalation channel
   */
  static async delete(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from('escalation_channels').delete().eq('id', id);

    if (error) {
      logger.error({ err: error, id }, 'Failed to delete escalation channel');
      throw new Error('Failed to delete escalation channel');
    }
  }

  /**
   * List all escalation channels with optional filtering
   */
  static async list(
    supabase: SupabaseClient,
    options?: {
      verified?: boolean;
      channel?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<EscalationChannel[]> {
    let query = supabase.from('escalation_channels').select('*');

    if (options?.verified !== undefined) {
      query = query.eq('verified', options.verified);
    }

    if (options?.channel) {
      query = query.eq('channel', options.channel);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ err: error, options }, 'Error listing escalation channels');
      throw new Error('Failed to list escalation channels');
    }

    return (data || []).map((row) => EscalationChannel.fromRow(row as EscalationChannelData));
  }
}
