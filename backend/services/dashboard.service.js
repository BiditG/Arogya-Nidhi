import repo from '../repository/dashboard.repository.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    status: query.status || undefined,
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
    patientId:   patient.id,
    title,
    symptomText: symptomText || null,
    isAnonymous: isAnonymous === true || isAnonymous === 'true',
  });
}

async function updateQuery(userId, queryId, body) {
  const patient = await _requirePatient(userId);
  const q = await repo.findQueryById(queryId, patient.id);
  if (!q) throw _notFound('Query');
  if (q.isResolved) throw { status: 400, message: 'Cannot edit a resolved query' };

  const { title, symptomText, isAnonymous } = body;
  const data = {};
  if (title !== undefined)       data.title = title;
  if (symptomText !== undefined) data.symptomText = symptomText;
  if (isAnonymous !== undefined) data.isAnonymous = isAnonymous === true || isAnonymous === 'true';

  if (!Object.keys(data).length) throw { status: 400, message: 'No fields to update' };
  return repo.updateQuery(queryId, data);
}

async function closeQuery(userId, queryId) {
  const patient = await _requirePatient(userId);
  const q = await repo.findQueryById(queryId, patient.id);
  if (!q) throw _notFound('Query');
  if (q.isResolved) throw { status: 400, message: 'Query is already resolved' };
  return repo.updateQuery(queryId, { isResolved: true });
}

async function deleteQuery(userId, queryId) {
  const patient = await _requirePatient(userId);
  const q = await repo.findQueryById(queryId, patient.id);
  if (!q) throw _notFound('Query');
  if (q.isResolved) throw { status: 400, message: 'Cannot delete a resolved query' };
  return repo.deleteQuery(queryId);
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
  getPublicQueries,
  getPublicQueryById,
  // doctors
  getAvailableDoctors,
  getDoctorById,
};