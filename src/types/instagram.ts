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

// Instagram User Profile types
export interface IgUserProfile {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
}

// Conversation types
export interface Conversation {
  id: string;
  participant: IgUserProfile;
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

// Message attachment types
export interface MessageAttachment {
  type: 'image' | 'audio' | 'video' | 'like_heart' | 'MEDIA_SHARE';
  payload: {
    url?: string;
    id?: string;
  };
}

export interface Message {
  text?: string;
  attachment?: MessageAttachment;
}

export interface SendMessageParams {
  igId: string;
  recipientId: string;
  accessToken: string;
  message: Message;
}

export interface ConversationsResponse {
  data: InstagramConversation[];
  paging?: {
    cursors?: {
      before: string;
      after: string;
    };
    next?: string;
  };
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
