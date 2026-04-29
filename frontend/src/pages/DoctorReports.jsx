import { useEffect, useState, useContext } from "react";
import axios from "axios";
import DoctorSidebar from "../components/DoctorSidebar";
import { AppContext } from "../context/AppContext";
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

const ConsultTooltip = ({ active, payload, label }) => {
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
      <div style={{ color: "var(--pp-primary)" }}>{payload[0].value} consultations</div>
    </div>
  );
};

const DUMMY_STATS = {
  appointments: 47,
  satisfaction: "4.8 / 5",
  avgTime: "22 min",
  responseRate: "94%",
};

const DUMMY_AVAILABILITY = { totalHours: 160, bookedHours: 124, utilization: "78%" };

const MONTHLY_CHART_DATA = [
  { month: "Nov", consultations: 28 },
  { month: "Dec", consultations: 34 },
  { month: "Jan", consultations: 42 },
  { month: "Feb", consultations: 38 },
  { month: "Mar", consultations: 51 },
  { month: "Apr", consultations: 47 },
];

const AGE_DATA = [
  { label: "0–17", pct: 8 },
  { label: "18–34", pct: 22 },
  { label: "35–54", pct: 41 },
  { label: "55–74", pct: 24 },
  { label: "75+", pct: 5 },
];

const DIAGNOSIS_DATA = [
  { label: "Hypertension", pct: 28 },
  { label: "Diabetes", pct: 22 },
  { label: "Respiratory", pct: 18 },
  { label: "Cardiac", pct: 14 },
  { label: "Other", pct: 18 },
];

const DoctorReports = () => {
  const { token, backendUrl } = useContext(AppContext);
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const headers = token ? { Authorization: `Bearer ${token}`, dtoken: token } : {};
        const { data } = await axios
          .get(backendUrl + "/api/doctor/dashboard", { headers })
          .catch(() => ({}));
        if (data?.success) setDash(data.dashData);
      } catch {
        // keep dummy
      } finally {
        setLoading(false);
      }
    };
    if (token) load();
  }, [backendUrl, token]);

  const stats = {
    appointments: dash?.appointments || DUMMY_STATS.appointments,
    satisfaction: dash?.satisfaction || DUMMY_STATS.satisfaction,
    avgTime: dash?.avgTime || DUMMY_STATS.avgTime,
    responseRate: dash?.responseRate || DUMMY_STATS.responseRate,
  };

  const avail = {
    totalHours: dash?.totalHours || DUMMY_AVAILABILITY.totalHours,
    bookedHours: dash?.bookedHours || DUMMY_AVAILABILITY.bookedHours,
    utilization: dash?.utilization || DUMMY_AVAILABILITY.utilization,
  };

  return (
    <div className="pp-page">
      <div className="pp-container">
        <DoctorSidebar />
        <main className="pp-main-content">
          <p className="pp-welcome">Professional Reports</p>

          <section className="pp-section">
            <h2 className="pp-section-title">Performance Overview</h2>
            {loading ? (
              <div className="pp-stats-grid">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="pp-stat-card">
                    <div className="pp-stat-label">Loading...</div>
                    <div className="pp-stat-value">—</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="pp-stats-grid">
                <div className="pp-stat-card">
                  <div className="pp-stat-label">Total Consultations</div>
                  <div className="pp-stat-value">{stats.appointments}</div>
                </div>
                <div className="pp-stat-card">
                  <div className="pp-stat-label">Patient Satisfaction</div>
                  <div className="pp-stat-value">{stats.satisfaction}</div>
                </div>
                <div className="pp-stat-card">
                  <div className="pp-stat-label">Avg Consultation Time</div>
                  <div className="pp-stat-value">{stats.avgTime}</div>
                </div>
                <div className="pp-stat-card">
                  <div className="pp-stat-label">Response Rate</div>
                  <div className="pp-stat-value">{stats.responseRate}</div>
                </div>
              </div>
            )}
          </section>

          <section className="pp-section">
            <h2 className="pp-section-title">Monthly Consultation Trends</h2>
            <div className="pp-panel">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={MONTHLY_CHART_DATA} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                    width={36}
                  />
                  <Tooltip content={<ConsultTooltip />} cursor={{ fill: "#eff6ff" }} />
                  <Bar dataKey="consultations" radius={[4, 4, 0, 0]}>
                    {MONTHLY_CHART_DATA.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={index === MONTHLY_CHART_DATA.length - 1 ? "#1e40af" : "#bfdbfe"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="pp-section">
            <h2 className="pp-section-title">Patient Demographics</h2>
            <div className="pp-bottom-grid">
              <div className="pp-panel">
                <h3 className="pp-panel-title">Age Distribution</h3>
                {AGE_DATA.map(({ label, pct }) => (
                  <div key={label} style={{ marginBottom: 10 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.8125rem",
                        marginBottom: 4,
                      }}
                    >
                      <span>{label}</span>
                      <span style={{ color: "var(--pp-text-muted)" }}>{pct}%</span>
                    </div>
                    <div style={{ background: "var(--pp-border)", borderRadius: 4, height: 8 }}>
                      <div
                        style={{
                          background: "var(--pp-primary)",
                          height: 8,
                          borderRadius: 4,
                          width: `${pct}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="pp-panel">
                <h3 className="pp-panel-title">Diagnosis Categories</h3>
                {DIAGNOSIS_DATA.map(({ label, pct }) => (
                  <div key={label} style={{ marginBottom: 10 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.8125rem",
                        marginBottom: 4,
                      }}
                    >
                      <span>{label}</span>
                      <span style={{ color: "var(--pp-text-muted)" }}>{pct}%</span>
                    </div>
                    <div style={{ background: "var(--pp-border)", borderRadius: 4, height: 8 }}>
                      <div
                        style={{
                          background: "var(--pp-primary-dark)",
                          height: 8,
                          borderRadius: 4,
                          width: `${pct}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="pp-section">
            <h2 className="pp-section-title">Availability Report</h2>
            <div className="pp-stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
              <div className="pp-stat-card">
                <div className="pp-stat-label">Total Hours Available</div>
                <div className="pp-stat-value">{avail.totalHours}h</div>
              </div>
              <div className="pp-stat-card">
                <div className="pp-stat-label">Booked Hours</div>
                <div className="pp-stat-value">{avail.bookedHours}h</div>
              </div>
              <div className="pp-stat-card">
                <div className="pp-stat-label">Utilization Rate</div>
                <div className="pp-stat-value">{avail.utilization}</div>
              </div>
            </div>
          </section>

          <section className="pp-section">
            <h2 className="pp-section-title">Generate Custom Report</h2>
            <div className="pp-panel">
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <select className="pp-chat-input">
                  <option>Report Type</option>
                  <option>Consultation Summary</option>
                  <option>Patient Demographics</option>
                  <option>Earnings Report</option>
                </select>
                <input className="pp-chat-input" type="date" />
                <input className="pp-chat-input" type="date" />
                <button className="pp-btn pp-btn-primary">Generate</button>
                <button className="pp-btn pp-btn-outline">Export All</button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default DoctorReports;
