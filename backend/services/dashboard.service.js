import repo from '../repository/dashboard.repository.js';
import authRepo from '../repository/auth.repository.js';
import { buildAppointmentMeetingLink } from '../util/meeting.util.js';
import { createNotificationSafe } from './notification.service.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_BOOKING_TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
const TRIAGE_URGENCY_LEVELS = new Set(['low', 'medium', 'high']);
const BOOKING_STATUSES = new Set(['pending', 'confirmed', 'PENDING', 'CONFIRMED']);

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

function cleanDoctorName(doctor) {
  return String(doctor?.user?.name || doctor?.name || 'Doctor').replace(/^dr\.?\s+/i, '').trim() || 'Doctor';
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

async function bookAppointment(userId, body, options = {}) {
  const patient = await _requirePatient(userId);
  const { doctorId, scheduledAt, durationMinutes, patientNotes } = body;
  const normalizedDoctorId = typeof doctorId === 'string' ? doctorId.trim() : doctorId;
  const requestedStatus = typeof options.status === 'string' ? options.status.trim() : '';
  const status = BOOKING_STATUSES.has(requestedStatus) ? requestedStatus : 'pending';
  const meetingLink = status.toUpperCase() === 'CONFIRMED'
    ? buildAppointmentMeetingLink(options.meetingSeed || `${normalizedDoctorId}-${scheduledAt}`)
    : null;

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
  if (!doctor.isVerified) {
    throw { status: 400, message: 'Doctor is not verified' };
  }

  const scheduledDate = new Date(scheduledAt);
  if (scheduledDate <= new Date()) {
    throw { status: 400, message: 'scheduledAt must be a future date and time' };
  }

  const conflicting = await repo.findAppointmentByDoctorAndScheduledAt(normalizedDoctorId, scheduledDate.toISOString());
  if (conflicting) {
    throw { status: 400, message: 'Slot already booked. Please choose another time.' };
  }

  const appointment = await repo.bookAppointment({
    patientId:       patient.id,
    doctorId:       normalizedDoctorId,
    scheduledAt:     scheduledDate,
    durationMinutes: durationMinutes || 30,
    patientNotes:    patientNotes || null,
    status,
    meetingLink,
  });

  const doctorName = cleanDoctorName(doctor);
  await Promise.all([
    createNotificationSafe({
      userId,
      title: 'Appointment booked',
      message: `Your appointment with Dr. ${doctorName} has been booked.`,
      type: 'appointment_booked',
      metadata: {
        appointmentId: appointment?.id,
        doctorId: normalizedDoctorId,
        scheduledAt: scheduledDate.toISOString(),
        status,
      },
    }),
    createNotificationSafe({
      userId: doctor.user_id || doctor.user?.id,
      title: 'New appointment',
      message: 'A patient booked an appointment with you.',
      type: 'appointment_booked',
      metadata: {
        appointmentId: appointment?.id,
        patientId: patient.id,
        scheduledAt: scheduledDate.toISOString(),
        status,
      },
    }),
  ]);

  return appointment;
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

const MAX_TEST_TYPE_LENGTH = 100;

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
  const { testType, sensorData, readingData, resultScore, notes, normalRange, recordedAt } = body;
  const normalizedTestType = String(testType || '').trim();
  const normalizedReadingData = readingData ?? sensorData;

  if (!normalizedTestType) throw { status: 400, message: 'testType is required' };
  if (normalizedTestType.length > MAX_TEST_TYPE_LENGTH) {
    throw { status: 400, message: `testType must be ${MAX_TEST_TYPE_LENGTH} characters or less` };
  }
  if (normalizedReadingData === undefined || normalizedReadingData === null) {
    throw { status: 400, message: 'readingData is required' };
  }

  let parsedScore = null;
  if (resultScore !== undefined && resultScore !== null) {
    parsedScore = Number(resultScore);
    if (Number.isNaN(parsedScore) || parsedScore < 0 || parsedScore > 100) {
      throw { status: 400, message: 'resultScore must be between 0 and 100' };
    }
  }

  return repo.createIotReading({
    patientId:   patient.id,
    testType:    normalizedTestType,
    readingData: normalizedReadingData,
    resultScore: parsedScore,
    notes:       notes || null,
    normalRange: normalRange ?? null,
    recordedAt:  recordedAt || null,
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

function normalizeConfidenceScore(value) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return null;
  return Math.max(0, Math.min(1, Number(parsed.toFixed(4))));
}

async function recordTriageDecision(userId, body) {
  const patient = await _requirePatient(userId);
  const recommendedSpecialty = String(body.recommendedSpecialty || body.recommended_specialty || '').trim() || null;
  const urgencyLevel = String(body.urgencyLevel || body.urgency_level || 'medium').trim().toLowerCase();
  const normalizedUrgency = TRIAGE_URGENCY_LEVELS.has(urgencyLevel) ? urgencyLevel : 'medium';
  const symptomText = String(body.symptomText || body.symptom_text || '').trim();
  const title = String(body.title || `AI triage: ${recommendedSpecialty || 'Doctor recommendation'}`).slice(0, 200);

  const query = await repo.createQuery({
    patient_id: patient.id,
    title,
    symptom_text: symptomText || null,
    is_anonymous: body.isAnonymous === true || body.isAnonymous === 'true',
  });

  const triageDecision = await repo.createTriageDecision({
    query_id: query.id,
    recommended_specialty: recommendedSpecialty,
    urgency_level: normalizedUrgency,
    confidence_score: normalizeConfidenceScore(body.confidenceScore ?? body.confidence_score),
    ai_reasoning: body.aiReasoning || body.ai_reasoning || null,
  });

  return { query, triageDecision };
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
    includeUnverified: false,
  });
}

async function getDoctorById(doctorId) {
  const doctor = await repo.findDoctorById(doctorId);
  if (!doctor) throw _notFound('Doctor');
  if (!doctor.isAvailable || !doctor.isVerified) throw _notFound('Doctor');
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
  if (!doctor.isAvailable || !doctor.isVerified) {
    throw { status: 400, message: 'Doctor is not available' };
  }

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
  MAX_TEST_TYPE_LENGTH,
  // queries
  getMyQueries,
  getQueryDetails,
  createQuery,
  recordTriageDecision,
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
