import { z } from 'zod';

const phoneSchema = z.string().min(6).max(30).optional();

export const startVoiceSessionSchema = z.object({
  body: z.object({
    sessionId: z.string().uuid().optional(),
    patientUserId: z.string().uuid().optional(),
    phoneNumber: phoneSchema,
    initialTranscript: z.string().min(1).max(4000).optional(),
  }).refine((body) => body.patientUserId || body.phoneNumber, {
    message: 'patientUserId or phoneNumber is required',
    path: ['patientUserId'],
  }),
});

export const voiceTranscriptSchema = z.object({
  params: z.object({
    sessionId: z.string().uuid('sessionId must be a valid UUID'),
  }),
  body: z.object({
    transcript: z.string().min(1, 'transcript is required').max(4000),
    patientUserId: z.string().uuid().optional(),
    phoneNumber: phoneSchema,
  }),
});

export const voiceSessionIdSchema = z.object({
  params: z.object({
    sessionId: z.string().uuid('sessionId must be a valid UUID'),
  }),
});
