import repo from '../repository/dashboard.repository.js';
import authRepo from '../repository/auth.repository.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_BOOKING_TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function _requirePatient(userId) {
  if (!userId || userId === 'undefined' || userId === 'null') {
    throw { status: 401, message: 'User id not found in token' };
  }
  const patient = await repo.findPatientByUserId(userId);
  if (!patient) throw { status: 404, message: 'Patient profile not found' };
  return patient;
}

function _forbidden() {
  return { status: 403, message: 'Access denied' };
}

function _notFound(entity = 'Resource') {
  return { status: 404, message: `${entity} not found` };
}

async function _requireDoctor(userId) {
  const doctor = await authRepo.findDoctorProfileByUserId(userId);
  if (!doctor) throw { status: 404, message: 'Doctor profile not found' };
  return doctor;
}

// ─── Health Score ─────────────────────────────────────────────────────────────
// Max 100 pts:
//   Profile completeness  → 50 pts (10 fields × 5 pts each)
//   Emergency contact     → 10 pts
//   Address set           → 5 pts
//   IoT readings present  → 15 pts (5 per reading, max 3)
//   Recent IoT score avg  → 20 pts (mapped from 0-100 result score)

function _computeHealthScore(data) {
  if (!data) return { score: 0, breakdown: {} };

  let score = 0;
  const breakdown = {};

  const profileFields = [
    ['height', data.height],
    ['weight', data.weight],
    ['bloodGroup', data.bloodGroup],
    ['gender', data.gender],
    ['dateOfBirth', data.dateOfBirth],
    ['allergies', data.allergies],
    ['chronicConditions', data.chronicConditions],
    ['currentMedications', data.currentMedications],
    ['medicalHistory', data.medicalHistory],
  ];

  let profileScore = 0;
  profileFields.forEach(([key, val]) => {
    if (val !== null && val !== undefined) profileScore += 5;
  });
  // Cap profile at 45 (9 fields × 5)
  breakdown.profileCompleteness = Math.min(profileScore, 45);
  score += breakdown.profileCompleteness;

  breakdown.emergencyContact = data.emergencyContacts?.length > 0 ? 10 : 0;
  score += breakdown.emergencyContact;

  breakdown.addressSet = data.addressInfo ? 5 : 0;
  score += breakdown.addressSet;

  const readings = data.iotReadings || [];
  breakdown.iotReadings = Math.min(readings.length * 5, 15);
  score += breakdown.iotReadings;

  const scoredReadings = readings.filter((r) => r.resultScore !== null);
  if (scoredReadings.length > 0) {
    const avg = scoredReadings.reduce((s, r) => s + r.resultScore, 0) / scoredReadings.length;
    breakdown.iotAvgScore = Math.round((avg / 100) * 25);
  } else {
    breakdown.iotAvgScore = 0;
  }
  score += breakdown.iotAvgScore;

  return { score: Math.min(Math.round(score), 100), breakdown };
}

// ─── Dashboard overview ───────────────────────────────────────────────────────

async function getOverview(userId) {
  const patient = await _requirePatient(userId);

  const [upcomingCount, pendingTests, prescriptions, healthScoreData] = await Promise.all([
    repo.getUpcomingAppointmentsCount(patient.id),
    repo.getPendingTestsCount(patient.id),
    repo.getLatestPrescriptions(patient.id, 3),
    repo.getHealthScoreData(patient.id),
  ]);

  const { score: healthScore, breakdown } = _computeHealthScore(healthScoreData);

  return {
    patient: {
      id: patient.id,
      name: patient.user.name,
      email: patient.user.email,
      avatarUrl: patient.user.avatarUrl,
    },
    stats: {
      upcomingAppointments: upcomingCount,
      pendingTests,
      activePrescriptions: prescriptions.length,
      healthScore,
    },
    healthScoreBreakdown: breakdown,
    recentPrescriptions: prescriptions,
  };
}

async function getPublicQueries(query) {
  return repo.getPublicQueries({
    page:  parseInt(query.page)  || 1,
    limit: Math.min(parseInt(query.limit) || 10, 100),
    isResolved: query.isResolved === 'true' ? true : (query.isResolved === 'false' ? false : undefined),
  });
}

async function getPublicQueryById(id) {
  const q = await repo.findQueryByIdForDoctor(id);
  if (!q) throw _notFound('Query');
  await repo.incrementQueryView(id);
  return q;
}

// ─── Quick actions data ───────────────────────────────────────────────────────

