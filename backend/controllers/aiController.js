import aiAssistantService from '../services/aiAssistant.service.js';
import {
  endBrowserVoiceSession,
  processBrowserVoiceTurn,
  startBrowserVoiceSession,
} from '../services/voiceMedia.service.js';

export const diagnose = async (req, res) => {
  try {
    const { messages } = req.body;
    const last = messages?.slice(-1)[0];
    const reply = last?.text
      ? `Based on your symptoms: "${last.text.slice(0, 120)}" — please consult a doctor for a proper diagnosis. (AI integration coming soon)`
      : "Please describe your symptoms so I can help guide you.";

    res.json({ success: true, reply });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const assistant = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.sub || req.user?.id || null;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User id not found in token' });
    }

    const { message } = req.body;
    const result = await aiAssistantService.processMessage(userId, message);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return res.status(error?.status || 500).json({
      success: false,
      message: error?.message || 'Server error',
    });
  }
};

export const startVoiceBrowserSession = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.sub || req.user?.id || null;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User id not found in token' });
    }

    const result = await startBrowserVoiceSession(userId);
    return res.status(201).json({ success: true, ...result });
  } catch (error) {
    return res.status(error?.status || 500).json({
      success: false,
      message: error?.message || 'Server error',
    });
  }
};

export const processVoiceBrowserTurn = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.sub || req.user?.id || null;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User id not found in token' });
    }

    const file = req.file;
    const result = await processBrowserVoiceTurn(userId, req.params.sessionId, file);
    return res.status(200).json({ success: true, sessionId: req.params.sessionId, ...result });
  } catch (error) {
    return res.status(error?.status || 500).json({
      success: false,
      message: error?.message || 'Server error',
    });
  }
};

export const endVoiceBrowserSession = async (req, res) => {
  try {
    const result = endBrowserVoiceSession(req.params.sessionId);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return res.status(error?.status || 500).json({
      success: false,
      message: error?.message || 'Server error',
    });
  }
};
