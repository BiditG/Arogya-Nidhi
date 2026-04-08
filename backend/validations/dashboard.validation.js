import { z } from 'zod';

const APPOINTMENT_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];
const VALID_TEST_TYPES = ['blood_pressure', 'blood_glucose', 'heart_rate', 'spo2', 'temperature', 'weight', 'ecg', 'other'];

// ─── Shared ───────────────────────────────────────────────────────────────────

const paginationQuery = z.object({
  page:  z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
});

// ─── Appointments ─────────────────────────────────────────────────────────────

export const bookAppointmentSchema = z.object({
  body: z.object({
    doctorId:        z.string().uuid(),
    scheduledAt:     z.string().datetime({ offset: true, message: 'scheduledAt must be a valid ISO datetime' }),
    durationMinutes: z.coerce.number().int().min(15).max(120).optional().default(30),
    patientNotes:    z.string().max(1000).optional().nullable(),
  }),
});

export const rescheduleAppointmentSchema = z.object({
  body: z.object({
    scheduledAt:  z.string().datetime({ offset: true }),
    patientNotes: z.string().max(1000).optional().nullable(),
  }),
});

export const getAllAppointmentsSchema = z.object({
  query: paginationQuery.extend({
    status: z.enum(APPOINTMENT_STATUSES).optional(),
  }),
});

// ─── IoT ─────────────────────────────────────────────────────────────────────

export const submitIotTestSchema = z.object({
  body: z.object({
    testType:    z.enum(VALID_TEST_TYPES),
    sensorData:  z.record(z.unknown()).or(z.array(z.unknown())),
    resultScore: z.coerce.number().min(0).max(100).optional().nullable(),
    notes:       z.string().max(500).optional().nullable(),
  }),
});

export const getIotReadingsSchema = z.object({
  query: paginationQuery.extend({
    testType: z.enum(VALID_TEST_TYPES).optional(),
  }),
});

// ─── Queries ─────────────────────────────────────────────────────────────────

export const createQuerySchema = z.object({
  body: z.object({
    title:       z.string().min(3).max(200),
    symptomText: z.string().max(3000).optional().nullable(),
    isAnonymous: z.boolean().optional().default(false),
  }),
});

export const updateQuerySchema = z.object({
  body: z.object({
    title:       z.string().min(3).max(200).optional(),
    symptomText: z.string().max(3000).optional().nullable(),
    isAnonymous: z.boolean().optional(),
  }).refine((d) => Object.keys(d).length > 0, { message: 'At least one field is required' }),
});

export const getQueriesSchema = z.object({
  query: paginationQuery.extend({
    isResolved: z.enum(['true', 'false']).optional(),
  }),
});

// ─── Doctors ─────────────────────────────────────────────────────────────────

export const getDoctorsSchema = z.object({
  query: paginationQuery.extend({
    specialty: z.string().max(100).optional(),
  }),
});