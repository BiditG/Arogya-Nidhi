import express from "express";
import {
  appointmentCancel,
  appointmentComplete,
  appointmentsDoctor,
  doctorDashboard,
  doctorList,
  doctorProfile,
  loginDoctor,
  updateDoctorProfile,
} from "../controllers/doctorController.js";
import authDoctor from "../middlewares/authDoctor.js";
import { validate } from '../middlewares/validate.js';
import { loginDoctorSchema, updateDoctorProfileSchema, appointmentIdSchema } from '../validations/doctor.validation.js';
import * as doctorQueries from '../controllers/doctorQueries.controller.js';

const doctorRouter = express.Router();

doctorRouter.get("/list", doctorList);
doctorRouter.post("/login", validate(loginDoctorSchema), loginDoctor);
doctorRouter.get("/appointments", authDoctor, appointmentsDoctor);
doctorRouter.post("/complete-appointment", authDoctor, validate(appointmentIdSchema), appointmentComplete);
doctorRouter.post("/cancel-appointment", authDoctor, validate(appointmentIdSchema), appointmentCancel);
doctorRouter.get("/dashboard", authDoctor, doctorDashboard);
doctorRouter.get("/profile", authDoctor, doctorProfile);
doctorRouter.post("/update-profile", authDoctor, validate(updateDoctorProfileSchema), updateDoctorProfile);

// Doctor-facing patient queries
doctorRouter.get('/queries', authDoctor, doctorQueries.listQueries);
doctorRouter.get('/queries/:id', authDoctor, doctorQueries.getQuery);
doctorRouter.post('/queries/:id/responses', authDoctor, doctorQueries.createResponse);

export default doctorRouter;
