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

const diagnosticMessageSchema = z.object({
  text: z.string().min(1),
  role: z.string().optional(),
});

const diagnosticCaseSchemaBase = z.record(z.string(), z.unknown());

export const diagnosticCaseSchema = z.object({
  body: z.object({
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    specialty: z.string().optional(),
  }),
});

export const diagnosticReplySchema = z.object({
  body: z.object({
    case: diagnosticCaseSchemaBase,
    messages: z.array(diagnosticMessageSchema).min(1, 'At least one message is required'),
  }),
});

export const diagnosticEvaluateSchema = z.object({
  body: z.object({
    case: diagnosticCaseSchemaBase,
    guess: z.string().min(1, 'Diagnosis guess is required'),
  }),
});

export const diagnosticRevealSchema = z.object({
  body: z.object({
    case: diagnosticCaseSchemaBase,
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

