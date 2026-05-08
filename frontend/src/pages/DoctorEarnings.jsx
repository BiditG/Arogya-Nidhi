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
      <div style={{ color: "var(--pp-primary)" }}>रु {payload[0].value.toLocaleString()}</div>
    </div>
  );
};

const DUMMY_STATS = { earning: 24500, thisMonth: 8200 };

const DUMMY_TRANSACTIONS = [
  { id: "t1", patient_name: "Rajan Adhikari", slotDate: "Apr 30, 2026", service: "Routine Checkup", amount: 800, payment: true },
  { id: "t2", patient_name: "Sunita Poudel", slotDate: "Apr 29, 2026", service: "Post-surgery Follow-up", amount: 600, payment: true },
  { id: "t3", patient_name: "Bikash Shrestha", slotDate: "Apr 28, 2026", service: "Diabetes Management", amount: 1200, payment: true },
  { id: "t4", patient_name: "Priya Gautam", slotDate: "Apr 27, 2026", service: "Cardiac Evaluation", amount: 1500, payment: true },
  { id: "t5", patient_name: "Anita Thapa", slotDate: "Apr 26, 2026", service: "General Consultation", amount: 800, payment: false },
  { id: "t6", patient_name: "Deepak Karki", slotDate: "Apr 25, 2026", service: "New Patient Consultation", amount: 1000, payment: false },
];

const MONTHLY_DATA = [
  { month: "Nov", earnings: 3800 },
  { month: "Dec", earnings: 5200 },
  { month: "Jan", earnings: 6700 },
  { month: "Feb", earnings: 4500 },
  { month: "Mar", earnings: 8200 },
  { month: "Apr", earnings: 7100 },
];

const DoctorEarnings = () => {
  const { token, backendUrl } = useContext(AppContext);
  const [dash, setDash] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const headers = token ? { Authorization: `Bearer ${token}`, dtoken: token } : {};

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [{ data: dashData }, { data: apptData }] = await Promise.all([
          axios.get(backendUrl + "/api/doctor/dashboard", { headers }).catch(() => ({ data: {} })),
          axios.get(backendUrl + "/api/doctor/appointments", { headers }).catch(() => ({ data: {} })),
        ]);
        if (dashData?.success) setDash(dashData.dashData);
        if (apptData?.success) setTransactions((apptData.appointments || []).filter((a) => a.amount));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (token) load();
  }, [backendUrl, token]);

  const displayTransactions = transactions.length > 0 ? transactions : DUMMY_TRANSACTIONS;
  const totalEarning = dash?.earning || DUMMY_STATS.earning;
  const thisMonth = dash?.thisMonth || DUMMY_STATS.thisMonth;

  return (
    <div className="pp-page">
      <div className="pp-container">
        <DoctorSidebar />
        <main className="pp-main-content">
          <p className="pp-welcome">Earnings &amp; Revenue</p>

          <section className="pp-section">
            {loading ? (
              <div className="pp-stats-grid">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="pp-stat-card">
                    <div className="pp-stat-label">Loading...</div>
                    <div className="pp-stat-value">—</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="pp-stats-grid">
                <div className="pp-stat-card">
                  <div className="pp-stat-label">Total Earnings</div>
                  <div className="pp-stat-value">रु {Number(totalEarning).toLocaleString()}</div>
                </div>
                <div className="pp-stat-card">
                  <div className="pp-stat-label">This Month</div>
                  <div className="pp-stat-value">रु {Number(thisMonth).toLocaleString()}</div>
                </div>
              </div>
            )}
          </section>

          <section className="pp-section">
            <h2 className="pp-section-title">Monthly Earnings Trend</h2>
            <div className="pp-panel">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={MONTHLY_DATA} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                    {MONTHLY_DATA.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={index === MONTHLY_DATA.length - 1 ? "#1e40af" : "#bfdbfe"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="pp-section">
            <h2 className="pp-section-title">Recent Transactions</h2>
            <div className="pp-table-container">
              <table className="pp-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Patient</th>
                    <th>Service</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayTransactions.map((t) => (
                    <tr key={t.id || t._id}>
                      <td>{t.slotDate || t.date || (t.createdAt || "").slice(0, 10)}</td>
                      <td>{t.user?.name || t.patient_name || "—"}</td>
                      <td>{t.service || t.type || "Consultation"}</td>
                      <td>रु {t.amount != null ? Number(t.amount).toLocaleString() : "—"}</td>
                      <td>
                        <span
                          className={`pp-status-badge ${
                            t.payment ? "pp-status-resolved" : "pp-status-pending"
                          }`}
                        >
                          {t.payment ? "Paid" : "Pending"}
                        </span>
                      </td>
                      <td>
                        <button className="pp-btn pp-btn-outline pp-btn-sm">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="pp-section">
            <h2 className="pp-section-title">Payout Methods</h2>
            <div className="pp-bottom-grid">
              <div className="pp-panel">
                <h3 className="pp-panel-title">Bank Account</h3>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Nepal Bank Limited</div>
                <div style={{ color: "var(--pp-text-secondary)", fontSize: "0.875rem" }}>
                  Account ending ••••7842
                </div>
                <button className="pp-btn pp-btn-outline pp-btn-sm" style={{ marginTop: 12 }}>
                  Update
                </button>
              </div>
              <div className="pp-panel">
                <h3 className="pp-panel-title">Tax Information</h3>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>PAN: 605-XXXXX-X</div>
                <div style={{ color: "var(--pp-text-secondary)", fontSize: "0.875rem" }}>
                  GST registered entity
                </div>
                <button className="pp-btn pp-btn-outline pp-btn-sm" style={{ marginTop: 12 }}>
                  Manage
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default DoctorEarnings;
