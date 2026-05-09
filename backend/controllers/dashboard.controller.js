 import service from '../services/dashboard.service.js';
import { sendSuccess, sendError } from '../util/response.util.js';

function getAuthUserId(req) {
  return req.user?.userId || req.user?.sub || req.user?.id || null;
}

// ─── Overview & Quick Actions ─────────────────────────────────────────────────

/**
 * GET /api/patient/dashboard
 * Health score, stats, recent prescriptions
 */
export async function getOverview(req, res) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return sendError(res, 'User id not found in token', 401);
    const data = await service.getOverview(userId);
    return sendSuccess(res, data, 'Dashboard overview fetched');
  } catch (err) {
    console.error('createQuery error:', err);
    return sendError(res, err, err.status || 500);
  }
}

/**
 * GET /api/patient/dashboard/quick-actions
 * Upcoming appointments (3), recent history (3), recent IoT (3)
 */
export async function getQuickActionsData(req, res) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return sendError(res, 'User id not found in token', 401);
    const data = await service.getQuickActionsData(userId);
    return sendSuccess(res, data, 'Quick actions data fetched');
  } catch (err) {
    return sendError(res, err.message, err.status || 500);
  }
}

// ─── Appointments ─────────────────────────────────────────────────────────────

/**
 * GET /api/patient/appointments/upcoming
 * Query: { page?, limit? }
 */
export async function getUpcomingAppointments(req, res) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return sendError(res, 'User id not found in token', 401);
    const data = await service.getUpcomingAppointments(userId, req.query);
    return sendSuccess(res, data, 'Upcoming appointments fetched');
  } catch (err) {
    return sendError(res, err.message, err.status || 500);
  }
}

/**
 * GET /api/patient/appointments
 * Query: { page?, limit?, status? }
 */
export async function getAllAppointments(req, res) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return sendError(res, 'User id not found in token', 401);
    const data = await service.getAllAppointments(userId, req.query);
    return sendSuccess(res, data, 'Appointments fetched');
  } catch (err) {
    return sendError(res, err.message, err.status || 500);
  }
}

/**
 * GET /api/patient/appointments/:id
 */
export async function getAppointmentDetails(req, res) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return sendError(res, 'User id not found in token', 401);
    const data = await service.getAppointmentDetails(userId, req.params.id);
    return sendSuccess(res, data, 'Appointment details fetched');
  } catch (err) {
    return sendError(res, err.message, err.status || 500);
  }
}

/**
 * POST /api/patient/appointments
 * Body: { doctorId, scheduledAt, durationMinutes?, patientNotes? }
 */
export async function bookAppointment(req, res) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return sendError(res, 'User id not found in token', 401);
    const data = await service.bookAppointment(userId, req.body);
    return sendSuccess(res, data, 'Appointment booked successfully', 201);
  } catch (err) {
    return sendError(res, err.message, err.status || 500);
  }
}

/**
 * PATCH /api/patient/appointments/:id/cancel
 */
export async function cancelAppointment(req, res) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return sendError(res, 'User id not found in token', 401);
    const data = await service.cancelAppointment(userId, req.params.id);
    return sendSuccess(res, data, 'Appointment cancelled');
  } catch (err) {
    return sendError(res, err.message, err.status || 500);
  }
}

/**
 * PATCH /api/patient/appointments/:id/reschedule
 * Body: { scheduledAt, patientNotes? }
 */
export async function rescheduleAppointment(req, res) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return sendError(res, 'User id not found in token', 401);
    const data = await service.rescheduleAppointment(userId, req.params.id, req.body);
    return sendSuccess(res, data, 'Appointment rescheduled');
  } catch (err) {
    return sendError(res, err.message, err.status || 500);
  }
}

// ─── Medical History ──────────────────────────────────────────────────────────

/**
 * GET /api/patient/medical-history
 * Query: { page?, limit? }
 */
export async function getMedicalHistory(req, res) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return sendError(res, 'User id not found in token', 401);
    const data = await service.getMedicalHistory(userId, req.query);
    return sendSuccess(res, data, 'Medical history fetched');
  } catch (err) {
    return sendError(res, err.message, err.status || 500);
  }
}

/**
 * GET /api/patient/medical-history/recent
 * Returns latest 3 records
 */
export async function getRecentMedicalHistory(req, res) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return sendError(res, 'User id not found in token', 401);
    const data = await service.getRecentMedicalHistory(userId);
    return sendSuccess(res, data, 'Recent medical history fetched');
  } catch (err) {
    return sendError(res, err.message, err.status || 500);
  }
}

// ─── IoT Device ───────────────────────────────────────────────────────────────

/**
 * GET /api/patient/iot
 * Query: { page?, limit?, testType? }
 */
export async function getIotReadings(req, res) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return sendError(res, 'User id not found in token', 401);
    const data = await service.getIotReadings(userId, req.query);
    return sendSuccess(res, data, 'IoT readings fetched');
  } catch (err) {
    return sendError(res, err.message, err.status || 500);
  }
}

