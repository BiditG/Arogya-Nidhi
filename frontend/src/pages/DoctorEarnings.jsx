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
    <div style={{ background: "#fff", border: "1px solid var(--pp-border)", borderRadius: 6, padding: "8px 12px", boxShadow: "var(--pp-shadow)", fontSize: "0.8125rem" }}>
      <div style={{ fontWeight: 700, marginBottom: 2 }}>{label}</div>
      <div style={{ color: "var(--pp-primary)" }}>Rs {payload[0].value.toLocaleString()}</div>
    </div>
  );
};

const DoctorEarnings = () => {
  const { token, backendUrl } = useContext(AppContext);
  const [dash, setDash] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const headers = token ? { Authorization: `Bearer ${token}`, dtoken: token } : {};
  const earningStatuses = new Set(["CONFIRMED", "COMPLETED"]);

  const paidPaymentsFor = (appointment) => {
    const payments = Array.isArray(appointment?.payment) ? appointment.payment : [];
    return payments.filter((payment) => String(payment?.status || "").toUpperCase() === "PAID");
  };

  const buildTransactionRows = (appointments = []) =>
    appointments
      .filter((appointment) => earningStatuses.has(String(appointment?.status || "").toUpperCase()))
      .flatMap((appointment) =>
        paidPaymentsFor(appointment).map((payment, index) => ({
          ...appointment,
          transactionId: `${appointment.id || "appointment"}-${payment.id || index}`,
          amount: Number(payment.amount || 0),
          paid_at: payment.paid_at,
          paymentStatus: payment.status,
        }))
      );

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      setLoading(true);
      try {
        const [{ data: dashData }, { data: apptData }] = await Promise.all([
          axios.get(backendUrl + "/api/doctor/dashboard", { headers }).catch(() => ({ data: {} })),
          axios.get(backendUrl + "/api/doctor/appointments", { headers }).catch(() => ({ data: {} })),
        ]);
        setDash(dashData?.success ? dashData.dashData : null);
        setTransactions(apptData?.success ? buildTransactionRows(apptData.appointments || []) : []);
      } catch (err) {
        console.error(err);
        setDash(null);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [backendUrl, token]);

  const monthlyData = transactions.reduce((acc, transaction) => {
    const date = transaction.scheduled_at || transaction.created_at || transaction.createdAt;
    if (!date) return acc;
    const month = new Date(date).toLocaleString("en-US", { month: "short" });
    const existing = acc.find((item) => item.month === month);
    if (existing) existing.earnings += Number(transaction.amount || 0);
    else acc.push({ month, earnings: Number(transaction.amount || 0) });
    return acc;
  }, []);
  const totalEarnings = Number(
    dash?.earning ?? transactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0)
  );

  const patientName = (transaction) =>
    transaction?.patient?.users?.name || transaction?.patient?.user?.name || transaction?.patient_name || "-";

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
                    <div className="pp-stat-value">-</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="pp-stats-grid">
                <div className="pp-stat-card">
                  <div className="pp-stat-label">Total Earnings</div>
                  <div className="pp-stat-value">Rs {totalEarnings.toLocaleString()}</div>
                </div>
                <div className="pp-stat-card">
                  <div className="pp-stat-label">Paid Transactions</div>
                  <div className="pp-stat-value">{transactions.length}</div>
                </div>
              </div>
            )}
          </section>

          <section className="pp-section">
            <h2 className="pp-section-title">Monthly Earnings Trend</h2>
            <div className="pp-panel">
              {monthlyData.length === 0 ? (
                <div className="pp-stat-label">No earnings data available yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(value) => `Rs ${(value / 1000).toFixed(0)}k`} width={52} />
                    <Tooltip content={<EarningsTooltip />} cursor={{ fill: "#eff6ff" }} />
                    <Bar dataKey="earnings" radius={[4, 4, 0, 0]}>
                      {monthlyData.map((_, index) => (
                        <Cell key={index} fill={index === monthlyData.length - 1 ? "#1e40af" : "#bfdbfe"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
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
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr><td colSpan="5">No transactions found.</td></tr>
                  ) : transactions.map((transaction) => (
                    <tr key={transaction.transactionId}>
                      <td>{(transaction.paid_at || transaction.scheduled_at) ? new Date(transaction.paid_at || transaction.scheduled_at).toLocaleDateString() : "-"}</td>
                      <td>{patientName(transaction)}</td>
                      <td>{transaction.type || "Consultation"}</td>
                      <td>Rs {transaction.amount != null ? Number(transaction.amount).toLocaleString() : "0"}</td>
                      <td>
                        <span className="pp-status-badge pp-status-resolved">
                          {String(transaction.paymentStatus || "PAID").toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default DoctorEarnings;
