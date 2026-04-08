import prisma from '../config/prisma.js';

// ─── Patient lookup ───────────────────────────────────────────────────────────

async function findPatientByUserId(userId) {
  return prisma.patient.findUnique({
    where: { userId },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatarUrl: true },
      },
    },
  });
}

// ─── Dashboard overview ───────────────────────────────────────────────────────

async function getUpcomingAppointmentsCount(patientId) {
  return prisma.appointment.count({
    where: {
      patientId,
      scheduledAt: { gte: new Date() },
      status: { in: ['pending', 'confirmed'] },
    },
  });
}

async function getPendingTestsCount(patientId) {
  // IoT readings submitted in last 7 days without a result score = "pending"
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return prisma.iotReading.count({
    where: {
      patientId,
      resultScore: null,
      recordedAt: { gte: sevenDaysAgo },
    },
  });
}

async function getLatestPrescriptions(patientId, take = 3) {
  return prisma.consultationSummary.findMany({
    where: {
      prescription: { not: null },
      appointment: { patientId },
    },
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      prescription: true,
      diagnosis: true,
      createdAt: true,
      appointment: {
        select: {
          id: true,
          scheduledAt: true,
          doctor: {
            select: {
              id: true,
              specialty: true,
              user: { select: { name: true, avatarUrl: true } },
            },
          },
        },
      },
    },
  });
}

// Health score: computed from profile completeness + recent vitals
async function getHealthScoreData(patientId) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: {
      height: true,
      weight: true,
      bloodGroup: true,
      gender: true,
      dateOfBirth: true,
      allergies: true,
      chronicConditions: true,
      currentMedications: true,
      medicalHistory: true,
      emergencyContacts: { select: { id: true }, take: 1 },
      addressInfo: { select: { id: true } },
      iotReadings: {
        orderBy: { recordedAt: 'desc' },
        take: 5,
        select: { resultScore: true, testType: true, recordedAt: true },
      },
    },
  });
  return patient;
}

// ─── Appointments ─────────────────────────────────────────────────────────────

async function getUpcomingAppointments(patientId, { page = 1, limit = 10 } = {}) {
  const where = {
    patientId,
    scheduledAt: { gte: new Date() },
    status: { in: ['pending', 'confirmed'] },
  };
  const [total, appointments] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        doctor: {
          select: {
            id: true,
            specialty: true,
            consultationFee: true,
            user: { select: { name: true, avatarUrl: true } },
          },
        },
        consultationSummary: {
          select: { diagnosis: true, prescription: true, followUpDate: true },
        },
        payment: { select: { status: true, amount: true, currency: true } },
      },
    }),
  ]);
  return { total, page, limit, appointments };
}

async function getAllAppointments(patientId, { page = 1, limit = 10, status } = {}) {
  const where = { patientId };
  if (status) where.status = status;

  const [total, appointments] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where,
      orderBy: { scheduledAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        doctor: {
          select: {
            id: true,
            specialty: true,
            consultationFee: true,
            isVerified: true,
            user: { select: { name: true, avatarUrl: true, email: true, phone: true } },
          },
        },
        consultationSummary: true,
        payment: { select: { status: true, amount: true, currency: true, paidAt: true } },
      },
    }),
  ]);
  return { total, page, limit, appointments };
}

async function findAppointmentById(id, patientId) {
  return prisma.appointment.findFirst({
    where: { id, patientId },
    include: {
      doctor: {
        select: {
          id: true,
          specialty: true,
          subSpecialty: true,
          consultationFee: true,
          experienceYears: true,
          bio: true,
          isVerified: true,
          user: { select: { name: true, avatarUrl: true, email: true, phone: true } },
        },
      },
      consultationSummary: true,
      payment: true,
      anonymizedCase: { select: { id: true, specialtyTag: true, isApproved: true } },
    },
  });
}

async function bookAppointment(data) {
  return prisma.appointment.create({
    data,
    include: {
      doctor: {
        select: {
          id: true,
          specialty: true,
          user: { select: { name: true, avatarUrl: true } },
        },
      },
    },
  });
}

async function cancelAppointment(id) {
  return prisma.appointment.update({
    where: { id },
    data: { status: 'cancelled' },
  });
}

async function updateAppointment(id, data) {
  return prisma.appointment.update({ where: { id }, data });
}

// ─── Medical history ──────────────────────────────────────────────────────────

async function getMedicalHistory(patientId, { page = 1, limit = 10 } = {}) {
  const where = {
    patientId,
    status: 'completed',
    consultationSummary: { isNot: null },
  };
  const [total, records] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where,
      orderBy: { scheduledAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        doctor: {
          select: {
            specialty: true,
            user: { select: { name: true, avatarUrl: true } },
          },
        },
        consultationSummary: {
          select: {
            aiSummary: true,
            doctorNotes: true,
            diagnosis: true,
            prescription: true,
            followUpDate: true,
            createdAt: true,
          },
        },
      },
    }),
  ]);
  return { total, page, limit, records };
}

