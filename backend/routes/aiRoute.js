import express from "express";
import { diagnose, assistant, generateDiagnosticCase, diagnosticReply, diagnosticEvaluate, diagnosticReveal } from "../controllers/aiController.js";
import { authenticate, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { chatSchema, assistantChatSchema, diagnosticCaseSchema, diagnosticReplySchema, diagnosticEvaluateSchema, diagnosticRevealSchema } from '../validations/ai.validation.js';

const router = express.Router();

router.post("/assistant", authenticate, requireRole('patient'), validate(assistantChatSchema), assistant);
router.post("/diagnose", validate(chatSchema), diagnose);
router.post("/diagnostic/case", validate(diagnosticCaseSchema), generateDiagnosticCase);
router.post("/diagnostic/reply", validate(diagnosticReplySchema), diagnosticReply);
router.post("/diagnostic/evaluate", validate(diagnosticEvaluateSchema), diagnosticEvaluate);
router.post("/diagnostic/reveal", validate(diagnosticRevealSchema), diagnosticReveal);

export default router;
