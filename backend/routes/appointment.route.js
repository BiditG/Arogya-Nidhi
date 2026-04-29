
import express from "express";
import {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointment,
} from "../controllers/appointment.controller.js";
import { validate } from "../middlewares/validate.js";
import {
  createAppointmentSchema,
  updateAppointmentSchema,
} from "../validations/appointment.validation.js";
import { authenticate } from "../middlewares/auth.js";
import authDoctor from "../middlewares/authDoctor.js";

const router = express.Router();

router.post("/", authenticate, validate(createAppointmentSchema), createAppointment);
router.get("/", authenticate, getAppointments);
router.get("/:id", authenticate, getAppointmentById);
router.patch("/:id", authenticate, validate(updateAppointmentSchema), updateAppointment);

export default router;
