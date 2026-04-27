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

export const voiceSessionIdSchema = z.object({
  params: z.object({
    sessionId: z.string().uuid('sessionId must be a valid UUID'),
  }),
});

export const twilioVoiceSessionIdSchema = voiceSessionIdSchema;

export const twilioBrowserSessionEventsSchema = z.object({
  params: z.object({
    sessionId: z.string().uuid('sessionId must be a valid UUID'),
  }),
  query: z.object({
    after: z
      .string()
      .regex(/^\d+$/, 'after must be a positive integer')
      .optional(),
  }),
});

