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
  attachments?: MessageAttachment[];
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
export interface IgConversationParticipant {
  id: string;
  username?: string;
}

export interface InstagramConversation {
  id: string;
  participants?: {
    data: IgConversationParticipant[];
  };
  updated_time: string;
  messages?: {
    data: InstagramMessage[];
  };
}




export interface InstagramMessage {
  id: string;
  from: IgConversationParticipant;
  to: { data: Array<IgConversationParticipant> }
  message: string;
  created_time: string;
  attachments?: {
    data: MessageAttachment[];
  };
}

// Message attachment types
export interface MessageAttachment {
  image_data?: {
    width: number;
    height: number;
    max_width: number;
    max_height: number;
    url: string;
    preview_url: string;
  };
  video_data?: {
    width: number;
    height: number;
    url: string;
    preview_url: string;
  };
  name?: string;
  mime_type?: string;
  size?: number;
}

// Legacy attachment type for sending messages
export interface MessageAttachmentPayload {
  type: 'image' | 'audio' | 'video' | 'like_heart' | 'MEDIA_SHARE';
  payload: {
    url?: string;
    id?: string;
  };
}

export interface Message {
  text?: string;
  attachment?: MessageAttachmentPayload;
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


export interface SendMessageResponse {
  recipient_id: string;
  message_id: string;
}

export interface ConversationWithMessages {
  conversationId: string;
  messages: InstagramMessage[];
  senderUsername?: string;
}