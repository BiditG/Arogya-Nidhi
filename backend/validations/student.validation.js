import { z } from 'zod';

export const getQuestionsSchema = z.object({
  query: z.object({
    subject: z.string().optional(),
    topic: z.string().optional(),
    year: z.string().optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    table: z.string().optional(),
  }),
});

export const postProgressSchema = z.object({
  body: z.object({
    mcq_id: z.string().uuid(),
    selected_option: z.string().nullable().optional(),
    is_correct: z.boolean(),
    time_taken_seconds: z.number().int().nonnegative().optional(),
  }),
});
