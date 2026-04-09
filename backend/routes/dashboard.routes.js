import { Router } from 'express';
import * as ctrl from '../controllers/dashboard.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
    bookAppointmentSchema,
    rescheduleAppointmentSchema,
    getAllAppointmentsSchema,
    submitIotTestSchema,
    getIotReadingsSchema,
    createQuerySchema,
    updateQuerySchema,
    getQueriesSchema,
    getDoctorsSchema,
} from '../validations/dashboard.validation.js';

const router = Router();

// All routes require auth + patient role
router.use(authenticate);
router.use(requireRole('patient'));

// ─── Dashboard ────────────────────────────────────────────────────────────────
// GET  /api/patient/dashboard               → health score, stats, prescriptions
// GET  /api/patient/dashboard/quick-actions → upcoming appts, history, iot (3 each)

router.get('/dashboard', ctrl.getOverview);
router.get('/dashboard/quick-actions', ctrl.getQuickActionsData);

// ─── Appointments ─────────────────────────────────────────────────────────────
// GET    /api/patient/appointments            → all appointments (filterable by status)
// GET    /api/patient/appointments/upcoming   → only upcoming
// GET    /api/patient/appointments/:id        → details
// POST   /api/patient/appointments            → book
// PATCH  /api/patient/appointments/:id/cancel     → cancel
// PATCH  /api/patient/appointments/:id/reschedule → reschedule

router.get('/appointments', validate(getAllAppointmentsSchema), ctrl.getAllAppointments);
router.get('/appointments/upcoming', ctrl.getUpcomingAppointments);
router.get('/appointments/:id', ctrl.getAppointmentDetails);
router.post('/appointments', validate(bookAppointmentSchema), ctrl.bookAppointment);
router.patch('/appointments/:id/cancel', ctrl.cancelAppointment);
router.patch('/appointments/:id/reschedule', validate(rescheduleAppointmentSchema), ctrl.rescheduleAppointment);

// ─── Medical History ──────────────────────────────────────────────────────────
// GET  /api/patient/medical-history          → full paginated list
// GET  /api/patient/medical-history/recent   → latest 3

router.get('/medical-history', ctrl.getMedicalHistory);
router.get('/medical-history/recent', ctrl.getRecentMedicalHistory);

// ─── IoT Device ───────────────────────────────────────────────────────────────
// GET   /api/patient/iot          → all readings (filterable by testType)
// GET   /api/patient/iot/recent   → latest 3
// GET   /api/patient/iot/:id      → single reading
// POST  /api/patient/iot          → submit test

router.get('/iot', validate(getIotReadingsSchema), ctrl.getIotReadings);
router.get('/iot/recent', ctrl.getRecentIotReadings);
router.get('/iot/:id', ctrl.getIotReadingById);
router.post('/iot', validate(submitIotTestSchema), ctrl.submitIotTest);

// ─── Health Queries ───────────────────────────────────────────────────────────
// GET    /api/patient/queries            → all queries (filterable by isResolved)
// GET    /api/patient/queries/:id        → details + responses
// POST   /api/patient/queries            → create
// PATCH  /api/patient/queries/:id        → edit (only unresolved)
// PATCH  /api/patient/queries/:id/close  → mark resolved
// DELETE /api/patient/queries/:id        → delete (only unresolved)

router.get('/queries', validate(getQueriesSchema), ctrl.getMyQueries);
router.get('/queries/:id', ctrl.getQueryDetails);
router.post('/queries', validate(createQuerySchema), ctrl.createQuery);
router.patch('/queries/:id', validate(updateQuerySchema), ctrl.updateQuery);
router.patch('/queries/:id/close', ctrl.closeQuery);
router.delete('/queries/:id', ctrl.deleteQuery);

// ─── Doctors (for booking) ────────────────────────────────────────────────────
// GET  /api/patient/doctors       → list available verified doctors
// GET  /api/patient/doctors/:id   → doctor profile

router.get('/doctors', validate(getDoctorsSchema), ctrl.getAvailableDoctors);
router.get('/doctors/:id', ctrl.getDoctorById);

export default router;