async function getRecentMedicalHistory(patientId, take = 3) {
  return prisma.appointment.findMany({
    where: {
      patientId,
      status: 'completed',
      consultationSummary: { isNot: null },
    },
    orderBy: { scheduledAt: 'desc' },
    take,
    include: {
      doctor: {
        select: {
          specialty: true,
          user: { select: { name: true, avatarUrl: true } },
        },
      },
      consultationSummary: {
        select: {
          diagnosis: true,
          prescription: true,
          followUpDate: true,
          createdAt: true,
        },
      },
    },
  });
}

// ─── IoT readings ─────────────────────────────────────────────────────────────

async function getIotReadings(patientId, { page = 1, limit = 10, testType } = {}) {
  const where = { patientId };
  if (testType) where.testType = testType;

  const [total, readings] = await Promise.all([
    prisma.iotReading.count({ where }),
    prisma.iotReading.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return { total, page, limit, readings };
}

async function getRecentIotReadings(patientId, take = 3) {
  return prisma.iotReading.findMany({
    where: { patientId },
    orderBy: { recordedAt: 'desc' },
    take,
  });
}

async function findIotReadingById(id, patientId) {
  return prisma.iotReading.findFirst({ where: { id, patientId } });
}

async function createIotReading(data) {
  return prisma.iotReading.create({ data });
}

// ─── Patient queries ──────────────────────────────────────────────────────────

async function getPatientQueries(patientId, { page = 1, limit = 10, isResolved } = {}) {
  const where = { patientId };
  if (isResolved !== undefined) where.isResolved = isResolved;

  const [total, queries] = await Promise.all([
    prisma.patientQuery.count({ where }),
    prisma.patientQuery.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        responses: {
          select: {
            id: true,
            responseText: true,
            isAccepted: true,
            createdAt: true,
            doctor: {
              select: {
                specialty: true,
                user: { select: { name: true, avatarUrl: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        triageDecision: true,
        _count: { select: { responses: true } },
      },
    }),
  ]);
  return { total, page, limit, queries };
}

async function findQueryById(id, patientId) {
  return prisma.patientQuery.findFirst({
    where: { id, patientId },
    include: {
      responses: {
        include: {
          doctor: {
            select: {
              id: true,
              specialty: true,
              isVerified: true,
              user: { select: { name: true, avatarUrl: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
      triageDecision: true,
    },
  });
}

async function createQuery(data) {
  return prisma.patientQuery.create({ data });
}

async function updateQuery(id, data) {
  return prisma.patientQuery.update({ where: { id }, data });
}

async function deleteQuery(id) {
  return prisma.patientQuery.delete({ where: { id } });
}

async function incrementQueryView(id) {
  return prisma.patientQuery.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
  });
}

// ─── Doctors (for booking) ────────────────────────────────────────────────────

async function getAvailableDoctors({ page = 1, limit = 10, specialty } = {}) {
  const where = { isAvailable: true, isVerified: true };
  if (specialty) where.specialty = { contains: specialty, mode: 'insensitive' };

  const [total, doctors] = await Promise.all([
    prisma.doctorProfile.count({ where }),
    prisma.doctorProfile.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        specialty: true,
        subSpecialty: true,
        experienceYears: true,
        consultationFee: true,
        bio: true,
        isVerified: true,
        user: { select: { name: true, avatarUrl: true, email: true } },
      },
    }),
  ]);
  return { total, page, limit, doctors };
}

async function findDoctorById(id) {
  return prisma.doctorProfile.findUnique({
    where: { id },
    select: {
      id: true,
      specialty: true,
      subSpecialty: true,
      experienceYears: true,
      consultationFee: true,
      bio: true,
      qualifications: true,
      isVerified: true,
      isAvailable: true,
      user: { select: { name: true, avatarUrl: true, email: true } },
    },
  });
}

export default {
  findPatientByUserId,
  // overview
  getUpcomingAppointmentsCount,
  getPendingTestsCount,
  getLatestPrescriptions,
  getHealthScoreData,
  // appointments
  getUpcomingAppointments,
  getAllAppointments,
  findAppointmentById,
  bookAppointment,
  cancelAppointment,
  updateAppointment,
  // medical history
  getMedicalHistory,
  getRecentMedicalHistory,
  // iot
  getIotReadings,
  getRecentIotReadings,
  findIotReadingById,
  createIotReading,
  // queries
  getPatientQueries,
  findQueryById,
  createQuery,
  updateQuery,
  deleteQuery,
  incrementQueryView,
  // doctors
  getAvailableDoctors,
  findDoctorById,
};