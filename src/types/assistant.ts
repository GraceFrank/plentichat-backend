export interface Assistant {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  ai_persona_instruction: string | null;
  llm_provider: string;
  llm_model: string;
  is_active: boolean;
  schedule_start_time: string | null;
  schedule_end_time: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
  llm_model_temperature: number | null;
}
