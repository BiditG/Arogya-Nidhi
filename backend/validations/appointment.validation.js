import { z } from "zod";

export const createAppointmentSchema = z.object({
  body: z.object({
    doctor_id: z.string().uuid(),
    appointment_date: z.string().optional(),
    appointment_time: z.string().optional(),
    appointmentDate: z.string().optional(),
    appointmentTime: z.string().optional(),
    reason: z.string().optional().nullable(),
  }).refine(
    (data) => (data.appointment_date || data.appointmentDate) && (data.appointment_time || data.appointmentTime),
    { message: "appointment_date and appointment_time are required" }
  ),
});

export const updateAppointmentSchema = z.object({
  body: z.object({
    status: z
      .enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"])
      .optional(),
    meeting_link: z.string().url().optional(),
  }),
});
