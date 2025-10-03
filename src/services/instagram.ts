import axios from 'axios';

interface MessageAttachment {
  type: 'image' | 'audio' | 'video' | 'like_heart' | 'MEDIA_SHARE';
  payload: {
    url?: string;
    id?: string;
  };
}

interface Message {
  text?: string;
  attachment?: MessageAttachment;
}

interface SendMessageParams {
  igId: string;
  recipientId: string;
  accessToken: string;
  message: Message;
}

export class InstagramMessagingService {
  private static readonly baseUrl = 'https://graph.instagram.com/v23.0';

  private static async sendMessage({
    igId,
    recipientId,
    accessToken,
    message,
  }: SendMessageParams) {
    const response = await axios.post(
      `${this.baseUrl}/${igId}/messages`,
      {
        recipient: { id: recipientId },
        message,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  }

  static async sendTextMessage({
    igId,
    recipientId,
    accessToken,
    text,
  }: SendMessageParams & { text: string }) {
    const message: Message = { text };
    return this.sendMessage({ igId, recipientId, accessToken, message });
  }
}
