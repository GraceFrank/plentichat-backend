
export interface EscalationChannel {
  id: string;
  channel: EscalationMessageChannel;
  destination: string;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export type EscalationMessageChannel = "SMS" | "email"

export type EscalationChannelInsert = Omit<EscalationChannel, 'id' | 'created_at' | 'updated_at' | 'verified'>;

export type EscalationChannelUpdate = Partial<Omit<EscalationChannel, 'id' | 'created_at' | 'updated_at'>>;
