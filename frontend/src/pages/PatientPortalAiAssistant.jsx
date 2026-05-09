import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PatientSidebar from "../components/PatientSidebar";
import {
  SparklesIcon,
  UserIcon,
  CalendarDaysIcon,
  ClockIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  MicrophoneIcon,
  PhoneIcon,
  PhoneXMarkIcon,
  SpeakerWaveIcon,
} from "@heroicons/react/24/outline";
import axios from "axios";
import { toast } from "react-toastify";
import { Device } from "@twilio/voice-sdk";
import { AppContext } from "../context/AppContext";
import { supabase } from "../lib/supabaseClient";
import "./PatientPortalAiAssistant.css";

const INITIAL_MESSAGE = {
  id: 1,
  from: "ai",
  text:
    "I can book an appointment for you by text or voice. Tell me the specialty you need, and I'll guide you step by step until the booking is confirmed.",
};

const SPECIALTY_CHIPS = [
  { key: "Cardiology", label: "Cardiology" },
  { key: "Neurology", label: "Neurology" },
  { key: "Dermatology", label: "Dermatology" },
  { key: "Orthopedics", label: "Orthopedics" },
  { key: "Pediatrics", label: "Pediatrics" },
  { key: "General", label: "General" },
];

const STEP_PLACEHOLDERS = {
  specialty: "Type a specialty, for example Cardiology",
  doctor: "Type a doctor number or name",
  date: "Type a date like 2026-04-23, tomorrow, or today",
  time: "Type a time like 10:00 AM or 14:30",
  notes: "Type a note for the doctor or skip",
  confirm: "Type yes to confirm or no to change details",
  done: "Start a new booking anytime",
};

const VOICE_IDLE = "Call offline";
const VOICE_CONNECTING = "Connecting call...";
const VOICE_CONNECTED = "Live call active";
const VOICE_MUTED = "Call muted";

const SPEECH_LANGUAGES = [
  { value: "ne-NP", label: "Nepali" },
  { value: "en-US", label: "English" },
  { value: "hi-IN", label: "Hindi" },
];

