import express from "express";
import multer from "multer";
import { diagnose, assistant, endVoiceBrowserSession, processVoiceBrowserTurn, startVoiceBrowserSession } from "../controllers/aiController.js";
import { authenticate, requireRole } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { chatSchema, assistantChatSchema, voiceSessionIdSchema } from '../validations/ai.validation.js';


const router = express.Router();
const voiceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

router.post("/assistant", authenticate, requireRole('patient'), validate(assistantChatSchema), assistant);
router.post("/voice-browser/session/start", authenticate, requireRole('patient'), startVoiceBrowserSession);
router.post("/voice-browser/session/:sessionId/turn", authenticate, requireRole('patient'), voiceUpload.single('audio'), validate(voiceSessionIdSchema), processVoiceBrowserTurn);
router.delete("/voice-browser/session/:sessionId", authenticate, requireRole('patient'), validate(voiceSessionIdSchema), endVoiceBrowserSession);
router.post("/diagnose", validate(chatSchema), diagnose);

export default router;