async function getQuickActionsData(userId) {
  const patient = await _requirePatient(userId);

  const [upcomingAppointments, recentHistory, recentIot] = await Promise.all([
    repo.getUpcomingAppointments(patient.id, { page: 1, limit: 3 }),
    repo.getRecentMedicalHistory(patient.id, 3),
    repo.getRecentIotReadings(patient.id, 3),
  ]);

  return {
    upcomingAppointments: upcomingAppointments.appointments,
    recentMedicalHistory: recentHistory,
    recentIotReadings: recentIot,
  };
}

// ─── Appointments ─────────────────────────────────────────────────────────────

async function getUpcomingAppointments(userId, query) {
  const patient = await _requirePatient(userId);
  return repo.getUpcomingAppointments(patient.id, {
    page:  parseInt(query.page)  || 1,
    limit: Math.min(parseInt(query.limit) || 10, 50),
  });
}

async function getAllAppointments(userId, query) {
  const patient = await _requirePatient(userId);
  return repo.getAllAppointments(patient.id, {
    page:   parseInt(query.page)  || 1,
    limit:  Math.min(parseInt(query.limit) || 10, 50),
    status: query.status ? query.status.toUpperCase() : undefined,
  });
}

async function getAppointmentDetails(userId, appointmentId) {
  const patient = await _requirePatient(userId);
  const appt = await repo.findAppointmentById(appointmentId, patient.id);
  if (!appt) throw _notFound('Appointment');
  return appt;
}

async function bookAppointment(userId, body) {
  const patient = await _requirePatient(userId);
  const { doctorId, scheduledAt, durationMinutes, patientNotes } = body;
  const normalizedDoctorId = typeof doctorId === 'string' ? doctorId.trim() : doctorId;

  if (!normalizedDoctorId || normalizedDoctorId === 'undefined' || normalizedDoctorId === 'null') {
    throw { status: 400, message: 'doctorId is required' };
  }
  if (!UUID_RE.test(String(normalizedDoctorId))) {
    throw { status: 400, message: 'doctorId must be a valid UUID' };
  }
  if (!scheduledAt) throw { status: 400, message: 'scheduledAt is required' };

  const doctor = await repo.findDoctorById(normalizedDoctorId);
  if (!doctor)             throw _notFound('Doctor');
  if (!doctor.isAvailable) throw { status: 400, message: 'Doctor is not available' };
  if (!doctor.isVerified)  throw { status: 400, message: 'Doctor is not verified' };

  const scheduledDate = new Date(scheduledAt);
  if (scheduledDate <= new Date()) {
    throw { status: 400, message: 'scheduledAt must be a future date and time' };
  }

  const conflicting = await repo.findAppointmentByDoctorAndScheduledAt(normalizedDoctorId, scheduledDate.toISOString());
  if (conflicting) {
    throw { status: 400, message: 'Slot already booked. Please choose another time.' };
  }

  return repo.bookAppointment({
    patientId:       patient.id,
    doctorId:       normalizedDoctorId,
    scheduledAt:     scheduledDate,
    durationMinutes: durationMinutes || 30,
    patientNotes:    patientNotes || null,
    status:          'pending',
  });
}

async function cancelAppointment(userId, appointmentId) {
  const patient = await _requirePatient(userId);
  const appt = await repo.findAppointmentById(appointmentId, patient.id);
  if (!appt) throw _notFound('Appointment');

  if (['cancelled', 'completed'].includes(appt.status)) {
    throw { status: 400, message: `Cannot cancel an appointment with status "${appt.status}"` };
  }

  // Only allow cancellation if scheduled > 1 hour from now
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
  if (appt.scheduledAt <= oneHourFromNow) {
    throw { status: 400, message: 'Cannot cancel an appointment less than 1 hour before the scheduled time' };
  }

  return repo.cancelAppointment(appointmentId);
}

async function rescheduleAppointment(userId, appointmentId, body) {
  const patient = await _requirePatient(userId);
  const appt = await repo.findAppointmentById(appointmentId, patient.id);
  if (!appt) throw _notFound('Appointment');

  if (['cancelled', 'completed'].includes(appt.status)) {
    throw { status: 400, message: `Cannot reschedule an appointment with status "${appt.status}"` };
  }

  const scheduledDate = new Date(body.scheduledAt);
  if (scheduledDate <= new Date()) {
    throw { status: 400, message: 'New scheduledAt must be a future date and time' };
  }

  return repo.updateAppointment(appointmentId, {
    scheduledAt: scheduledDate,
    status: 'pending', // reset to pending on reschedule
    ...(body.patientNotes !== undefined && { patientNotes: body.patientNotes }),
  });
}

