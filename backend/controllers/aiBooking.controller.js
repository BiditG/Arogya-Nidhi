import prisma from '../config/prisma.js';
import { analyzeSymptoms } from '../services/gemini.service.js';
import { safetyCheck } from '../utils/safetyCheck.js';

const formatSlotLabel = (dateTime) => {
  if (!dateTime) return '';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dateTime));
};

const normalizeDoctor = (doctor, slot) => ({
  id: doctor.id,
  userId: doctor.user_id,
  name: doctor.user?.name || doctor.user?.email || doctor.specialty || 'Doctor',
  specialization: doctor.specialty || 'General Medicine',
  slot: slot
    ? {
        id: slot.id,
        dateTime: slot.dateTime,
        isBooked: slot.isBooked,
      }
    : null,
});

async function findBestDoctorAndSlot(department) {
  const where = {
    is_verified: true,
    is_available: true,
  };

  if (department) {
    where.OR = [
      { specialty: { contains: department, mode: 'insensitive' } },
      { sub_specialty: { contains: department, mode: 'insensitive' } },
    ];
  }

  const doctors = await prisma.doctorProfile.findMany({
    where,
    include: {
      user: true,
      slots: {
        where: {
          isBooked: false,
          dateTime: { gte: new Date() },
        },
        orderBy: { dateTime: 'asc' },
        take: 1,
      },
    },
    orderBy: [{ created_at: 'asc' }],
    take: 20,
  });

  const withSlots = doctors
    .map((doctor) => ({ doctor, slot: doctor.slots?.[0] || null }))
    .filter(({ slot }) => !!slot)
    .sort((left, right) => new Date(left.slot.dateTime) - new Date(right.slot.dateTime));

  if (withSlots.length) {
    return withSlots[0];
  }

  if (!department) return null;

  const fallbackDoctors = await prisma.doctorProfile.findMany({
    where: {
      is_verified: true,
      is_available: true,
    },
    include: {
      user: true,
      slots: {
        where: {
          isBooked: false,
          dateTime: { gte: new Date() },
        },
        orderBy: { dateTime: 'asc' },
        take: 1,
      },
    },
    orderBy: [{ created_at: 'asc' }],
    take: 20,
  });

  const fallbackWithSlots = fallbackDoctors
    .map((doctor) => ({ doctor, slot: doctor.slots?.[0] || null }))
    .filter(({ slot }) => !!slot)
    .sort((left, right) => new Date(left.slot.dateTime) - new Date(right.slot.dateTime));

  return fallbackWithSlots[0] || null;
}

export async function aiBooking(req, res) {
  try {
    const { message, userId } = req.body;
    const requestUserId = req.user?.userId || req.user?.id || userId;

    if (!requestUserId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }

    if (!message || !String(message).trim()) {
      return res.status(400).json({ success: false, message: 'message is required' });
    }

    const aiData = await analyzeSymptoms(String(message).trim());
    const safety = safetyCheck(aiData);

    if (!safety.allowed) {
      return res.status(400).json({ success: false, message: safety.message, aiData });
    }

    const match = await findBestDoctorAndSlot(aiData.department);
    if (!match) {
      return res.status(404).json({ success: false, message: 'No available doctor slot found for the suggested department', aiData });
    }

    const doctor = normalizeDoctor(match.doctor, match.slot);
    const slotLabel = formatSlotLabel(match.slot.dateTime);

    return res.status(200).json({
      success: true,
      data: {
        message: `Doctor ${doctor.name} available at ${slotLabel}. Confirm?`,
        doctor,
        slot: doctor.slot,
        aiData,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error?.message || 'Failed to analyze booking request' });
  }
}

export async function confirmBooking(req, res) {
  try {
    const { userId, doctorId, slotId, symptoms } = req.body;
    const requestUserId = req.user?.userId || req.user?.id || userId;

    if (!requestUserId || !doctorId || !slotId) {
      return res.status(400).json({ success: false, message: 'userId, doctorId, and slotId are required' });
    }

    const appointment = await prisma.$transaction(async (tx) => {
      const slot = await tx.slot.findUnique({
        where: { id: slotId },
        include: {
          doctor: {
            include: { user: true },
          },
        },
      });

      if (!slot) {
        throw { status: 404, message: 'Slot not found' };
      }

      if (slot.isBooked) {
        throw { status: 400, message: 'Slot is already booked' };
      }

      if (!slot.doctor?.is_verified || !slot.doctor?.is_available) {
        throw { status: 400, message: 'Doctor is not available for booking' };
      }

      if (slot.doctorId !== doctorId) {
        throw { status: 400, message: 'Slot does not belong to the selected doctor' };
      }

      const locked = await tx.slot.updateMany({
        where: {
          id: slotId,
          isBooked: false,
        },
        data: {
          isBooked: true,
        },
      });

      if (locked.count === 0) {
        throw { status: 400, message: 'Slot is already booked' };
      }

      const appointmentDate = new Date(slot.dateTime);
      const appointmentTime = appointmentDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      return tx.appointment.create({
        data: {
          patient_id: requestUserId,
          doctor_id: slot.doctor.user_id,
          slotId,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          reason: symptoms || 'AI assisted booking',
          status: 'CONFIRMED',
        },
        include: {
          doctor: true,
          patient: true,
          slot: true,
        },
      });
    });

    return res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      data: appointment,
    });
  } catch (error) {
    const status = error?.status || 500;
    return res.status(status).json({ success: false, message: error?.message || 'Failed to confirm booking' });
  }
}
