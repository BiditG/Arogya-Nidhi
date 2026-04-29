import { z } from 'zod';

const GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'];

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).optional(),
    phone: z.string().max(30).optional().nullable(),
    gender: z.enum(GENDERS).optional().nullable(),
    dateOfBirth: z.string().datetime({ offset: true }).optional().nullable()
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable()),
    streetAddress: z.string().max(200).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    state: z.string().max(100).optional().nullable(),
    pinCode: z.string().max(20).optional().nullable(),
    country: z.string().max(100).optional().nullable(),
  }).refine(
    (d) => Object.keys(d).length > 0,
    { message: 'At least one field is required' }
  ),
});
