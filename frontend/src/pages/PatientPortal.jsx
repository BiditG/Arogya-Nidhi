import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
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
          const d = quickRes.data.data;
          setUpcomingAppointments(d.upcomingAppointments || []);
        }
        if (queriesRes.data.success) {
          const q = queriesRes.data.data;
          setQueries(Array.isArray(q) ? q : q?.queries || []);
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
      setUpcomingAppointments((prev) => prev.filter((a) => a.id !== id));
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

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
  const fmtDateTime = (d) => d ? new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
  const statusBadge = (isResolved) => isResolved ? "pp-status-resolved" : "pp-status-progress";

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
                    <div className="pp-stat-value">—</div>
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
                <div className="pp-ai-avatar"><SparklesIcon style={{ width: 20, height: 20 }} /></div>
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
                  <div className="pp-action-icon"><CalendarDaysIcon style={{ width: 22, height: 22 }} /></div>
                  <div className="pp-action-title">Book Appointment</div>
                </div>
              </Link>
              <Link to="/patient-portal/medical-history" style={{ textDecoration: "none" }}>
                <div className="pp-action-card">
                  <div className="pp-action-icon"><ClipboardDocumentListIcon style={{ width: 22, height: 22 }} /></div>
                  <div className="pp-action-title">View Medical History</div>
                </div>
              </Link>
              <Link to="/iot" style={{ textDecoration: "none" }}>
                <div className="pp-action-card">
                  <div className="pp-action-icon"><SignalIcon style={{ width: 22, height: 22 }} /></div>
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
                {upcomingAppointments.map((appt) => (
                  <div key={appt.id} className="pp-appointment-item">
                    <div className="pp-appointment-icon">
                      <UserCircleIcon style={{ width: 22, height: 22 }} />
                    </div>
                    <div className="pp-appointment-info">
                      <div className="pp-appointment-title">
                        {appt.doctor?.user?.name || appt.doctor?.name || "Doctor"} — {appt.doctor?.specialization || ""}
                      </div>
                      <div className="pp-appointment-meta">
                        {fmtDateTime(appt.scheduledAt)}
                        {appt.patientNotes ? ` · ${appt.patientNotes}` : ""}
                      </div>
                    </div>
                    <div className="pp-appointment-actions">
                      <button
                        type="button"
                        className="pp-btn pp-btn-outline pp-btn-sm"
                        onClick={() => handleCancelAppointment(appt.id)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
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
                    queries.slice(0, 5).map((q) => (
                      <tr key={q.id}>
                        <td>
                          <strong>{q.title}</strong>
                          {q.symptomText && <div className="pp-cell-note">{q.symptomText.slice(0, 80)}{q.symptomText.length > 80 ? "…" : ""}</div>}
                        </td>
                        <td>{fmtDate(q.createdAt)}</td>
                        <td>
                          <span className={`pp-status-badge ${statusBadge(q.isResolved)}`}>
                            {q.isResolved ? "Resolved" : "In Progress"}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="pp-btn pp-btn-primary pp-btn-sm"
                            onClick={() => navigate(`/patient-portal/health-queries/${q.id}`)}
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
