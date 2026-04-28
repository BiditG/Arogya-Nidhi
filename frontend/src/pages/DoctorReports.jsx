import { useEffect, useState, useContext } from "react";
import axios from "axios";
import DoctorSidebar from "../components/DoctorSidebar";
import { AppContext } from "../context/AppContext";
import "./PatientPortal.css";

const StatCard = ({ label, value }) => (
  <div className="pp-stat-card">
    <div className="pp-stat-label">{label}</div>
    <div className="pp-stat-value">{value}</div>
  </div>
);

const ChartPlaceholder = ({ children }) => (
  <div className="pp-panel" style={{height:220, display:'flex', alignItems:'center', justifyContent:'center'}}>
    {children || <div style={{color:'#94a3b8'}}>Chart placeholder</div>}
  </div>
);

const DoctorReports = () => {
  const { token, backendUrl, logout } = useContext(AppContext);
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(false);

  const headers = token ? { Authorization: `Bearer ${token}`, dtoken: token } : {};

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(backendUrl + '/api/doctor/dashboard', { headers }).catch(() => ({}));
        if (data?.success) setDash(data.dashData || data.dashData);
      } catch (err) {
        console.error(err);
      } finally { setLoading(false); }
    };
    if (token) load();
  }, [backendUrl, token]);

  return (
    <div className="pp-page">
      <div className="pp-container">
        <DoctorSidebar />
        <main className="pp-main-content">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <a href="/doctor-portal" style={{color:'#6b7280',fontSize:13}}>← Back to Dashboard</a>
              <h1 className="text-2xl font-semibold" style={{marginTop:8}}>Professional Reports</h1>
            </div>
            <div>
              <button className="pp-btn pp-btn-secondary" onClick={logout}>Logout</button>
            </div>
          </div>

          <section className="pp-section" style={{marginTop:12}}>
            <div className="pp-stats-grid">
              <StatCard label="Total Consultations" value={dash?.appointments || 0} />
              <StatCard label="Patient Satisfaction" value={dash?.satisfaction || '—'} />
              <StatCard label="Avg Consultation Time" value={dash?.avgTime || '—'} />
              <StatCard label="Response Rate" value={dash?.responseRate || '—'} />
            </div>
          </section>

          <section style={{marginTop:18}}>
            <h2 className="pp-section-title">Monthly Consultation Trends</h2>
            <ChartPlaceholder />
          </section>

          <section style={{marginTop:18}}>
            <h2 className="pp-section-title">Patient Demographics</h2>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div className="pp-panel">
                <div style={{fontWeight:700, marginBottom:8}}>Age Distribution</div>
                <ChartPlaceholder>Age distribution chart</ChartPlaceholder>
              </div>
              <div className="pp-panel">
                <div style={{fontWeight:700, marginBottom:8}}>Diagnosis Categories</div>
                <ChartPlaceholder>Diagnosis categories chart</ChartPlaceholder>
              </div>
            </div>
          </section>

          <section style={{marginTop:18}}>
            <h2 className="pp-section-title">Availability Report</h2>
            <div className="pp-stats-grid" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
              <div className="pp-stat-card"><div className="pp-stat-label">Total Hours Available</div><div className="pp-stat-value">{dash?.totalHours || 0}</div></div>
              <div className="pp-stat-card"><div className="pp-stat-label">Booked Hours</div><div className="pp-stat-value">{dash?.bookedHours || 0}</div></div>
              <div className="pp-stat-card"><div className="pp-stat-label">Utilization Rate</div><div className="pp-stat-value">{dash?.utilization || '0%'}</div></div>
            </div>
          </section>

          <section style={{marginTop:18}}>
            <h2 className="pp-section-title">Generate Custom Report</h2>
            <div className="pp-panel">
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <select className="pp-chat-input">
                  <option>Report Type</option>
                  <option>Consultation Summary</option>
                  <option>Patient Demographics</option>
                </select>
                <input className="pp-chat-input" type="date" />
                <input className="pp-chat-input" type="date" />
                <button className="pp-btn pp-btn-primary">Generate</button>
                <button className="pp-btn pp-btn-outline">Export All Reports</button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default DoctorReports;
