import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PatientSidebar from "../components/PatientSidebar";
import {
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  SignalIcon,
  SparklesIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../context/AppContext";
import "./PatientPortal.css";

const PatientPortal = () => {
  const { userData, setToken, setUserData, backendUrl, token } = useContext(AppContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState({ upcomingAppointments: 0, activePrescriptions: 0 });
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);

  const patientName = userData?.name || userData?.user?.name || "Patient";
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) return;

    const fetchAll = async () => {
      try {
        const [overviewRes, quickRes, queriesRes] = await Promise.all([
          axios.get(backendUrl + "/api/patient/dashboard", { headers }),
          axios.get(backendUrl + "/api/patient/dashboard/quick-actions", { headers }),
          axios.get(backendUrl + "/api/patient/queries", { headers }),
        ]);

        if (overviewRes.data.success) {
          const nextStats = overviewRes.data.data?.stats || {};
          setStats({
            upcomingAppointments: Number(nextStats.upcomingAppointments || 0),
            activePrescriptions: Number(nextStats.activePrescriptions || 0),
          });
        }

        if (quickRes.data.success) {
          const data = quickRes.data.data;
          setUpcomingAppointments(data.upcomingAppointments || []);
        }

        if (queriesRes.data.success) {
          const data = queriesRes.data.data;
          setQueries(Array.isArray(data) ? data : data?.queries || []);
        }
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [token, backendUrl]);

  const handleCancelAppointment = async (id) => {
    try {
      await axios.patch(backendUrl + `/api/patient/appointments/${id}/cancel`, {}, { headers });
      toast.success("Appointment cancelled");
      setUpcomingAppointments((prev) => prev.filter((appointment) => appointment.id !== id));
      setStats((prev) => ({ ...prev, upcomingAppointments: Math.max(0, prev.upcomingAppointments - 1) }));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel appointment");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(false);
    setUserData(false);
    navigate("/login");
  };

  const fmtDate = (date) =>
    date ? new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

  const fmtDateTime = (date) =>
    date
      ? new Date(date).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "Date not set";

  const getAppointmentDate = (appointment) =>
    appointment?.scheduledAt || appointment?.scheduled_at || appointment?.appointment_date || null;

  const getDoctorName = (appointment) =>
    appointment?.doctor?.user?.name ||
    appointment?.doctor?.users?.name ||
    appointment?.doctor?.name ||
    "Doctor";

  const getDoctorSpecialty = (appointment) =>
    appointment?.doctor?.specialty ||
    appointment?.doctor?.specialization ||
    appointment?.doctor?.speciality ||
    appointment?.doctor?.subSpecialty ||
    appointment?.doctor?.sub_specialty ||
    "General physician";

  const getAppointmentNote = (appointment) =>
    appointment?.patientNotes || appointment?.patient_notes || appointment?.reason || "";

  const statusBadge = (isResolved) => (isResolved ? "pp-status-resolved" : "pp-status-progress");

  return (
    <div className="pp-page">
      <div className="pp-container">
        <PatientSidebar />

        <main className="pp-main-content" id="dashboard">
          <p className="pp-welcome">Welcome back, {patientName}</p>

          <section className="pp-section">
            <h2 className="pp-section-title">Health Overview</h2>
            {loading ? (
              <div className="pp-stats-grid">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="pp-stat-card">
                    <div className="pp-stat-label">Loading...</div>
                    <div className="pp-stat-value">-</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="pp-stats-grid">
                <div className="pp-stat-card">
                  <div className="pp-stat-label">Upcoming Appointments</div>
                  <div className="pp-stat-value">{stats.upcomingAppointments}</div>
                </div>
                <div className="pp-stat-card">
                  <div className="pp-stat-label">Prescriptions</div>
                  <div className="pp-stat-value">{stats.activePrescriptions}</div>
                </div>
                <div className="pp-stat-card">
                  <div className="pp-stat-label">Health Queries</div>
                  <div className="pp-stat-value">{queries.length}</div>
                </div>
              </div>
            )}
          </section>

          <section className="pp-section" id="assistant">
            <h2 className="pp-section-title">AI Health Assistant</h2>
            <div className="pp-ai-container">
              <div className="pp-ai-header">
                <div className="pp-ai-avatar">
                  <SparklesIcon style={{ width: 20, height: 20 }} />
                </div>
                <div>
                  <div className="pp-ai-title">Dr. AI Assistant</div>
                  <div className="pp-ai-subtitle">Chat or Voice Assistant</div>
                </div>
              </div>
              <div className="pp-chat-area">
                <div className="pp-chat-placeholder">
                  How can I help you today? Ask me about your symptoms, medications, or health concerns.
                </div>
              </div>
              <div className="pp-chat-input-container">
                <Link to="/patient-portal/ai-assistant" className="pp-btn pp-btn-primary" style={{ textDecoration: "none" }}>
                  Open AI Assistant
                </Link>
              </div>
            </div>
          </section>

          <section className="pp-section">
            <h2 className="pp-section-title">Quick Actions</h2>
            <div className="pp-quick-actions">
              <Link to="/patient-portal/book-appointment" style={{ textDecoration: "none" }}>
                <div className="pp-action-card">
                  <div className="pp-action-icon">
                    <CalendarDaysIcon style={{ width: 22, height: 22 }} />
                  </div>
                  <div className="pp-action-title">Book Appointment</div>
                </div>
              </Link>
              <Link to="/patient-portal/medical-history" style={{ textDecoration: "none" }}>
                <div className="pp-action-card">
                  <div className="pp-action-icon">
                    <ClipboardDocumentListIcon style={{ width: 22, height: 22 }} />
                  </div>
                  <div className="pp-action-title">View Medical History</div>
                </div>
              </Link>
              <Link to="/iot" style={{ textDecoration: "none" }}>
                <div className="pp-action-card">
                  <div className="pp-action-icon">
                    <SignalIcon style={{ width: 22, height: 22 }} />
                  </div>
                  <div className="pp-action-title">IoT Device Test</div>
                </div>
              </Link>
            </div>
          </section>

          <section className="pp-section" id="appointments">
            <h2 className="pp-section-title">Upcoming Appointments</h2>
            {loading ? (
              <div className="pp-appointment-list">
                <div className="pp-appointment-item">
                  <div className="pp-appointment-info">
                    <div className="pp-appointment-title">Loading appointments...</div>
                  </div>
                </div>
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <div className="pp-appointment-list">
                <div className="pp-appointment-item">
                  <div className="pp-appointment-info">
                    <div className="pp-appointment-title">No upcoming appointments</div>
                    <div className="pp-appointment-meta">
                      <Link to="/patient-portal/book-appointment">Book one now</Link>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="pp-appointment-list">
                {upcomingAppointments.map((appointment) => {
                  const note = getAppointmentNote(appointment);
                  return (
                    <div key={appointment.id} className="pp-appointment-item">
                      <div className="pp-appointment-icon">
                        <UserCircleIcon style={{ width: 22, height: 22 }} />
                      </div>
                      <div className="pp-appointment-info">
                        <div className="pp-appointment-title">Dr. {getDoctorName(appointment)}</div>
                        <div className="pp-appointment-meta">
                          {getDoctorSpecialty(appointment)} | {fmtDateTime(getAppointmentDate(appointment))}
                          {appointment.status ? ` | ${appointment.status}` : ""}
                          {note ? ` | ${note}` : ""}
                        </div>
                      </div>
                      <div className="pp-appointment-actions">
                        {(appointment.status?.toLowerCase() === "pending") && (
                          <button
                            type="button"
                            className="pp-btn pp-btn-primary pp-btn-sm"
                            onClick={() => navigate(`/payment/${appointment.id}`)}
                          >
                            Pay Now
                          </button>
                        )}
                        <button
                          type="button"
                          className="pp-btn pp-btn-outline pp-btn-sm"
                          onClick={() => handleCancelAppointment(appointment.id)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="pp-section" id="queries">
            <h2 className="pp-section-title">My Health Queries</h2>
            <div className="pp-table-container">
              <table className="pp-table">
                <thead>
                  <tr>
                    <th>Query</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="4">Loading...</td>
                    </tr>
                  ) : queries.length === 0 ? (
                    <tr>
                      <td colSpan="4">No health queries found.</td>
                    </tr>
                  ) : (
                    queries.slice(0, 5).map((query) => (
                      <tr key={query.id}>
                        <td>
                          <strong>{query.title}</strong>
                          {query.symptomText && (
                            <div className="pp-cell-note">
                              {query.symptomText.slice(0, 80)}
                              {query.symptomText.length > 80 ? "..." : ""}
                            </div>
                          )}
                        </td>
                        <td>{fmtDate(query.createdAt)}</td>
                        <td>
                          <span className={`pp-status-badge ${statusBadge(query.isResolved)}`}>
                            {query.isResolved ? "Resolved" : "In Progress"}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="pp-btn pp-btn-primary pp-btn-sm"
                            onClick={() => navigate(`/patient-portal/health-queries/${query.id}`)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default PatientPortal;
