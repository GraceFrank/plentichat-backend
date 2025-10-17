import { z } from 'zod';

// Query validation schemas
export const getConversationsQuerySchema = z.object({
  social_account_id: z.string().uuid().optional(),
});

export const getMessagesQuerySchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID is required'),
  social_account_id: z.string().uuid().optional(),
});

export const sendMessageQuerySchema = z.object({
  social_account_id: z.string().uuid().optional(),
});

// Body validation schemas
export const sendMessageBodySchema = z.object({
  recipientId: z.string().min(1, 'Recipient ID is required'),
  message: z.string().min(1, 'Message cannot be empty').max(1000, 'Message is too long'),
});

// Type exports from schemas
export type GetConversationsQuery = z.infer<typeof getConversationsQuerySchema>;
export type GetMessagesQuery = z.infer<typeof getMessagesQuerySchema>;
export type SendMessageQuery = z.infer<typeof sendMessageQuerySchema>;
export type SendMessageBody = z.infer<typeof sendMessageBodySchema>;
