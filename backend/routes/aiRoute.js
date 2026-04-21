import express from "express";
import { diagnose, assistant } from "../controllers/aiController.js";
import { authenticate, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { chatSchema, assistantChatSchema } from '../validations/ai.validation.js';


const router = express.Router();

router.post("/assistant", authenticate, requireRole('patient'), validate(assistantChatSchema), assistant);
router.post("/diagnose", validate(chatSchema), diagnose);

export default router;
