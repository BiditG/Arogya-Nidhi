import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import DoctorSidebar from "../components/DoctorSidebar";
import { UserCircleIcon } from "@heroicons/react/24/outline";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import "./PatientPortal.css";

const EarningsTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid var(--pp-border)", borderRadius: 6, padding: "8px 12px", boxShadow: "var(--pp-shadow)", fontSize: "0.8125rem" }}>
      <div style={{ fontWeight: 700, marginBottom: 2 }}>{label}</div>
      <div style={{ color: "var(--pp-primary)" }}>Rs {payload[0].value.toLocaleString()}</div>
    </div>
  );
};

const DoctorDashboard = () => {
  const { token, userData, backendUrl } = useContext(AppContext);
  const navigate = useNavigate();
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);

  const doctorName = userData?.name || userData?.user?.name || "Doctor";

  useEffect(() => {
    if (!token) return navigate("/login");
    const role = userData?.role || userData?.user?.role;
    if (role && role !== "doctor") navigate("/login");
  }, [token, userData, navigate]);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      setLoading(true);
      try {
        const headers = { dtoken: token, Authorization: `Bearer ${token}` };
        const { data } = await axios.get(backendUrl + "/api/doctor/dashboard", { headers });
        setDash(data?.success ? data.dashData : null);
      } catch (err) {
        console.error(err);
        setDash(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [backendUrl, token]);

  const getPatientName = (appointment) =>
    appointment?.patient?.users?.name ||
    appointment?.patient?.user?.name ||
    appointment?.patient?.users?.email ||
    appointment?.patient?.user?.email ||
    appointment?.patient_name ||
    "Unknown Patient";

  const getPatientEmail = (appointment) =>
    appointment?.patient?.users?.email || appointment?.patient?.user?.email || "";

  const getPatientKey = (appointment) =>
    appointment?.patient?.id || appointment?.patient_id || getPatientEmail(appointment) || getPatientName(appointment);

  const getAppointmentDate = (appointment) => {
    const date = appointment?.scheduled_at || appointment?.scheduledAt;
    return date ? new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
  };

  const getAppointmentTime = (appointment) => {
    const date = appointment?.scheduled_at || appointment?.scheduledAt;
    return date ? new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  };

  const viewAiSummary = (appointment) => {
    navigate("/doctor-portal/ai-summaries", {
      state: {
        appointmentId: appointment?.id,
        patientKey: getPatientKey(appointment),
        patientName: getPatientName(appointment),
        patientEmail: getPatientEmail(appointment),
      },
    });
  };

  const startConsultation = (appointment) => {
    navigate("/doctor-portal/consultations", {
      state: {
        appointmentId: appointment?.id,
        patientKey: getPatientKey(appointment),
        intent: "start",
      },
    });
  };

  const todays = dash?.latestAppointments || [];
  const recent = dash?.recentAppointments || [];
  const earningsData = dash?.monthlyEarnings || [];
  const totalEarnings = Number(dash?.earning ?? dash?.totalEarnings ?? 0);

  return (
    <div className="pp-page">
      <div className="pp-container">
        <DoctorSidebar />
        <main className="pp-main-content" id="doctor-dashboard">
          <p className="pp-welcome">Welcome back, {doctorName}</p>

          <section className="pp-section">
            <h2 className="pp-section-title">Overview</h2>
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
                  <div className="pp-stat-label">Today's Appointments</div>
                  <div className="pp-stat-value">{dash?.todayAppointments ?? 0}</div>
                </div>
                <div className="pp-stat-card">
                  <div className="pp-stat-label">Total Consultations</div>
                  <div className="pp-stat-value">{dash?.appointments ?? 0}</div>
                </div>
                <div className="pp-stat-card">
                  <div className="pp-stat-label">Earnings</div>
                  <div className="pp-stat-value">Rs {totalEarnings.toLocaleString()}</div>
                </div>
              </div>
            )}
          </section>

          <section className="pp-section">
            <h2 className="pp-section-title">Today's Appointments</h2>
            <div className="pp-appointment-list">
              {loading ? (
                <div className="pp-appointment-item"><div className="pp-appointment-title">Loading appointments...</div></div>
              ) : todays.length === 0 ? (
                <div className="pp-appointment-item"><div className="pp-appointment-title">No appointments scheduled for today</div></div>
              ) : (
                todays.map((appointment) => (
                  <div key={appointment.id} className="pp-appointment-item">
                    <div className="pp-appointment-icon"><UserCircleIcon style={{ width: 22, height: 22 }} /></div>
                    <div className="pp-appointment-info">
                      <div className="pp-appointment-title">{getPatientName(appointment)}</div>
                      <div className="pp-appointment-meta">{getAppointmentDate(appointment)} {getAppointmentTime(appointment)}</div>
                    </div>
                    <div className="pp-appointment-actions">
                      <button type="button" className="pp-btn pp-btn-outline pp-btn-sm" onClick={() => viewAiSummary(appointment)}>View</button>
                      <button type="button" className="pp-btn pp-btn-primary pp-btn-sm" onClick={() => startConsultation(appointment)}>Start</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="pp-section">
            <div className="pp-bottom-grid">
              <div className="pp-panel" style={{ display: "flex", flexDirection: "column" }}>
                <h3 className="pp-panel-title">Monthly Earnings</h3>
                {earningsData.length === 0 ? (
                  <div className="pp-stat-label">No monthly earnings data yet.</div>
                ) : (
                  <div style={{ flex: 1, minHeight: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={earningsData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `Rs ${(v / 1000).toFixed(0)}k`} width={52} />
                        <Tooltip content={<EarningsTooltip />} cursor={{ fill: "#eff6ff" }} />
                        <Bar dataKey="earnings" radius={[4, 4, 0, 0]}>
                          {earningsData.map((_, index) => (
                            <Cell key={index} fill={index === earningsData.length - 1 ? "#1e40af" : "#bfdbfe"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="pp-panel">
                <h3 className="pp-panel-title">Recent Consultations</h3>
                {loading ? (
                  <div className="pp-history-item"><span className="pp-history-title">Loading...</span></div>
                ) : recent.length === 0 ? (
                  <div className="pp-history-item"><span className="pp-history-title">No recent consultations</span></div>
                ) : (
                  recent.slice(0, 3).map((appointment) => (
                    <div key={appointment.id} className="pp-history-item">
                      <div className="pp-history-header">
                        <span className="pp-history-title">{getPatientName(appointment)}</span>
                        <span className="pp-history-date">{getAppointmentDate(appointment)}</span>
                      </div>
                      <div className="pp-history-desc">{appointment.status || "Consultation"}</div>
                    </div>
                  ))
                )}
                <button type="button" className="pp-btn pp-btn-secondary pp-btn-full" onClick={() => navigate("/doctor-portal/consultations")}>
                  View All Consultations
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default DoctorDashboard;