const getSpeechRecognitionConstructor = () => {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

const hasDevanagariText = (text) => /[\u0900-\u097F]/.test(String(text || ""));

const PatientPortalAiAssistant = () => {
  const { setToken, backendUrl, token } = useContext(AppContext);
  const navigate = useNavigate();
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [bookingState, setBookingState] = useState({
    stage: "specialty",
    bookingPreview: null,
    booking: null,
  });
  const [voiceSessionId, setVoiceSessionId] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const [callMuted, setCallMuted] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [callStatus, setCallStatus] = useState(VOICE_IDLE);
  const [lastTranscript, setLastTranscript] = useState("");
  const [speechLanguage, setSpeechLanguage] = useState("ne-NP");
  const [listening, setListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [voiceSupported] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean(navigator?.mediaDevices?.getUserMedia);
  });
  const [speechSupported] = useState(() => Boolean(getSpeechRecognitionConstructor()));
  const [ttsSupported] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance);
  });
  const messagesContainerRef = useRef(null);
  const fallbackUtteranceRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const speechDraftRef = useRef("");
  const speechFinalRef = useRef("");
  const twilioDeviceRef = useRef(null);
  const twilioCallRef = useRef(null);
  const twilioPollTimerRef = useRef(null);
  const voiceEventCursorRef = useRef(0);
  const twilioAccessTokenRef = useRef(null);
  const voiceSessionIdRef = useRef(null);
  const callMutedRef = useRef(false);

  const assistantStatus = useMemo(() => {
    if (listening) return "Listening...";
    if (speakingMessageId) return "Reading aloud";
    if (sending || voiceBusy) return "Thinking...";
    if (bookingState.stage === "done") return "Booking complete";
    if (bookingState.stage === "confirm") return "Ready to confirm";
    if (bookingState.stage === "doctor") return "Choose a doctor";
    if (bookingState.stage === "date") return "Choose a date";
    if (bookingState.stage === "time") return "Choose a time";
    if (bookingState.stage === "notes") return "Add notes or skip";
    return "Ready to book";
  }, [bookingState.stage, listening, sending, speakingMessageId, voiceBusy]);

  const scrollToBottom = (behavior = "auto") => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
  };

  useEffect(() => {
    return () => {
      speechRecognitionRef.current?.abort?.();
      speechRecognitionRef.current = null;

      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      if (twilioPollTimerRef.current) {
        window.clearInterval(twilioPollTimerRef.current);
        twilioPollTimerRef.current = null;
      }

      twilioCallRef.current?.disconnect();
      twilioDeviceRef.current?.destroy();
      twilioCallRef.current = null;
      twilioDeviceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ttsSupported || typeof window === "undefined") return undefined;

    const loadVoices = () => {
      setAvailableVoices(window.speechSynthesis.getVoices());
    };

    loadVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", loadVoices);
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", loadVoices);
      if (window.speechSynthesis.onvoiceschanged === loadVoices) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [ttsSupported]);

  const getLiveToken = async () => {
    const { data: sessionData } = supabase ? await supabase.auth.getSession() : { data: null };
    return sessionData?.session?.access_token || token;
  };

  const pushAiMessage = (payload) => {
    const nextMessage = {
      id: Date.now() + Math.random(),
      from: "ai",
      text: payload.reply,
      actions: payload.actions || [],
      bookingPreview: payload.bookingPreview || null,
      booking: payload.booking || null,
      stage: payload.stage || "specialty",
    };

    setMessages((prev) => [...prev, nextMessage]);
    setBookingState({
      stage: payload.stage || "specialty",
      bookingPreview: payload.bookingPreview || null,
      booking: payload.booking || null,
    });
    setTimeout(() => scrollToBottom("smooth"), 50);
  };

  const pushUserMessage = (text) => {
    setMessages((prev) => [...prev, { id: Date.now() + Math.random(), from: "user", text }]);
    setTimeout(() => scrollToBottom("smooth"), 50);
  };

  const getSpeechLanguageForText = useCallback(
    (text) => (hasDevanagariText(text) ? "ne-NP" : speechLanguage),
    [speechLanguage]
  );

  const pickSpeechVoice = useCallback(
    (language) => {
      const lang = String(language || speechLanguage).toLowerCase();
      const base = lang.split("-")[0];
      const exact = availableVoices.find((voice) => voice.lang.toLowerCase() === lang);
      const sameBase = availableVoices.find((voice) => voice.lang.toLowerCase().startsWith(`${base}-`));
      const devanagariFallback =
        base === "ne" || base === "hi"
          ? availableVoices.find((voice) => voice.lang.toLowerCase().startsWith("hi"))
          : null;

      return (
        exact ||
        sameBase ||
        devanagariFallback ||
        availableVoices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ||
        null
      );
    },
    [availableVoices, speechLanguage]
  );

  const speakAssistantFallback = useCallback(
    (text, messageId = "assistant-reader") => {
      if (!text || !ttsSupported || typeof window === "undefined" || !window.speechSynthesis) {
        toast.error("Text to speech is not supported in this browser");
        return false;
      }

      if (speakingMessageId === messageId) {
        window.speechSynthesis.cancel();
        setSpeakingMessageId(null);
        return true;
      }

      window.speechSynthesis.cancel();
      const language = getSpeechLanguageForText(text);
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = pickSpeechVoice(language);

      utterance.lang = voice?.lang || language;
      utterance.voice = voice || null;
      utterance.rate = language.startsWith("ne") || language.startsWith("hi") ? 0.9 : 0.95;
      utterance.pitch = 1;
      utterance.onend = () => {
        setSpeakingMessageId((current) => (current === messageId ? null : current));
      };
      utterance.onerror = () => {
        setSpeakingMessageId((current) => (current === messageId ? null : current));
      };

      fallbackUtteranceRef.current = utterance;
      setSpeakingMessageId(messageId);
      window.speechSynthesis.speak(utterance);
      return true;
    },
    [getSpeechLanguageForText, pickSpeechVoice, speakingMessageId, ttsSupported]
  );

  const pushAssistantIfChanged = (payload) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.from === "ai" && last?.text === payload.reply) {
        return prev;
      }
      return [
        ...prev,
        {
          id: Date.now() + Math.random(),
          from: "ai",
          text: payload.reply,
          actions: payload.actions || [],
          bookingPreview: payload.bookingPreview || null,
          booking: payload.booking || null,
          stage: payload.stage || "specialty",
        },
      ];
    });

    setBookingState({
      stage: payload.stage || "specialty",
      bookingPreview: payload.bookingPreview || null,
      booking: payload.booking || null,
    });
    setTimeout(scrollToBottom, 50);
  };

  const handleSend = async (rawText = input) => {
    const text = String(rawText || "").trim();
    if (!text || sending || voiceBusy) return;

    const liveToken = await getLiveToken();

    if (!liveToken) {
      toast.error("Please log in again to use the AI assistant");
      navigate("/login");
      return;
    }

    pushUserMessage(text);
    setInput("");
    setSending(true);

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/ai/assistant`,
        { message: text },
        { headers: { Authorization: `Bearer ${liveToken}` } }
      );

      if (data?.success) {
        pushAiMessage(data);
      } else {
        toast.error(data?.message || "Failed to process assistant request");
      }
    } catch (err) {
      const message = err.response?.data?.message || "Failed to process assistant request";
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        setToken(false);
        setTimeout(() => navigate("/login"), 300);
      }
      toast.error(message);
      pushAiMessage({ reply: message, stage: bookingState.stage });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (listening) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (value) => {
    handleSend(value);
  };

  const stopSpeechInput = () => {
    const recognition = speechRecognitionRef.current;
    if (!recognition) return;

    try {
      recognition.stop();
    } catch {
      recognition.abort?.();
    }
  };

  const startSpeechInput = () => {
    if (sending || voiceBusy) return;

    if (callActive) {
      toast.info("End the live call before using the chat microphone");
      return;
    }

    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser");
      return;
    }

    if (speechRecognitionRef.current) {
      stopSpeechInput();
      return;
    }

    const recognition = new SpeechRecognition();
    speechFinalRef.current = "";
    speechDraftRef.current = "";

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }

    recognition.lang = speechLanguage;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalChunk = "";
      let interimChunk = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index]?.[0]?.transcript || "";
        if (event.results[index].isFinal) {
          finalChunk += ` ${transcript}`;
        } else {
          interimChunk += ` ${transcript}`;
        }
      }

      if (finalChunk) {
        speechFinalRef.current = `${speechFinalRef.current} ${finalChunk}`.replace(/\s+/g, " ").trim();
      }

      const combined = `${speechFinalRef.current} ${interimChunk}`.replace(/\s+/g, " ").trim();
      speechDraftRef.current = combined;
      setInput(combined);
      setLastTranscript(combined);
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        toast.error("Please allow microphone access to use speech input");
      } else if (event.error && event.error !== "no-speech" && event.error !== "aborted") {
        toast.error(`Speech input stopped: ${event.error}`);
      }
    };

    recognition.onend = () => {
      const spokenText = (speechFinalRef.current || speechDraftRef.current).replace(/\s+/g, " ").trim();
      speechRecognitionRef.current = null;
      speechFinalRef.current = "";
      speechDraftRef.current = "";
      setListening(false);

      if (spokenText) {
        setInput("");
        handleSend(spokenText);
      }
    };

    speechRecognitionRef.current = recognition;
    setListening(true);

    try {
      recognition.start();
    } catch {
      speechRecognitionRef.current = null;
      setListening(false);
      toast.error("Could not start speech recognition");
    }
  };

  const toggleSpeechInput = () => {
    if (listening) {
      stopSpeechInput();
      return;
    }

    startSpeechInput();
  };

  const appendVoiceEvent = (event) => {
    if (!event?.text) return;

    if (event.role === "user") {
      setLastTranscript(event.text);
      pushUserMessage(event.text);
      return;
    }

    if (event.role === "assistant") {
      pushAiMessage({
        reply: event.text,
        stage: event.stage || "specialty",
        actions: event.actions || [],
        bookingPreview: event.bookingPreview || null,
        booking: event.booking || null,
      });
    }
  };

  const pollVoiceEvents = async (liveToken, sessionId) => {
    const { data } = await axios.get(
      `${backendUrl}/api/twilio/voice/session/${sessionId}/events`,
      {
        params: { after: voiceEventCursorRef.current },
        headers: { Authorization: `Bearer ${liveToken}` },
      }
    );

    if (!data?.success) return;

    if (Array.isArray(data.events)) {
      data.events.forEach(appendVoiceEvent);
    }

    if (typeof data.nextCursor === "number") {
      voiceEventCursorRef.current = data.nextCursor;
    }
  };

  const startVoiceEventPolling = (liveToken, sessionId) => {
    if (twilioPollTimerRef.current) {
      window.clearInterval(twilioPollTimerRef.current);
    }

    const poll = async () => {
      try {
        await pollVoiceEvents(liveToken, sessionId);
      } catch {
        // Keep the call connected even if the transcript mirror misses a poll cycle.
      }
    };

    poll();
    twilioPollTimerRef.current = window.setInterval(poll, 1200);
  };

  const stopVoiceEventPolling = () => {
    if (twilioPollTimerRef.current) {
      window.clearInterval(twilioPollTimerRef.current);
      twilioPollTimerRef.current = null;
    }
  };

  const ensureTwilioDevice = async (accessToken) => {
    if (twilioDeviceRef.current && twilioAccessTokenRef.current === accessToken) {
      return twilioDeviceRef.current;
    }

    twilioDeviceRef.current?.destroy();

    const device = new Device(accessToken, {
      appName: "ArogyaNidhi",
      appVersion: "1.0.0",
      closeProtection: true,
    });

    device.on("error", (error) => {
      toast.error(error?.message || "Twilio call error");
    });

    twilioDeviceRef.current = device;
    twilioAccessTokenRef.current = accessToken;
    return device;
  };

  const cleanupVoiceCall = async (disconnectActiveCall = false) => {
    if (disconnectActiveCall) {
      twilioCallRef.current?.disconnect();
    }

    stopVoiceEventPolling();
    twilioCallRef.current = null;

    const sessionIdToDelete = voiceSessionIdRef.current;
    if (sessionIdToDelete) {
      try {
        const liveToken = await getLiveToken();
        if (liveToken) {
          await axios.delete(`${backendUrl}/api/twilio/voice/session/${sessionIdToDelete}`, {
            headers: { Authorization: `Bearer ${liveToken}` },
          });
        }
      } catch {
        // Ignore session cleanup failures during UI teardown.
      }
    }

    voiceSessionIdRef.current = null;
    callMutedRef.current = false;
    setVoiceSessionId(null);
    setCallActive(false);
    setCallMuted(false);
    setVoiceBusy(false);
    setCallStatus(VOICE_IDLE);
  };

  const startVoiceCall = async () => {
    if (!voiceSupported) {
      toast.error("Voice calling is not supported in this browser");
      return;
    }

    if (listening) {
      stopSpeechInput();
    }

    try {
      const liveToken = await getLiveToken();
      if (!liveToken) {
        toast.error("Please log in again to use voice booking");
        navigate("/login");
        return;
      }

      setVoiceBusy(true);
      setCallStatus(VOICE_CONNECTING);

      const { data } = await axios.post(
        `${backendUrl}/api/twilio/voice/token`,
        {},
        { headers: { Authorization: `Bearer ${liveToken}` } }
      );

      if (!data?.success || !data?.accessToken || !data?.sessionId) {
        throw new Error(data?.message || "Failed to initialize Twilio voice");
      }

      voiceEventCursorRef.current = 0;
      voiceSessionIdRef.current = data.sessionId;
      setVoiceSessionId(data.sessionId);
      setCallActive(true);

      const device = await ensureTwilioDevice(data.accessToken);
      const call = await device.connect({
        params: data.params || { portalSessionId: data.sessionId },
      });

      twilioCallRef.current = call;
      call.on("accept", () => {
        setCallStatus(callMutedRef.current ? VOICE_MUTED : VOICE_CONNECTED);
      });
      call.on("disconnect", () => {
        cleanupVoiceCall(false);
      });
      call.on("cancel", () => {
        cleanupVoiceCall(false);
      });
      call.on("error", (error) => {
        toast.error(error?.message || "Twilio call error");
        cleanupVoiceCall(false);
      });

      startVoiceEventPolling(liveToken, data.sessionId);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Failed to start voice call");
      setCallActive(false);
      setCallStatus(VOICE_IDLE);
    } finally {
      setVoiceBusy(false);
    }
  };

  const toggleMute = () => {
    const call = twilioCallRef.current;
    if (!call) return;

    const nextMuted = !callMutedRef.current;
    call.mute(nextMuted);
    callMutedRef.current = nextMuted;
    setCallMuted(nextMuted);
    setCallStatus(nextMuted ? VOICE_MUTED : VOICE_CONNECTED);
  };

  const endVoiceCall = async () => {
    try {
      await cleanupVoiceCall(true);
    } finally {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setSpeakingMessageId(null);
    }
  };

  const bookingPreview = bookingState.bookingPreview || {};
  const selectedDoctorLabel = bookingPreview.doctorName || bookingPreview.doctor_name || "-";
  const selectedSpecialty = bookingPreview.specialty || "-";
  const selectedDate = bookingPreview.date || "-";
  const selectedTime = bookingPreview.time || "-";
  const selectedNotes = bookingPreview.notes || "-";

  return (
    <div className="paa-page">
      <div className="paa-container">
        <PatientSidebar />

        <main className="paa-main-content">
          <Link to="/patient-portal" className="paa-back-link">
            Back to Dashboard
          </Link>

          <div className="paa-hero">
            <div>
              <h1 className="paa-page-title">AI Appointment Assistant</h1>
              <p className="paa-hero-text">
                Book a visit by text or voice. The assistant can take you through specialty, doctor, date, time, optional notes, and confirmation in a call-style flow.
              </p>
            </div>
            <div className="paa-status-pill">
              <SparklesIcon className="paa-status-icon" />
              <span>{assistantStatus}</span>
            </div>
          </div>

          <div className="paa-content-grid">
            <div className="paa-chat-container">
              <div className="paa-chat-header">
                <div className="paa-ai-avatar">
                  <SparklesIcon style={{ width: 20, height: 20 }} />
                </div>
                <div className="paa-ai-info">
                  <h3>Booking Assistant</h3>
                  <p>{callActive ? "Talk naturally through the live call" : "Book by text or voice"}</p>
                </div>
              </div>

              <div className="paa-call-panel">
                <div className="paa-call-status">
                  <PhoneIcon className="paa-call-status-icon" />
                  <div>
                    <div className="paa-call-status-title">Voice Call</div>
                    <div className="paa-call-status-text">{callStatus}</div>
                  </div>
                </div>
                <div className="paa-call-actions">
                  {!callActive ? (
                    <button
                      type="button"
                      className="paa-btn paa-btn-primary"
                      onClick={startVoiceCall}
                      disabled={!voiceSupported || voiceBusy || sending || listening}
                    >
                      <PhoneIcon className="paa-inline-icon" />
                      Start call
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={`paa-btn ${callMuted ? "paa-btn-danger" : "paa-btn-primary"}`}
                        onClick={toggleMute}
                        disabled={voiceBusy || sending}
                      >
                        <MicrophoneIcon className="paa-inline-icon" />
                        {callMuted ? "Unmute" : "Mute"}
                      </button>
                      <button
                        type="button"
                        className="paa-btn paa-btn-secondary"
                        onClick={endVoiceCall}
                        disabled={voiceBusy}
                      >
                        <PhoneXMarkIcon className="paa-inline-icon" />
                        End call
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="paa-chat-messages" ref={messagesContainerRef}>
                {messages.map((msg) => (
                  <div key={msg.id} className={`paa-message${msg.from === "user" ? " paa-message-user" : ""}`}>
                    <div className="paa-message-avatar">
                      {msg.from === "user" ? <UserIcon style={{ width: 14, height: 14 }} /> : <SparklesIcon style={{ width: 14, height: 14 }} />}
                    </div>
                    <div className="paa-message-content">
                      <div className="paa-message-text-row">
                        <div className="paa-message-text">{msg.text}</div>
                        {msg.from === "ai" && (
                          <button
                            type="button"
                            className={`paa-icon-button${speakingMessageId === msg.id ? " paa-icon-button-active" : ""}`}
                            onClick={() => speakAssistantFallback(msg.text, msg.id)}
                            disabled={!ttsSupported || listening}
                            title={speakingMessageId === msg.id ? "Stop reading" : "Read response aloud"}
                            aria-label={speakingMessageId === msg.id ? "Stop reading response" : "Read AI response aloud"}
                          >
                            <SpeakerWaveIcon className="paa-inline-icon" />
                          </button>
                        )}
                      </div>
                      {Array.isArray(msg.actions) && msg.actions.length > 0 && (
                        <div className="paa-message-actions">
                          {msg.actions.map((action, index) => (
                            <button
                              key={`${action.type || "action"}-${index}-${action.value}`}
                              type="button"
                              className="paa-action-chip"
                              onClick={() => handleQuickAction(action.value)}
                              disabled={sending || voiceBusy}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                      {msg.stage === "done" && msg.booking && (
                        <div className="paa-success-card">
                          <CheckCircleIcon className="paa-success-icon" />
                          <div>
                            <div className="paa-success-title">Appointment booked</div>
                            <div className="paa-success-subtitle">You can review it in your patient dashboard.</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {(sending || voiceBusy) && (
                  <div className="paa-message">
                    <div className="paa-message-avatar">
                      <SparklesIcon style={{ width: 14, height: 14 }} />
                    </div>
                    <div className="paa-message-content">{voiceBusy ? callStatus : "Thinking..."}</div>
                  </div>
                )}
              </div>

              <div className="paa-chat-input-container">
                <button
                  type="button"
                  className={`paa-icon-button paa-input-icon-button${listening ? " paa-icon-button-active" : ""}`}
                  onClick={toggleSpeechInput}
                  disabled={!speechSupported || sending || voiceBusy || callActive}
                  title={listening ? "Stop listening" : "Speak message"}
                  aria-label={listening ? "Stop speech input" : "Start speech input"}
                >
                  <MicrophoneIcon className="paa-inline-icon" />
                </button>
                <input
                  type="text"
                  className="paa-chat-input"
                  placeholder={listening ? "Listening..." : STEP_PLACEHOLDERS[bookingState.stage] || STEP_PLACEHOLDERS.specialty}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending || voiceBusy}
                />
                <button
                  type="button"
                  className="paa-btn paa-btn-primary"
                  onClick={() => handleSend()}
                  disabled={sending || voiceBusy || listening || !input.trim()}
                >
                  {sending ? "..." : "Send"}
                </button>
              </div>
            </div>

            <div className="paa-side-panel-group">
              <div className="paa-panel">
                <h3 className="paa-panel-title">Voice Tools</h3>
                <div className="paa-voice-card">
                  <div className="paa-voice-card-row">
                    <span className="paa-summary-label">Chat mic</span>
                    <span className="paa-summary-value">{speechSupported ? (listening ? "Listening" : "Ready") : "Not supported"}</span>
                  </div>
                  <div className="paa-voice-card-row">
                    <span className="paa-summary-label">Reader</span>
                    <span className="paa-summary-value">{ttsSupported ? (speakingMessageId ? "Speaking" : "Ready") : "Not supported"}</span>
                  </div>
                  <div className="paa-voice-card-row">
                    <label className="paa-summary-label" htmlFor="paa-speech-language">Language</label>
                    <select
                      id="paa-speech-language"
                      className="paa-language-select"
                      value={speechLanguage}
                      onChange={(event) => setSpeechLanguage(event.target.value)}
                      disabled={listening}
                    >
                      {SPEECH_LANGUAGES.map((language) => (
                        <option key={language.value} value={language.value}>
                          {language.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="paa-voice-card-row">
                    <span className="paa-summary-label">Call mic</span>
                    <span className="paa-summary-value">{voiceSupported ? "Ready" : "Not supported"}</span>
                  </div>
                  <div className="paa-voice-card-row">
                    <span className="paa-summary-label">Call state</span>
                    <span className="paa-summary-value">{callStatus}</span>
                  </div>
                  <div className="paa-voice-card-row">
                    <span className="paa-summary-label">Last transcript</span>
                    <span className="paa-summary-value paa-summary-transcript">{lastTranscript || "-"}</span>
                  </div>
                  <div className="paa-voice-hint">
                    <SpeakerWaveIcon className="paa-step-icon" />
                    <span>Use the mic beside the message box, or start the live call when Twilio is available.</span>
                  </div>
                </div>
              </div>

              <div className="paa-panel">
                <h3 className="paa-panel-title">Quick Start</h3>
                <p className="paa-panel-note">
                  Pick a specialty to start. The assistant will then guide you through doctor, date, time, and confirmation.
                </p>
                <div className="paa-chip-grid">
                  {SPECIALTY_CHIPS.map((chip) => (
                    <button
                      key={chip.key}
                      type="button"
                      className="paa-quick-action-btn"
                      onClick={() => handleQuickAction(chip.key)}
                      disabled={sending || voiceBusy}
                    >
                      {chip.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="paa-quick-action-btn paa-quick-action-danger"
                    onClick={() => handleQuickAction("restart")}
                    disabled={sending || voiceBusy}
                  >
                    Start over
                  </button>
                </div>
              </div>

              <div className="paa-panel">
                <h3 className="paa-panel-title">Current Booking</h3>
                <div className="paa-summary-card">
                  <div className="paa-summary-row">
                    <span className="paa-summary-label">Specialty</span>
                    <span className="paa-summary-value">{selectedSpecialty}</span>
                  </div>
                  <div className="paa-summary-row">
                    <span className="paa-summary-label">Doctor</span>
                    <span className="paa-summary-value">{selectedDoctorLabel}</span>
                  </div>
                  <div className="paa-summary-row">
                    <span className="paa-summary-label">Date</span>
                    <span className="paa-summary-value">{selectedDate}</span>
                  </div>
                  <div className="paa-summary-row">
                    <span className="paa-summary-label">Time</span>
                    <span className="paa-summary-value">{selectedTime}</span>
                  </div>
                  <div className="paa-summary-row">
                    <span className="paa-summary-label">Notes</span>
                    <span className="paa-summary-value">{selectedNotes}</span>
                  </div>
                </div>
              </div>

              <div className="paa-panel">
                <h3 className="paa-panel-title">How It Works</h3>
                <div className="paa-step-list">
                  <div className="paa-step-item">
                    <CalendarDaysIcon className="paa-step-icon" />
                    <span>Choose a specialty</span>
                  </div>
                  <div className="paa-step-item">
                    <ClipboardDocumentListIcon className="paa-step-icon" />
                    <span>Select a doctor</span>
                  </div>
                  <div className="paa-step-item">
                    <ClockIcon className="paa-step-icon" />
                    <span>Pick date and time</span>
                  </div>
                  <div className="paa-step-item">
                    <CheckCircleIcon className="paa-step-icon" />
                    <span>Confirm booking</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PatientPortalAiAssistant;
