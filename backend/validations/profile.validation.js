import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    phone: z.string().max(30).optional().nullable(),
  }).refine(
    (d) => Object.keys(d).length > 0,
    { message: 'At least one field is required' }
  ),
});
