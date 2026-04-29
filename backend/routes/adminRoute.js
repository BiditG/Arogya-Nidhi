import express from "express";
import {
  addDoctor,
  adminDashboard,
  appointmentCancelAdmin,
  appointmentsAdmin,
  getAllDoctors,
  loginAdmin,
  getAllUsers,
  addUser,
  updateUser,
  deleteUser,
  verifyDoctor,
} from "../controllers/adminController.js";
import upload from "../middlewares/multer.js";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { changeAvailability } from "../controllers/doctorController.js";
import { validate } from '../middlewares/validate.js';
import { addDoctorSchema, loginAdminSchema, appointmentIdSchema } from '../validations/admin.validation.js';
import { changeAvailabilitySchema } from '../validations/doctor.validation.js';

const adminRouter = express.Router();

// Route to add a doctor
adminRouter.post(
  "/add-doctor",
  authenticate,
  requireRole('admin'),
  upload.single("image"),
  validate(addDoctorSchema),
  addDoctor
);
adminRouter.post("/login", validate(loginAdminSchema), loginAdmin);
adminRouter.get("/all-doctors", authenticate, requireRole('admin'), getAllDoctors);
adminRouter.post(
  "/change-availability",
  authenticate,
  requireRole('admin'),
  validate(changeAvailabilitySchema),
  changeAvailability
);
adminRouter.get("/appointments", authenticate, requireRole('admin'), appointmentsAdmin);
adminRouter.post(
  "/cancel-appointment",
  authenticate,
  requireRole('admin'),
  validate(appointmentIdSchema),
  appointmentCancelAdmin
);
adminRouter.get("/dashboard", authenticate, requireRole('admin'), adminDashboard);

// User Management Routes
adminRouter.get("/all-users", authenticate, requireRole('admin'), getAllUsers);
adminRouter.post("/add-user", authenticate, requireRole('admin'), addUser);
adminRouter.put("/update-user/:id", authenticate, requireRole('admin'), updateUser);
adminRouter.delete("/delete-user/:id", authenticate, requireRole('admin'), deleteUser);
adminRouter.post("/verify-doctor", authenticate, requireRole('admin'), verifyDoctor);

export default adminRouter;
