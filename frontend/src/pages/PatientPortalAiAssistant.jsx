import { useContext, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PatientSidebar from "../components/PatientSidebar";
import {
  SparklesIcon,
  UserIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ClockIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../context/AppContext";
import { supabase } from "../lib/supabaseClient";
import "./PatientPortalAiAssistant.css";

const INITIAL_MESSAGE = {
  id: 1,
  from: "ai",
  text:
    "I can book an appointment for you by text. Tell me the specialty you need, and I’ll guide you step by step until the booking is confirmed.",
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

const PatientPortalAiAssistant = () => {
  const { setToken, backendUrl, token, userData } = useContext(AppContext);
  const navigate = useNavigate();
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [bookingState, setBookingState] = useState({
    stage: "specialty",
    bookingPreview: null,
    booking: null,
  });
  const messagesEndRef = useRef(null);

  const patientName = userData?.name || userData?.user?.name || "Patient";

  const assistantStatus = useMemo(() => {
    if (sending) return "Thinking...";
    if (bookingState.stage === "done") return "Booking complete";
    if (bookingState.stage === "confirm") return "Ready to confirm";
    if (bookingState.stage === "doctor") return "Choose a doctor";
    if (bookingState.stage === "date") return "Choose a date";
    if (bookingState.stage === "time") return "Choose a time";
    if (bookingState.stage === "notes") return "Add notes or skip";
    return "Ready to book";
  }, [bookingState.stage, sending]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(false);
    navigate("/login");
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
    setTimeout(scrollToBottom, 50);
  };

  const handleSend = async (rawText = input) => {
    const text = String(rawText || "").trim();
    if (!text || sending) return;

    const { data: sessionData } = supabase ? await supabase.auth.getSession() : { data: null };
    const liveToken = sessionData?.session?.access_token || token;

    if (!liveToken) {
      toast.error("Please log in again to use the AI assistant");
      navigate("/login");
      return;
    }

    const userMsg = { id: Date.now(), from: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);
    setTimeout(scrollToBottom, 50);

    try {
      const { data } = await axios.post(
        backendUrl + "/api/ai/assistant",
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
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          from: "ai",
          text: message,
        },
      ]);
      setTimeout(scrollToBottom, 50);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (value) => {
    handleSend(value);
  };

  const bookingPreview = bookingState.bookingPreview || {};
  const selectedDoctorLabel = bookingPreview.doctorName || bookingPreview.doctor_name || "—";
  const selectedSpecialty = bookingPreview.specialty || "—";
  const selectedDate = bookingPreview.date || "—";
  const selectedTime = bookingPreview.time || "—";
  const selectedNotes = bookingPreview.notes || "—";

  return (
    <div className="paa-page">
      <header className="paa-header">
        <Link to="/patient-portal" className="paa-logo">
          PATIENT PORTAL
        </Link>

        <nav>
          <ul className="paa-nav-top">
            <li>
              <Link to="/patient-portal">Dashboard</Link>
            </li>
            <li>
              <Link to="/patient-portal/profile">Profile</Link>
            </li>
            <li>
              <a href="#">Settings</a>
            </li>
            <li>
              <button type="button" className="paa-link-button" onClick={handleLogout}>
                Logout
              </button>
            </li>
          </ul>
        </nav>
      </header>

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
                Book a visit by text. The assistant will ask for the specialty, doctor, date, time, and optional notes before confirming the appointment.
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
                  <p>{sending ? "Thinking..." : "Ask me to book an appointment by text"}</p>
                </div>
              </div>

              <div className="paa-chat-messages">
                {messages.map((msg) => (
                  <div key={msg.id} className={`paa-message${msg.from === "user" ? " paa-message-user" : ""}`}>
                    <div className="paa-message-avatar">
                      {msg.from === "user" ? <UserIcon style={{ width: 14, height: 14 }} /> : <SparklesIcon style={{ width: 14, height: 14 }} />}
                    </div>
                    <div className="paa-message-content">
                      <div>{msg.text}</div>
                      {Array.isArray(msg.actions) && msg.actions.length > 0 && (
                        <div className="paa-message-actions">
                          {msg.actions.map((action, index) => (
                            <button
                              key={`${action.type || 'action'}-${index}-${action.value}`}
                              type="button"
                              className="paa-action-chip"
                              onClick={() => handleQuickAction(action.value)}
                              disabled={sending}
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
                {sending && (
                  <div className="paa-message">
                    <div className="paa-message-avatar">
                      <SparklesIcon style={{ width: 14, height: 14 }} />
                    </div>
                    <div className="paa-message-content">Thinking...</div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="paa-chat-input-container">
                <input
                  type="text"
                  className="paa-chat-input"
                  placeholder={STEP_PLACEHOLDERS[bookingState.stage] || STEP_PLACEHOLDERS.specialty}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                />
                <button
                  type="button"
                  className="paa-btn paa-btn-primary"
                  onClick={() => handleSend()}
                  disabled={sending || !input.trim()}
                >
                  {sending ? "..." : "Send"}
                </button>
              </div>
            </div>

            <div className="paa-side-panel-group">
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
                      disabled={sending}
                    >
                      {chip.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="paa-quick-action-btn paa-quick-action-danger"
                    onClick={() => handleQuickAction("restart")}
                    disabled={sending}
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
