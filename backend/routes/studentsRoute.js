import express from "express";
import { getMCQs, getMetadata, recordProgress } from "../controllers/studentsController.js";
import { getProgressSummary } from "../controllers/studentsController.js";
import { validate } from '../middlewares/validate.js';
import { getQuestionsSchema, postProgressSchema } from '../validations/student.validation.js';
import { authenticate, requireRole } from '../middlewares/auth.js';
import { getPublicQueries, getPublicQuery } from '../controllers/dashboard.controller.js';

const router = express.Router();

router.get("/mcqs", validate(getQuestionsSchema), getMCQs);
router.get("/metadata", getMetadata);
router.get("/queries", authenticate, requireRole('student'), getPublicQueries);
router.get("/queries/:id", authenticate, requireRole('student'), getPublicQuery);

// student progress summary
router.get('/progress', authenticate, requireRole('student'), getProgressSummary);

// record progress: authenticated students only
router.post('/progress', authenticate, requireRole('student'), validate(postProgressSchema), recordProgress);

export default router;
