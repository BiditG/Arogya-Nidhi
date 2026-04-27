import voiceAssistantService from '../services/voiceAssistant.service.js';

export async function startVoiceSession(req, res) {
  try {
    const result = await voiceAssistantService.startSession(req.body);
    return res.status(201).json({ success: true, ...result });
  } catch (error) {
    return res.status(error?.status || 500).json({
      success: false,
      message: error?.message || 'Server error',
    });
  }
}

export async function handleVoiceTranscript(req, res) {
  try {
    const result = await voiceAssistantService.processTranscript({
      sessionId: req.params.sessionId,
      ...req.body,
    });
    return res.status(200).json({ success: true, sessionId: req.params.sessionId, ...result });
  } catch (error) {
    return res.status(error?.status || 500).json({
      success: false,
      message: error?.message || 'Server error',
    });
  }
}

export async function getVoiceSessionStatus(req, res) {
  try {
    const result = voiceAssistantService.getSessionStatus(req.params.sessionId);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return res.status(error?.status || 500).json({
      success: false,
      message: error?.message || 'Server error',
    });
  }
}

export async function endVoiceSession(req, res) {
  try {
    const result = voiceAssistantService.endSession(req.params.sessionId);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return res.status(error?.status || 500).json({
      success: false,
      message: error?.message || 'Server error',
    });
  }
}
