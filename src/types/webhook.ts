export interface WebhookPayload {
  object: 'instagram';
  entry: Array<{
    time: number;
    id: string;
    messaging: Messaging[];
  }>;
}

export interface Messaging {
  sender: Sender;
  recipient: Recipient;
  timestamp: number;
  message: Message;
}

interface Message {
  mid: string;
  text?: string;
  is_echo: boolean;
  attachments?: Attachment[];
}

type Sender = {
  id: string;
};

type Recipient = {
  id: string;
};

interface Attachment {
  type: 'image' | 'video' | 'audio';
  payload: {
    url: string;
  };
}