// ─── Medical history ──────────────────────────────────────────────────────────

async function getMedicalHistory(userId, query) {
  const patient = await _requirePatient(userId);
  return repo.getMedicalHistory(patient.id, {
    page:  parseInt(query.page)  || 1,
    limit: Math.min(parseInt(query.limit) || 10, 50),
  });
}

async function getRecentMedicalHistory(userId) {
  const patient = await _requirePatient(userId);
  return repo.getRecentMedicalHistory(patient.id, 3);
}

// ─── IoT readings ─────────────────────────────────────────────────────────────

const VALID_TEST_TYPES = ['blood_pressure', 'blood_glucose', 'heart_rate', 'spo2', 'temperature', 'weight', 'ecg', 'other'];

async function getIotReadings(userId, query) {
  const patient = await _requirePatient(userId);
  return repo.getIotReadings(patient.id, {
    page:     parseInt(query.page)  || 1,
    limit:    Math.min(parseInt(query.limit) || 10, 50),
    testType: query.testType || undefined,
  });
}

async function getRecentIotReadings(userId) {
  const patient = await _requirePatient(userId);
  return repo.getRecentIotReadings(patient.id, 3);
}

async function getIotReadingById(userId, readingId) {
  const patient = await _requirePatient(userId);
  const reading = await repo.findIotReadingById(readingId, patient.id);
  if (!reading) throw _notFound('IoT reading');
  return reading;
}

async function submitIotTest(userId, body) {
  const patient = await _requirePatient(userId);
  const { testType, sensorData, resultScore, notes } = body;

  if (!testType)   throw { status: 400, message: 'testType is required' };
  if (!sensorData) throw { status: 400, message: 'sensorData is required' };

  if (!VALID_TEST_TYPES.includes(testType)) {
    throw { status: 400, message: `Invalid testType. Allowed: ${VALID_TEST_TYPES.join(', ')}` };
  }

  return repo.createIotReading({
    patientId:   patient.id,
    testType,
    sensorData,
    resultScore: resultScore !== undefined ? parseFloat(resultScore) : null,
    notes:       notes || null,
  });
}

// ─── Patient queries ──────────────────────────────────────────────────────────

async function getMyQueries(userId, query) {
  const patient = await _requirePatient(userId);

  let isResolved;
  if (query.isResolved === 'true')  isResolved = true;
  if (query.isResolved === 'false') isResolved = false;

  return repo.getPatientQueries(patient.id, {
    page:       parseInt(query.page)  || 1,
    limit:      Math.min(parseInt(query.limit) || 10, 50),
    isResolved,
  });
}

async function getQueryDetails(userId, queryId) {
  const patient = await _requirePatient(userId);
  const q = await repo.findQueryById(queryId, patient.id);
  if (!q) throw _notFound('Query');
  await repo.incrementQueryView(queryId);
  return q;
}

async function createQuery(userId, body) {
  const patient = await _requirePatient(userId);
  const { title, symptomText, isAnonymous } = body;

  if (!title) throw { status: 400, message: 'title is required' };

  return repo.createQuery({
    patient_id:   patient.id,
    title,
    symptom_text: symptomText || null,
    is_anonymous: isAnonymous === true || isAnonymous === 'true',
  });
}

async function updateQuery(userId, queryId, body) {
  const patient = await _requirePatient(userId);
  const q = await repo.findQueryById(queryId, patient.id);
  if (!q) throw _notFound('Query');
  if (q.isResolved ?? q.is_resolved) throw { status: 400, message: 'Cannot edit a resolved query' };

  const { title, symptomText, isAnonymous } = body;
  const data = {};
  if (title !== undefined)       data.title = title;
  if (symptomText !== undefined) data.symptom_text = symptomText;
  if (isAnonymous !== undefined) data.is_anonymous = isAnonymous === true || isAnonymous === 'true';

  if (!Object.keys(data).length) throw { status: 400, message: 'No fields to update' };
  return repo.updateQuery(queryId, data);
}

async function closeQuery(userId, queryId) {
  const patient = await _requirePatient(userId);
  const q = await repo.findQueryById(queryId, patient.id);
  if (!q) throw _notFound('Query');
  if (q.isResolved ?? q.is_resolved) throw { status: 400, message: 'Query is already resolved' };
  return repo.updateQuery(queryId, { is_resolved: true });
}

