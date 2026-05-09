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

const DUMMY_STATS = { todayAppointments: 4, totalConsultations: 47, earning: 8200 };

const EARNINGS_DATA = [
  { month: "Nov", earnings: 4200 },
  { month: "Dec", earnings: 6800 },
  { month: "Jan", earnings: 9500 },
  { month: "Feb", earnings: 7300 },
  { month: "Mar", earnings: 11000 },
  { month: "Apr", earnings: 8200 },
];

const EarningsTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid var(--pp-border)",
        borderRadius: 6,
        padding: "8px 12px",
        boxShadow: "var(--pp-shadow)",
        fontSize: "0.8125rem",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 2 }}>{label}</div>
      <div style={{ color: "var(--pp-primary)" }}>
        रु {payload[0].value.toLocaleString()}
      </div>
    </div>
  );
};

const DUMMY_APPOINTMENTS = [
  { id: "da1", user: { name: "Anita Thapa" }, slotDate: "May 1, 2026", slotTime: "10:00 AM" },
  { id: "da2", user: { name: "Bikash Shrestha" }, slotDate: "May 1, 2026", slotTime: "11:30 AM" },
  { id: "da3", user: { name: "Priya Gautam" }, slotDate: "May 1, 2026", slotTime: "2:00 PM" },
  { id: "da4", user: { name: "Rajan Adhikari" }, slotDate: "May 1, 2026", slotTime: "3:30 PM" },
];

const DUMMY_CONSULTATIONS = [
  { id: "dc1", user: { name: "Rajan Adhikari" }, slotDate: "Apr 30, 2026", notes: "Blood pressure controlled. Continue Amlodipine 5mg." },
  { id: "dc2", user: { name: "Sunita Poudel" }, slotDate: "Apr 29, 2026", notes: "Post-surgery recovery progressing well. Suture removal in 5 days." },
  { id: "dc3", user: { name: "Bikash Shrestha" }, slotDate: "Apr 28, 2026", notes: "HbA1c improved to 7.4%. Continue Metformin 1000mg." },
];

const EARNINGS_BARS = [42, 68, 95, 73, 110, 82];
const EARNINGS_LABELS = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];

