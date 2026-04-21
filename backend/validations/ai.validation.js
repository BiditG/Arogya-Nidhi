import { z } from 'zod';

export const chatSchema = z.object({
  body: z.object({
    messages: z.array(
      z.object({
        text: z.string().min(1),
      })
    ).min(1, 'At least one message is required'),
  }),
});

export const assistantChatSchema = z.object({
  body: z.object({
    message: z.string().min(1, 'message is required').max(2000),
  }),
});

