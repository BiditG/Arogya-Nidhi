import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import DoctorSidebar from "../components/DoctorSidebar";
import "./PatientPortal.css";

const StatCard = ({ label, value }) => (
  <div className="pp-stat-card">
    <div className="pp-stat-label">{label}</div>
    <div className="pp-stat-value">{value}</div>
  </div>
);

const AppointmentItem = ({ a }) => (
  <li className="pp-appointment-item">
    <div className="pp-appointment-icon">{(a.user?.name || a.user?.email || '').slice(0,2).toUpperCase()}</div>
    <div className="pp-appointment-info">
      <div className="pp-appointment-title">{a.user?.name || a.patient_name || a.user?.email || 'Unknown'}</div>
      <div className="pp-appointment-meta">{a.slotDate || a.date} {a.slotTime || a.time}</div>
    </div>
    <div className="pp-appointment-actions">
      <button className="pp-btn pp-btn-outline pp-btn-sm">View</button>
      <button className="pp-btn pp-btn-primary pp-btn-sm">Start</button>
    </div>
  </li>
);

const DoctorDashboard = () => {
  const { token, userData, logout, backendUrl } = useContext(AppContext);
  const navigate = useNavigate();
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(false);

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
        if (data.success) setDash(data.dashData || data.dashData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [backendUrl, token]);

  const todays = (dash?.latestAppointments || []).slice(0, 5);
  const pending = dash?.pendingRequests || [];

  return (
    <div className="pp-page">
      <div className="pp-container">
        <DoctorSidebar />

        <main className="pp-main-content" id="doctor-dashboard">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold">Overview</h1>
            <div className="flex gap-2">
              <button className="pp-btn pp-btn-secondary" onClick={logout}>Logout</button>
            </div>
          </div>

          {loading && <p>Loading...</p>}

          <section className="pp-section">
            <div className="pp-stats-grid">
              <StatCard label="Today's Appointments" value={dash?.todayAppointments || (dash?.appointments || 0)} />
              <StatCard label="Pending Requests" value={pending.length} />
              <StatCard label="Total Consultations" value={dash?.appointments || 0} />
              <StatCard label="This Month Earnings" value={dash?.earning || 0} />
            </div>
          </section>

          <section className="pp-section">
            <h2 className="pp-section-title">Today's Appointments</h2>
            <div className="pp-appointment-list">
              <ul>
                {todays.length === 0 && <li className="p-4">No appointments for today.</li>}
                {todays.map((a) => (
                  <AppointmentItem key={a._id || a.id} a={a} />
                ))}
              </ul>
            </div>
          </section>

          <section className="pp-section mt-6">
            <h2 className="pp-section-title">Pending Requests</h2>
            <div className="pp-table-container">
              <table className="pp-table">
                <thead>
                  <tr>
                    <th>Patient Name</th>
                    <th>Date & Time</th>
                    <th>Type</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.length === 0 && (
                    <tr><td colSpan={4} className="p-4">No pending requests.</td></tr>
                  )}
                  {pending.map((p) => (
                    <tr key={p.id || p._id}>
                      <td>{p.patient_name || p.user?.name || '—'}</td>
                      <td>{p.date || p.slotDate || '—'}</td>
                      <td>{p.type || p.request_type || '—'}</td>
                      <td>
                        <div className="pp-appointment-actions">
                          <button className="pp-btn pp-btn-outline pp-btn-sm">View</button>
                          <button className="pp-btn pp-btn-primary pp-btn-sm">Start</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="pp-bottom-grid mt-6">
            <div>
              <h2 className="pp-section-title">Monthly Earnings</h2>
              <div className="pp-panel" style={{height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                {/* Placeholder chart: simple bars based on sample data if available */}
                <div style={{width: '100%'}}>
                  <div style={{display: 'flex', gap: 8, alignItems: 'flex-end', height: 140}}>
                    {[5,8,12,9,14,11].map((v, i) => (
                      <div key={i} style={{flex:1, background:'#e6eefc', height: `${v*6}px`, borderRadius:4}}></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="pp-section-title">Recent Consultations</h2>
              <div className="pp-panel">
                {dash?.latestAppointments && dash.latestAppointments.length > 0 ? (
                  dash.latestAppointments.map((c) => (
                    <div key={c._id || c.id} className="pp-history-item">
                      <div className="pp-history-header">
                        <div className="pp-history-title">{c.user?.name || c.patient_name || 'Unknown'}</div>
                        <div className="pp-history-date">{c.slotDate || c.date}</div>
                      </div>
                      <div className="pp-history-desc">{c.notes || c.summary || '—'}</div>
                      <div className="mt-2 text-right">
                        <button className="pp-btn pp-btn-outline pp-btn-sm">View Report</button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-600">No recent consultations.</p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DoctorDashboard;