const DoctorDashboard = () => {
  const { token, userData, logout, backendUrl } = useContext(AppContext);
  const navigate = useNavigate();
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);

  const doctorName = userData?.name || userData?.user?.name || "Doctor";

  const getPatientName = (appointment) =>
    appointment?.patient?.users?.name ||
    appointment?.patient?.user?.name ||
    appointment?.patient?.users?.email ||
    appointment?.patient?.user?.email ||
    appointment?.user?.name ||
    appointment?.patient_name ||
    "Unknown Patient";

  const getAppointmentDate = (appointment) => {
    const date = appointment?.scheduled_at || appointment?.scheduledAt || appointment?.slotDate || appointment?.date;
    return date ? new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
  };

  const getAppointmentTime = (appointment) => {
    const date = appointment?.scheduled_at || appointment?.scheduledAt;
    if (date) {
      return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return appointment?.slotTime || appointment?.time || "";
  };

  const getPatientEmail = (appointment) =>
    appointment?.patient?.users?.email ||
    appointment?.patient?.user?.email ||
    appointment?.user?.email ||
    "";

  const getPatientKey = (appointment) =>
    appointment?.patient?.id ||
    appointment?.patient?._id ||
    appointment?.patient_id ||
    getPatientEmail(appointment) ||
    getPatientName(appointment);

  const viewAiSummary = (appointment) => {
    navigate("/doctor-portal/ai-summaries", {
      state: {
        appointmentId: appointment?.id || appointment?._id,
        patientKey: getPatientKey(appointment),
        patientName: getPatientName(appointment),
        patientEmail: getPatientEmail(appointment),
      },
    });
  };

  const startConsultation = (appointment) => {
    navigate("/doctor-portal/consultations", {
      state: {
        appointmentId: appointment?.id || appointment?._id,
        patientKey: getPatientKey(appointment),
        intent: "start",
      },
    });
  };

  useEffect(() => {
    if (!token) return navigate("/login");
    const role = userData?.role || userData?.user?.role;
    if (role !== "doctor") return navigate("/login");
  }, [token, userData, navigate]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const headers = token ? { dtoken: token, Authorization: `Bearer ${token}` } : {};
        const { data } = await axios.get(backendUrl + "/api/doctor/dashboard", { headers });
        if (data.success) setDash(data.dashData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [backendUrl, token]);

  const todays =
    (dash?.latestAppointments || []).length > 0
      ? (dash.latestAppointments || []).slice(0, 5)
      : [];
  const consultations =
    (dash?.recentAppointments || dash?.latestAppointments || []).length > 0
      ? (dash.recentAppointments || dash.latestAppointments)
      : DUMMY_CONSULTATIONS;

  const todayCount = dash?.todayAppointments ?? 0;
  const totalConsult = dash?.appointments || DUMMY_STATS.totalConsultations;
  const earning = dash?.earning || DUMMY_STATS.earning;

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

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
                    <div className="pp-stat-value">—</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="pp-stats-grid">
                <div className="pp-stat-card">
                  <div className="pp-stat-label">Today's Appointments</div>
                  <div className="pp-stat-value">{todayCount}</div>
                </div>
                <div className="pp-stat-card">
                  <div className="pp-stat-label">Total Consultations</div>
                  <div className="pp-stat-value">{totalConsult}</div>
                </div>
                <div className="pp-stat-card">
                  <div className="pp-stat-label">Month Earnings</div>
                  <div className="pp-stat-value">रु {Number(earning).toLocaleString()}</div>
                </div>
              </div>
            )}
          </section>

          <section className="pp-section">
            <h2 className="pp-section-title">Today's Appointments</h2>
            {loading ? (
              <div className="pp-appointment-list">
                <div className="pp-appointment-item">
                  <div className="pp-appointment-info">
                    <div className="pp-appointment-title">Loading appointments...</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="pp-appointment-list">
                {todays.length === 0 ? (
                  <div className="pp-appointment-item">
                    <div className="pp-appointment-info">
                      <div className="pp-appointment-title">No appointments scheduled for today</div>
                    </div>
                  </div>
                ) : (
                  todays.map((a) => (
                    <div key={a._id || a.id} className="pp-appointment-item">
                      <div className="pp-appointment-icon">
                        <UserCircleIcon style={{ width: 22, height: 22 }} />
                      </div>
                      <div className="pp-appointment-info">
                        <div className="pp-appointment-title">{getPatientName(a)}</div>
                        <div className="pp-appointment-meta">
                          {getAppointmentDate(a)} {getAppointmentTime(a)}
                        </div>
                      </div>
                      <div className="pp-appointment-actions">
                        <button
                          type="button"
                          className="pp-btn pp-btn-outline pp-btn-sm"
                          onClick={() => viewAiSummary(a)}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="pp-btn pp-btn-primary pp-btn-sm"
                          onClick={() => startConsultation(a)}
                        >
                          Start
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>

          <section className="pp-section">
            <div className="pp-bottom-grid">
              <div className="pp-panel" style={{ display: "flex", flexDirection: "column" }}>
                <h3 className="pp-panel-title">Monthly Earnings</h3>
                <div style={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={EARNINGS_DATA} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `रु ${(v / 1000).toFixed(0)}k`}
                      width={52}
                    />
                    <Tooltip content={<EarningsTooltip />} cursor={{ fill: "#eff6ff" }} />
                    <Bar dataKey="earnings" radius={[4, 4, 0, 0]}>
                      {EARNINGS_DATA.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={index === EARNINGS_DATA.length - 1 ? "#1e40af" : "#bfdbfe"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                </div>
              </div>

              <div className="pp-panel">
                <h3 className="pp-panel-title">Recent Consultations</h3>
                {loading ? (
                  <div className="pp-history-item">
                    <div className="pp-history-header">
                      <span className="pp-history-title">Loading...</span>
                    </div>
                  </div>
                ) : (
                  consultations.slice(0, 3).map((c) => (
                    <div key={c._id || c.id} className="pp-history-item">
                      <div className="pp-history-header">
                        <span className="pp-history-title">{getPatientName(c)}</span>
                        <span className="pp-history-date">{getAppointmentDate(c) || fmtDate(c.slotDate || c.date)}</span>
                      </div>
                      <div className="pp-history-desc">{c.notes || c.summary || "—"}</div>
                    </div>
                  ))
                )}
                <button type="button" className="pp-btn pp-btn-secondary pp-btn-full">
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