/**
 * GET /api/patient/iot/recent
 * Returns latest 3 readings
 */
export async function getRecentIotReadings(req, res) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return sendError(res, 'User id not found in token', 401);
    const data = await service.getRecentIotReadings(userId);
    return sendSuccess(res, data, 'Recent IoT readings fetched');
  } catch (err) {
    return sendError(res, err.message, err.status || 500);
  }
}

/**
 * GET /api/patient/iot/:id
 */
export async function getIotReadingById(req, res) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return sendError(res, 'User id not found in token', 401);
    const data = await service.getIotReadingById(userId, req.params.id);
    return sendSuccess(res, data, 'IoT reading fetched');
  } catch (err) {
    return sendError(res, err.message, err.status || 500);
  }
}

/**
 * POST /api/patient/iot
 * Body: { testType, sensorData, resultScore?, notes? }
 */
export async function submitIotTest(req, res) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return sendError(res, 'User id not found in token', 401);
    const data = await service.submitIotTest(userId, req.body);
    return sendSuccess(res, data, 'IoT test submitted successfully', 201);
  } catch (err) {
    return sendError(res, err.message, err.status || 500);
  }
}

// ─── Health Queries ───────────────────────────────────────────────────────────

/**
 * GET /api/patient/queries
 * Query: { page?, limit?, isResolved? }
 */
export async function getMyQueries(req, res) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return sendError(res, 'User id not found in token', 401);
    const data = await service.getMyQueries(userId, req.query);
    return sendSuccess(res, data, 'Queries fetched');
  } catch (err) {
    return sendError(res, err.message, err.status || 500);
  }
}

/**
 * GET /api/patient/queries/:id
 */
export async function getQueryDetails(req, res) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return sendError(res, 'User id not found in token', 401);
    const data = await service.getQueryDetails(userId, req.params.id);
    return sendSuccess(res, data, 'Query details fetched');
  } catch (err) {
    return sendError(res, err.message, err.status || 500);
  }
}

/**
 * POST /api/patient/queries
 * Body: { title, symptomText?, isAnonymous? }
 */
export async function createQuery(req, res) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return sendError(res, 'User id not found in token', 401);
    const data = await service.createQuery(userId, req.body);
    return sendSuccess(res, data, 'Query submitted successfully', 201);
  } catch (err) {
    return sendError(res, err.message, err.status || 500);
  }
}

/**
 * PATCH /api/patient/queries/:id
 * Body: { title?, symptomText?, isAnonymous? }
 */
export async function updateQuery(req, res) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return sendError(res, 'User id not found in token', 401);
    const data = await service.updateQuery(userId, req.params.id, req.body);
    return sendSuccess(res, data, 'Query updated');
  } catch (err) {
    return sendError(res, err.message, err.status || 500);
  }
}

/**
 * PATCH /api/patient/queries/:id/close
 * Marks query as resolved
 */
export async function closeQuery(req, res) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return sendError(res, 'User id not found in token', 401);
    const data = await service.closeQuery(userId, req.params.id);
    return sendSuccess(res, data, 'Query marked as resolved');
  } catch (err) {
    return sendError(res, err.message, err.status || 500);
  }
}

/**
 * DELETE /api/patient/queries/:id
 */
export async function deleteQuery(req, res) {
  try {
    const userId = getAuthUserId(req);
    if (!userId) return sendError(res, 'User id not found in token', 401);
    await service.deleteQuery(userId, req.params.id);
    return sendSuccess(res, {}, 'Query deleted');
  } catch (err) {
    return sendError(res, err.message, err.status || 500);
  }
}

// ─── Doctors (for booking) ────────────────────────────────────────────────────

/**
 * GET /api/patient/doctors
 * Query: { page?, limit?, specialty? }
 */
export async function getAvailableDoctors(req, res) {
  try {
    const data = await service.getAvailableDoctors(req.query);
    return sendSuccess(res, data, 'Available doctors fetched');
  } catch (err) {
    return sendError(res, err.message, err.status || 500);
  }
}

/**
 * GET /api/patient/doctors/:id
 */
export async function getDoctorById(req, res) {
  try {
    const data = await service.getDoctorById(req.params.id);
    return sendSuccess(res, data, 'Doctor profile fetched');
  } catch (err) {
    return sendError(res, err.message, err.status || 500);
  }
}

/**
 * GET /api/queries
 * Public listing of health queries (no auth required)
 */
export async function getPublicQueries(req, res) {
  try {
    const data = await service.getPublicQueries(req.query);
    return sendSuccess(res, data, 'Public queries fetched');
  } catch (err) {
    console.error('getPublicQueries error:', err);
    return sendError(res, err.message || err, err.status || 500);
  }
}

/**
 * GET /api/queries/:id
 * Public query details
 */
export async function getPublicQuery(req, res) {
  try {
    const data = await service.getPublicQueryById(req.params.id);
    return sendSuccess(res, data, 'Public query fetched');
  } catch (err) {
    console.error('getPublicQuery error:', err);
    return sendError(res, err.message || err, err.status || 500);
  }
}