async function deleteQuery(userId, queryId) {
  const patient = await _requirePatient(userId);
  const q = await repo.findQueryById(queryId, patient.id);
  if (!q) throw _notFound('Query');
  if (q.isResolved ?? q.is_resolved) throw { status: 400, message: 'Cannot delete a resolved query' };
  return repo.deleteQuery(queryId);
}

async function getCommunityQueries(query) {
  let isResolved;
  if (query.isResolved === 'true') isResolved = true;
  if (query.isResolved === 'false') isResolved = false;

  return repo.getCommunityQueries({
    page: parseInt(query.page) || 1,
    limit: Math.min(parseInt(query.limit) || 10, 50),
    isResolved,
  });
}

async function getCommunityQueryDetails(queryId) {
  const q = await repo.findCommunityQueryById(queryId);
  if (!q) throw _notFound('Query');
  await repo.incrementQueryView(queryId);
  return q;
}

async function addQueryResponse(userId, queryId, body) {
  const doctor = await _requireDoctor(userId);
  const { responseText, isAccepted } = body;

  if (!responseText) throw { status: 400, message: 'responseText is required' };

  const query = await repo.findCommunityQueryById(queryId);
  if (!query) throw _notFound('Query');

  return repo.createQueryResponse({
    query_id: queryId,
    doctor_id: doctor.id,
    response_text: responseText,
    is_accepted: isAccepted === true || isAccepted === 'true',
  });
}

// ─── Doctors ──────────────────────────────────────────────────────────────────

async function getAvailableDoctors(query) {
  return repo.getAvailableDoctors({
    page:      parseInt(query.page)  || 1,
    limit:     Math.min(parseInt(query.limit) || 10, 50),
    specialty: query.specialty || undefined,
  });
}

async function getDoctorById(doctorId) {
  const doctor = await repo.findDoctorById(doctorId);
  if (!doctor) throw _notFound('Doctor');
  return doctor;
}

async function getDoctorAvailability({ doctorId, date }) {
  const normalizedDoctorId = typeof doctorId === 'string' ? doctorId.trim() : doctorId;
  if (!normalizedDoctorId || normalizedDoctorId === 'undefined' || normalizedDoctorId === 'null') {
    throw { status: 400, message: 'doctorId is required' };
  }
  if (!UUID_RE.test(String(normalizedDoctorId))) {
    throw { status: 400, message: 'doctorId must be a valid UUID' };
  }
  if (!date) {
    throw { status: 400, message: 'date is required' };
  }

  const doctor = await repo.findDoctorById(normalizedDoctorId);
  if (!doctor) throw _notFound('Doctor');

  const startOfDay = new Date(`${date}T00:00:00`);
  if (Number.isNaN(startOfDay.getTime())) {
    throw { status: 400, message: 'date must be a valid YYYY-MM-DD value' };
  }

  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const existing = await repo.findAppointmentsByDoctorBetween(
    normalizedDoctorId,
    startOfDay.toISOString(),
    endOfDay.toISOString()
  );

  const bookedSlots = new Set(
    existing
      .map((appointment) => {
        const scheduledAt = new Date(appointment.scheduled_at || appointment.scheduledAt);
        const hour = String(scheduledAt.getHours()).padStart(2, '0');
        return `${hour}:00`;
      })
      .filter(Boolean)
  );

  const now = new Date();
  const slots = DEFAULT_BOOKING_TIME_SLOTS.filter((slot) => {
    if (bookedSlots.has(slot)) return false;
    return new Date(`${date}T${slot}:00`) > now;
  });

  return {
    doctorId: normalizedDoctorId,
    date,
    slots,
  };
}

export default {
  getOverview,
  getQuickActionsData,
  // appointments
  getUpcomingAppointments,
  getAllAppointments,
  getAppointmentDetails,
  bookAppointment,
  cancelAppointment,
  rescheduleAppointment,
  // medical history
  getMedicalHistory,
  getRecentMedicalHistory,
  // iot
  getIotReadings,
  getRecentIotReadings,
  getIotReadingById,
  submitIotTest,
  VALID_TEST_TYPES,
  // queries
  getMyQueries,
  getQueryDetails,
  createQuery,
  updateQuery,
  closeQuery,
  deleteQuery,
  getCommunityQueries,
  getCommunityQueryDetails,
  addQueryResponse,
  getPublicQueries,
  getPublicQueryById,
  // doctors
  getAvailableDoctors,
  getDoctorById,
  getDoctorAvailability,
};
