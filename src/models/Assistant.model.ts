import { SupabaseClient } from '@supabase/supabase-js';
import { Assistant as AssistantData } from '@/types/assistant';
import { logger } from '@/config/logger';

export class Assistant {
  private data: AssistantData;

  constructor(data: AssistantData) {
    this.data = data;
  }

  get id(): string {
    return this.data.id;
  }

  get userId(): string {
    return this.data.user_id;
  }

  get name(): string {
    return this.data.name;
  }

  get description(): string | null {
    return this.data.description;
  }

  get aiPersonaInstruction(): string | null {
    return this.data.ai_persona_instruction;
  }

  get llmProvider(): string {
    return this.data.llm_provider;
  }

  get llmModel(): string {
    return this.data.llm_model;
  }

  get llmModelTemperature(): number | null {
    return this.data.llm_model_temperature;
  }

  get replyTimeoutSeconds(): number | null {
    return this.data.reply_timeout_seconds;
  }

  get isActive(): boolean {
    return this.data.is_active;
  }

  get scheduleStartTime(): string | null {
    return this.data.schedule_start_time;
  }

  get scheduleEndTime(): string | null {
    return this.data.schedule_end_time;
  }

  get timezone(): string {
    return this.data.timezone;
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
  toJSON(): AssistantData {
    return { ...this.data };
  }

  /**
   * Find an assistant by ID
   */
  static async findById(
    supabase: SupabaseClient,
    assistantId: string,
    isActive?: boolean
  ): Promise<Assistant | null> {
    const query = supabase
      .from('assistants')
      .select('*')
      .eq('id', assistantId);

    // Only filter by is_active if explicitly provided
    if (isActive !== undefined) {
      query.eq('is_active', isActive);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      logger.debug({ assistantId, error }, 'Assistant not found');
      return null;
    }

    return new Assistant(data as AssistantData);
  }

  /**
   * Find all assistants for a user
   */
  static async findByUserId(
    supabase: SupabaseClient,
    userId: string,
    isActive?: boolean
  ): Promise<Assistant[]> {
    const query = supabase
      .from('assistants')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Only filter by is_active if explicitly provided
    if (isActive !== undefined) {
      query.eq('is_active', isActive);
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ err: error, userId }, 'Error fetching assistants');
      throw new Error('Failed to fetch assistants');
    }

    return (data || []).map((assistant) => new Assistant(assistant as AssistantData));
  }

  /**
   * Update assistant status
   */
  static async updateStatus(
    supabase: SupabaseClient,
    assistantId: string,
    isActive: boolean
  ): Promise<void> {
    const { error } = await supabase
      .from('assistants')
      .update({ is_active: isActive })
      .eq('id', assistantId);

    if (error) {
      logger.error({ err: error, assistantId }, 'Error updating assistant status');
      throw new Error('Failed to update assistant status');
    }
  }
}
