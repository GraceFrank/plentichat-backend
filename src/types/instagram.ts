// Message types
export interface ConversationMessage {
  id: string;
  from: {
    id: string;
    username: string;
  };
  to: {
    id: string;
    username: string;
  };
  message: string;
  created_time: string;
  is_from_me: boolean;
}

// Participant/User types
export interface ParticipantDetails {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
}

// Conversation types
export interface Conversation {
  id: string;
  participant: ParticipantDetails;
  messages: ConversationMessage[];
  updated_time: string;
  unread_count?: number;
}

// Instagram API raw response types
export interface InstagramParticipant {
  id: string;
  username?: string;
}

export interface InstagramConversation {
  id: string;
  participants?: {
    data: InstagramParticipant[];
  };
  updated_time: string;
}

export interface InstagramMessage {
  id: string;
  from: {
    id: string;
    username?: string;
  };
  to: {
    id: string;
    username?: string;
  };
  message: string;
  created_time: string;
}

// Request/Response types for controller
export interface GetConversationsQuery {
  social_account_id?: string;
}

export interface SendMessageBody {
  recipientId: string;
  message: string;
}

export interface GetMessagesQuery {
  conversationId: string;
  social_account_id?: string;
}
