import { z } from 'zod';

export const registerUserSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
});

export const loginUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const updateUserProfileSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    dob: z.string().optional(),
    gender: z.enum(['Male', 'Female', 'Not Selected', 'Other']).optional(),
  }),
});

export const bookAppointmentSchema = z.object({
  body: z.object({
    docId: z.string().uuid('docId must be a valid UUID'),
    slotDate: z.string().min(1, 'slotDate is required'),
    slotTime: z.string().min(1, 'slotTime is required'),
  }),
});

export const appointmentIdSchema = z.object({
  body: z.object({
    appointmentId: z.string().uuid('appointmentId must be a valid UUID'),
  }),
});
