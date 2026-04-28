import { useContext, useEffect, useState } from "react";
import axios from "axios";
import DoctorSidebar from "../components/DoctorSidebar";
import { AppContext } from "../context/AppContext";
import "./PatientPortal.css";

const SummaryCard = ({ s, onView }) => (
  <div className="pp-panel" style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
    <div style={{flex:1}}>
      <div style={{fontWeight:700}}>{s.patientName || 'Unknown Patient'}</div>
      <div style={{color:'#6b7280',marginTop:6}}>{s.date || s.createdAt || ''}</div>
      <div style={{marginTop:8,color:'#334155'}}>{(s.aiSummary || s.snippet || 'No AI summary available').slice(0,280)}{(s.aiSummary||s.snippet||'').length>280?'...':''}</div>
    </div>
    <div style={{marginLeft:12,display:'flex',flexDirection:'column',gap:8}}>
      <button className="pp-btn pp-btn-outline pp-btn-sm" onClick={()=>onView(s)}>View</button>
    </div>
  </div>
);

const DoctorAISummaries = () => {
  const { token, backendUrl, logout } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const [summaries, setSummaries] = useState([]);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const headers = token ? { dtoken: token, Authorization: `Bearer ${token}` } : {};
        // Try a doctor-specific summaries endpoint (may not exist)
        const { data } = await axios.get(backendUrl + "/api/doctor/ai-summaries", { headers }).catch(()=>({ success:false }));
        if (data && data.success && Array.isArray(data.summaries)) {
          setSummaries(data.summaries);
        } else {
          // Fallback: fetch dashboard and build summaries from latestAppointments
          const dash = await axios.get(backendUrl + "/api/doctor/dashboard", { headers }).then(r=>r.data).catch(()=>null);
          const list = (dash && dash.success && (dash.dashData?.latestAppointments || dash.dashData?.latest_appointments || dash.dashData?.latestAppointments)) || (dash && dash.latestAppointments) || [];
          const built = (list || []).map((a) => ({
            id: a.id || a._id || a.appointment_id || Math.random().toString(36).slice(2,9),
            patientName: a.user?.name || a.patient_name || a.patientId || 'Unknown',
            date: a.slotDate || a.scheduledAt || a.date || a.scheduled_at,
            aiSummary: a.consultation_summary?.aiSummary || a.consultation_summary?.ai_summary || null,
            snippet: a.notes || a.summary || a.consultation_summary?.doctorNotes || null,
          }));
          setSummaries(built);
        }
      } catch (err) {
        setError(err.message || 'Failed to load summaries');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [backendUrl, token]);

  const filtered = summaries.filter(s => {
    if (!query) return true;
    return (s.patientName || '').toLowerCase().includes(query.toLowerCase()) || (s.snippet||'').toLowerCase().includes(query.toLowerCase()) || (s.aiSummary||'').toLowerCase().includes(query.toLowerCase());
  });

  return (
    <div className="pp-page">
      <div className="pp-container">
        <DoctorSidebar />
        <main className="pp-main-content">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <a href="/doctor-portal" style={{color:'#6b7280',fontSize:13}}>← Back to Dashboard</a>
              <h1 className="text-2xl font-semibold" style={{marginTop:8}}>AI Summaries</h1>
            </div>
            <div>
              <button className="pp-btn pp-btn-secondary" onClick={logout}>Logout</button>
            </div>
          </div>

          <div className="pp-panel" style={{marginTop:12}}>
            <div style={{display:'flex',gap:8}}>
              <input className="pp-chat-input" placeholder="Search by patient or text" value={query} onChange={e=>setQuery(e.target.value)} />
            </div>
          </div>

          <section className="pp-section" style={{marginTop:12}}>
            <h2 className="pp-section-title">Summaries</h2>
            {loading && <p>Loading...</p>}
            {error && <p style={{color:'crimson'}}>{error}</p>}
            <div style={{display:'grid',gap:8}}>
              {filtered.length === 0 && <div className="pp-panel">No summaries found.</div>}
              {filtered.map(s => (
                <SummaryCard key={s.id} s={s} onView={(sel)=>setSelected(sel)} />
              ))}
            </div>
          </section>

          {selected && (
            <div className="pp-panel" style={{marginTop:12}}>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <div>
                  <div style={{fontWeight:700}}>{selected.patientName}</div>
                  <div style={{color:'#6b7280'}}>{selected.date}</div>
                </div>
                <div>
                  <button className="pp-btn pp-btn-outline" onClick={()=>setSelected(null)}>Close</button>
                </div>
              </div>
              <div style={{marginTop:12,whiteSpace:'pre-wrap'}}>{selected.aiSummary || selected.snippet || 'No AI summary available for this consultation.'}</div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default DoctorAISummaries;
