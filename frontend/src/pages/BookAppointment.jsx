import { useContext, useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import PatientSidebar from "../components/PatientSidebar";
import {
  HeartIcon,
  BoltIcon,
  SparklesIcon,
  WrenchScrewdriverIcon,
  FaceSmileIcon,
  UserIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../context/AppContext";
import "./BookAppointment.css";

const SPECIALTIES = [
  { key: "Cardiology",    label: "Cardiologist",     Icon: HeartIcon,             desc: "Heart and cardiovascular care" },
  { key: "Neurology",    label: "Neurologist",       Icon: BoltIcon,              desc: "Brain and nervous system" },
  { key: "Dermatology",  label: "Dermatologist",     Icon: SparklesIcon,          desc: "Skin conditions and care" },
  { key: "Orthopedics",  label: "Orthopedic",        Icon: WrenchScrewdriverIcon, desc: "Bones and joints" },
  { key: "Pediatrics",   label: "Pediatrician",      Icon: FaceSmileIcon,         desc: "Child healthcare" },
  { key: "General",      label: "General Physician", Icon: UserIcon,              desc: "Primary care and checkups" },
];

const TIME_SLOTS = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"];

const BookAppointment = () => {
  const { backendUrl, token, doctors: allDoctors } = useContext(AppContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [selectedSpecialty, setSelectedSpecialty] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [patientNotes, setPatientNotes] = useState("");
  const [symptomText, setSymptomText] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [gettingAi, setGettingAi] = useState(false);
  const [booking, setBooking] = useState(false);

  const getDoctorSpecialty = (doc) =>
    doc?.specialty || doc?.specialization || doc?.speciality || selectedSpecialty;

  const getDoctorExperience = (doc) =>
    doc?.experienceYears ?? doc?.experience_years ?? doc?.experience ?? null;

  const isDoctorAvailable = (doc) =>
    doc?.isAvailable ?? doc?.is_available ?? doc?.available ?? false;

  const headers = { Authorization: `Bearer ${token}` };

  // If a doctorId is provided via query param, pre-select that doctor (if available)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qDoctorId = params.get("doctorId") || params.get("doctor_id");
    if (!qDoctorId) return;

    const found = (allDoctors || []).find((d) => {
      const id = d?.id || d?._id || d?.doctor_id || d?.user_id || d?.user?.id || d?.doctorId;
      return id && id.toString() === qDoctorId.toString();
    });
    if (found) {
      const sp = getDoctorSpecialty(found) || selectedSpecialty;
      if (sp) setSelectedSpecialty(sp);
      setSelectedDoctor({ ...found, id: found?.id || found?._id || found?.doctor_id });
    }
  }, [location.search, allDoctors]);

  // Build calendar days for current month
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  useEffect(() => {
    if (!selectedSpecialty) return;

    const normalize = (list) =>
      (list || [])
        .map((doc) => ({
          ...doc,
          id: doc?.id || doc?._id || doc?.doctorId || doc?.doctor_id || null,
        }))
        .filter((doc) => !!doc.id);

    const filterBySpecialty = (list) =>
      normalize(list).filter((doc) =>
        (doc.specialty || doc.speciality || "")
          .toLowerCase()
          .includes(selectedSpecialty.toLowerCase())
      );

    // Prefer locally cached doctors to ensure accurate filtering
    if (Array.isArray(allDoctors) && allDoctors.length > 0) {
      setDoctors(filterBySpecialty(allDoctors));
      return;
    }

    const fetchDoctors = async () => {
      setLoadingDoctors(true);
      setSelectedDoctor(null);
      try {
        const { data } = await axios.get(
          backendUrl + `/api/patient/doctors?specialty=${encodeURIComponent(selectedSpecialty)}`,
          { headers }
        );
        const list = Array.isArray(data?.data) ? data.data : data?.data?.doctors || data?.doctors || [];
        setDoctors(filterBySpecialty(list));
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load doctors");
      } finally {
        setLoadingDoctors(false);
      }
    };

    fetchDoctors();
  }, [selectedSpecialty, backendUrl, token, allDoctors]);

  const handleGetAiRecommendation = async () => {
    if (!symptomText.trim()) return;
    setGettingAi(true);
    try {
      const { data } = await axios.post(backendUrl + "/api/ai/diagnose", {
        messages: [{ text: symptomText }],
      });
      if (data.success) setAiSuggestion(data.reply);
    } catch (err) {
      toast.error("Failed to get AI recommendation");
    } finally {
      setGettingAi(false);
    }
  };

  const handleBookNow = async () => {
    if (!selectedDoctor) return toast.error("Please select a doctor");
    if (!selectedDate) return toast.error("Please select a date");
    if (!selectedTime) return toast.error("Please select a time slot");

    const doctorId =
      selectedDoctor?.user_id ||
      selectedDoctor?.userId ||
      selectedDoctor?.doctor_id ||
      selectedDoctor?.doctorId ||
      selectedDoctor?.id ||
      selectedDoctor?._id ||
      null;

    if (!doctorId || doctorId === "undefined") {
      return toast.error("Selected doctor is invalid. Please re-select a doctor.");
    }

    const appointmentDate = new Date(year, month, selectedDate);
    if (appointmentDate <= new Date() && selectedTime < new Date().toTimeString().slice(0,5)) {
      return toast.error("Please select a future date and time");
    }

    setBooking(true);
    try {
      const appointmentDateOnly = appointmentDate.toISOString().split("T")[0];
      const { data } = await axios.post(
        `${backendUrl}/api/appointments`,
        {
          doctor_id: doctorId,
          appointment_date: appointmentDateOnly,
          appointment_time: selectedTime,
          reason: patientNotes || null,
        },
        { headers }
      );
      
      toast.success("Appointment booked successfully! Proceeding to payment.");
      navigate(`/payment/${data.id}`);
      
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to book appointment");
    } finally {
      setBooking(false);
    }
  };

  const doctorInitials = (name = "") =>
    name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "D";

  const step =
    !selectedSpecialty ? 1
    : !selectedDoctor ? 1
    : !selectedDate || !selectedTime ? 2
    : 3;

  return (
    <div className="ba-page">
      <div className="ba-container">
        <PatientSidebar />

        <main className="ba-main-content">
          <Link to="/patient-portal" className="ba-back-link">
            <ArrowLeftIcon style={{ width: 16, height: 16 }} /> Back to Dashboard
          </Link>

          <h1 className="ba-page-title">Book Appointment</h1>

          <div className="ba-progress-container">
            <div className="ba-progress-steps">
              <div className={`ba-step ${step >= 1 ? "ba-step-active" : ""}`}>
                <div className="ba-step-number">1</div>
                <div className="ba-step-label">Select Specialist</div>
              </div>
              <div className={`ba-step ${step >= 2 ? "ba-step-active" : ""}`}>
                <div className="ba-step-number">2</div>
                <div className="ba-step-label">Choose Date and Time</div>
              </div>
              <div className={`ba-step ${step >= 3 ? "ba-step-active" : ""}`}>
                <div className="ba-step-number">3</div>
                <div className="ba-step-label">Confirmation</div>
              </div>
            </div>
          </div>

          <div className="ba-symptom-checker">
            <h2 className="ba-section-header">AI Health Assistant - Symptom Checker</h2>

            <div className="ba-form-group">
              <label className="ba-form-label">Describe your symptoms (optional)</label>
              <textarea
                className="ba-form-textarea"
                placeholder="e.g., I have been experiencing headaches and dizziness for the past 3 days..."
                value={symptomText}
                onChange={(e) => setSymptomText(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="ba-btn ba-btn-primary"
              onClick={handleGetAiRecommendation}
              disabled={gettingAi || !symptomText.trim()}
            >
              {gettingAi ? "Thinking..." : "Get AI Recommendation"}
            </button>

            {aiSuggestion && (
              <div className="ba-ai-suggestion">
                <div className="ba-ai-suggestion-label">AI Suggestion:</div>
                <div className="ba-ai-suggestion-text">{aiSuggestion}</div>
              </div>
            )}
          </div>

          <section className="ba-specialist-section">
            <h2 className="ba-section-title">Select Specialist</h2>

            <div className="ba-specialist-grid">
              {SPECIALTIES.map((s) => (
                <div
                  key={s.key}
                  className={`ba-specialist-card ${selectedSpecialty === s.key ? "ba-specialist-selected" : ""}`}
                >
                  <div className="ba-specialist-icon"><s.Icon style={{ width: 22, height: 22 }} /></div>
                  <div className="ba-specialist-name">{s.label}</div>
                  <div className="ba-specialist-desc">{s.desc}</div>
                  <button
                    type="button"
                    className="ba-btn-select"
                    onClick={() => setSelectedSpecialty(s.key)}
                  >
                    {selectedSpecialty === s.key ? "Selected" : "Select"}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {selectedSpecialty && (
            <section className="ba-doctors-section">
              <h2 className="ba-section-title">Available Doctors</h2>

              {loadingDoctors ? (
                <div className="ba-doctor-card">
                  <div className="ba-doctor-info">
                    <div className="ba-doctor-name">Loading doctors...</div>
                  </div>
                </div>
              ) : doctors.length === 0 ? (
                <div className="ba-doctor-card">
                  <div className="ba-doctor-info">
                    <div className="ba-doctor-name">No doctors available for this specialty</div>
                  </div>
                </div>
              ) : (
                doctors.map((doc) => {
                  const name = doc.user?.name || doc.name || "Doctor";
                  const isSelected = selectedDoctor?.id === doc.id;
                  const specialty = getDoctorSpecialty(doc);
                  const experience = getDoctorExperience(doc);
                  const available = isDoctorAvailable(doc);
                  const imgSrc =
                    doc.user?.profile_image ||
                    doc.user?.avatar_url ||
                    doc.user?.avatarUrl ||
                    doc.users?.avatar_url ||
                    doc.profile_image ||
                    doc.avatar_url ||
                    doc.avatarUrl ||
                    doc.image ||
                    null;
                  return (
                    <div key={doc.id} className={`ba-doctor-card${isSelected ? " ba-specialist-selected" : ""}`}>
                      <div className="ba-doctor-avatar">
                        {imgSrc ? (
                          <img
                            src={imgSrc}
                            alt={name}
                            className="ba-doctor-avatar-img"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              e.currentTarget.nextElementSibling.style.display = "";
                            }}
                          />
                        ) : null}
                        <span style={{ display: imgSrc ? "none" : "" }}>
                          {doctorInitials(name)}
                        </span>
                      </div>
                      <div className="ba-doctor-info">
                        <div className="ba-doctor-name">Dr. {name}</div>
                        <div className="ba-doctor-specialty">
                          {specialty}
                          {experience ? ` · ${experience} years experience` : ""}
                        </div>
                        <div className="ba-doctor-meta">
                          {doc.rating != null && <span>Rating {doc.rating}</span>}
                          {available ? <span>Available</span> : <span>Unavailable</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="ba-btn-book"
                        onClick={() => setSelectedDoctor(doc)}
                        disabled={!available}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </button>
                    </div>
                  );
                })
              )}
            </section>
          )}

          {selectedDoctor && (
            <>
              <h2 className="ba-section-title">Select Date and Time</h2>
              <div className="ba-datetime-section">
                <div className="ba-calendar-panel">
                  <h3 className="ba-panel-title">
                    {today.toLocaleString("en-US", { month: "long", year: "numeric" })}
                  </h3>
                  <div className="ba-calendar-grid">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                      <div key={d} className="ba-calendar-day-header">{d}</div>
                    ))}
                    {[...Array(firstDayOfWeek)].map((_, i) => (
                      <div key={`empty-${i}`} className="ba-calendar-day ba-calendar-day-disabled" />
                    ))}
                    {[...Array(daysInMonth)].map((_, i) => {
                      const day = i + 1;
                      const isPast = day < today.getDate();
                      const isSelected = selectedDate === day;
                      return (
                        <div
                          key={day}
                          className={`ba-calendar-day${isPast ? " ba-calendar-day-disabled" : ""}${isSelected ? " ba-calendar-day-selected" : ""}`}
                          onClick={() => !isPast && setSelectedDate(day)}
                          style={{ cursor: isPast ? "default" : "pointer" }}
                        >
                          {day}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="ba-time-panel">
                  <h3 className="ba-panel-title">Available Time Slots</h3>
                  <div className="ba-time-slots">
                    {TIME_SLOTS.map((slot) => (
                      <div
                        key={slot}
                        className={`ba-time-slot${selectedTime === slot ? " ba-time-slot-selected" : ""}`}
                        onClick={() => setSelectedTime(slot)}
                        style={{ cursor: "pointer" }}
                      >
                        {slot}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {selectedDoctor && selectedDate && selectedTime && (
            <>
              <h2 className="ba-section-title">Confirmation</h2>
              <div className="ba-payment-section">
                <div>
                  <h3 className="ba-panel-title">Appointment Summary</h3>
                  <div className="ba-summary-box">
                    <div className="ba-summary-row">
                      <span>Doctor</span>
                      <span>Dr. {selectedDoctor.user?.name || selectedDoctor.name}</span>
                    </div>
                    <div className="ba-summary-row">
                      <span>Specialty</span>
                      <span>{getDoctorSpecialty(selectedDoctor)}</span>
                    </div>
                    <div className="ba-summary-row">
                      <span>Date</span>
                      <span>{new Date(year, month, selectedDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                    </div>
                    <div className="ba-summary-row">
                      <span>Time</span>
                      <span>{selectedTime}</span>
                    </div>
                    <div className="ba-summary-row">
                      <span>Duration</span>
                      <span>30 minutes</span>
                    </div>
                  </div>

                  <div className="ba-form-group" style={{ marginTop: "1rem" }}>
                    <label className="ba-form-label">Notes for doctor (optional)</label>
                    <textarea
                      className="ba-form-textarea"
                      placeholder="Any additional notes..."
                      value={patientNotes}
                      onChange={(e) => setPatientNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="ba-panel-title">Confirm Booking</h3>
                  <div className="ba-payment-actions">
                    <button
                      type="button"
                      className="ba-btn ba-btn-primary ba-btn-full"
                      onClick={handleBookNow}
                      disabled={booking}
                    >
                      {booking ? "Booking..." : "Confirm Appointment"}
                    </button>
                    <button
                      type="button"
                      className="ba-btn ba-btn-secondary ba-btn-full"
                      onClick={() => { setSelectedDate(null); setSelectedTime(null); }}
                    >
                      Change Date/Time
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default BookAppointment;
