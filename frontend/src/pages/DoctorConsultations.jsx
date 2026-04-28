import { useEffect, useState, useContext } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import DoctorSidebar from "../components/DoctorSidebar";
import { AppContext } from "../context/AppContext";
import "./PatientPortal.css";

const FilterBar = ({ onFilter }) => {
  const [q, setQ] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  return (
    <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center'}}>
      <input className="pp-chat-input" placeholder="Search patient" value={q} onChange={e=>setQ(e.target.value)} />
      <input className="pp-chat-input" placeholder="Date" value={date} onChange={e=>setDate(e.target.value)} />
      <input className="pp-chat-input" placeholder="Type" value={type} onChange={e=>setType(e.target.value)} />
      <select className="pp-chat-input" value={status} onChange={e=>setStatus(e.target.value)}>
        <option value="">All status</option>
        <option value="active">Active</option>
        <option value="completed">Completed</option>
      </select>
      <button className="pp-btn pp-btn-primary" onClick={() => onFilter({ q, date, type, status })}>Filter</button>
    </div>
  );
};

const ConsultationForm = ({ consult, onChange, onSave, onGenerate, onEnd }) => {
  if (!consult) return <div className="pp-panel">No active consultation selected.</div>;
  return (
    <div className="pp-panel">
      <div style={{display:'grid',gridTemplateColumns:'280px 1fr',gap:16}}>
        <div>
          <div style={{width:140,height:140,background:'#f1f5f9',borderRadius:8}} />
          <div style={{marginTop:8,fontWeight:700}}>{consult.user?.name || consult.patient_name || 'Unknown'}</div>
          <div style={{color:'#6b7280'}}>{consult.user?.email || ''}</div>
          <button className="pp-btn pp-btn-outline" style={{marginTop:12}}>View Full History</button>
        </div>

        <div>
          <div style={{marginBottom:8}}>
            <label className="pp-section-title">Chief Complaint:</label>
            <textarea className="pp-chat-input" rows={2} value={consult.chiefComplaint || ''} onChange={(e)=>onChange('chiefComplaint', e.target.value)} />
          </div>

          <div style={{marginBottom:8}}>
            <label className="pp-section-title">Symptoms:</label>
            <textarea className="pp-chat-input" rows={3} value={consult.symptoms || ''} onChange={(e)=>onChange('symptoms', e.target.value)} />
          </div>

          <div style={{marginBottom:8}}>
            <label className="pp-section-title">Diagnosis:</label>
            <textarea className="pp-chat-input" rows={2} value={consult.diagnosis || ''} onChange={(e)=>onChange('diagnosis', e.target.value)} />
          </div>

          <div style={{marginBottom:8}}>
            <label className="pp-section-title">Prescription:</label>
            <textarea className="pp-chat-input" rows={3} value={consult.prescription || ''} onChange={(e)=>onChange('prescription', e.target.value)} />
          </div>

          <div style={{marginBottom:8}}>
            <label className="pp-section-title">Recommended Tests:</label>
            <input className="pp-chat-input" value={consult.recommendedTests || ''} onChange={(e)=>onChange('recommendedTests', e.target.value)} />
          </div>

          <div style={{marginBottom:8}}>
            <label className="pp-section-title">Follow-up Instructions:</label>
            <textarea className="pp-chat-input" rows={2} value={consult.followUp || ''} onChange={(e)=>onChange('followUp', e.target.value)} />
          </div>

          <div style={{display:'flex',gap:8,marginTop:8}}>
            <button className="pp-btn pp-btn-secondary" onClick={onSave}>Save Notes</button>
            <button className="pp-btn pp-btn-outline" onClick={onGenerate}>Generate Prescription</button>
            <button className="pp-btn pp-btn-primary" onClick={onEnd}>End Consultation</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AiReference = ({ onRefresh, summary }) => (
  <div className="pp-panel" style={{marginTop:12}}>
    <div className="pp-section-title">AI Patient Summary</div>
    <div style={{background:'#f8fafc',padding:12,minHeight:80}}>{summary || 'No summary yet.'}</div>
    <div style={{marginTop:8}}>
      <button className="pp-btn pp-btn-outline" onClick={onRefresh}>Refresh Summary</button>
    </div>
  </div>
);

const IoTPanel = ({ title, children }) => (
  <div className="pp-panel">
    <div style={{fontWeight:700,marginBottom:8}}>{title}</div>
    {children}
    <div style={{marginTop:8}}>
      <button className="pp-btn pp-btn-outline pp-btn-sm">View Detailed Analysis</button>
    </div>
  </div>
);

const DoctorConsultations = () => {
  const { token, backendUrl, logout } = useContext(AppContext);
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState({});
  const [active, setActive] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [loading, setLoading] = useState(false);

  const headers = token ? { Authorization: `Bearer ${token}`, dtoken: token } : {};

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(backendUrl + '/api/doctor/appointments', { headers });
      if (data.success) setAppointments((data.appointments || []).reverse());
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to fetch appointments');
    } finally { setLoading(false); }
  };

  useEffect(()=>{ if (token) load(); }, [token]);

  useEffect(()=>{
    if (!active) {
      // set first scheduled or pending as active
      const first = appointments.find(a => ['scheduled','pending'].includes((a.status||'').toLowerCase()));
      if (first) setActive({ ...first, chiefComplaint: first.chiefComplaint || '', symptoms: first.symptoms || '', diagnosis: first.diagnosis || '', prescription: first.prescription || '', recommendedTests: first.recommendedTests || '', followUp: first.followUp || '' });
    }
  }, [appointments]);

  const applyFilter = (f) => setFilter(f);

  const filtered = appointments.filter(a => {
    if (filter.q && !( (a.user?.name||'').toLowerCase().includes(filter.q.toLowerCase()) || (a.patient_name||'').toLowerCase().includes(filter.q.toLowerCase()) )) return false;
    if (filter.status && filter.status !== '') {
      if ((a.status||'').toLowerCase() !== filter.status) return false;
    }
    return true;
  });

  const changeActiveField = (key, value) => {
    setActive(prev => ({...prev, [key]: value}));
  };

  const saveNotes = () => {
    toast.info('Notes saved locally. Implement backend endpoint to persist.');
  };

  const generatePrescription = () => {
    toast.info('Prescription generated (placeholder).');
  };

  const endConsultation = async () => {
    if (!active) return toast.error('No active consultation');
    try {
      const { data } = await axios.post(backendUrl + '/api/doctor/complete-appointment', { appointmentId: active.id || active._id }, { headers });
      if (data.success) {
        toast.success(data.message || 'Consultation ended');
        setActive(null);
        load();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to end consultation');
    }
  };

  const refreshAi = () => {
    // placeholder for calling AI service
    setAiSummary('AI summary refreshed — integrate AI endpoint to generate real summary.');
  };

  return (
    <div className="pp-page">
      <div className="pp-container">
        <DoctorSidebar />

        <main className="pp-main-content">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div>
              <a href="/doctor-portal" style={{color:'#6b7280',fontSize:13}}>← Back to Dashboard</a>
              <h1 className="text-2xl font-semibold" style={{marginTop:8}}>Consultations</h1>
            </div>
            <div>
              <button className="pp-btn pp-btn-secondary" onClick={logout}>Logout</button>
            </div>
          </div>

          <FilterBar onFilter={applyFilter} />

          <div style={{marginTop:8}}>
            <h2 className="pp-section-title">Active Consultation</h2>
            <ConsultationForm consult={active} onChange={changeActiveField} onSave={saveNotes} onGenerate={generatePrescription} onEnd={endConsultation} />
          </div>

          <div style={{marginTop:16}}>
            <h2 className="pp-section-title">AI Reference</h2>
            <AiReference summary={aiSummary} onRefresh={refreshAi} />
          </div>

          <div style={{marginTop:16}}>
            <h2 className="pp-section-title">IOT Device Data</h2>
            <div className="pp-bottom-grid">
              <IoTPanel title="Tremor Analysis">
                <div style={{height:100,background:'#f8fafc',borderRadius:4}}></div>
              </IoTPanel>
              <IoTPanel title="Reaction Time Test">
                <div style={{height:100,background:'#f8fafc',borderRadius:4}}></div>
              </IoTPanel>
            </div>
            <div style={{marginTop:8}}>
              <button className="pp-btn pp-btn-outline">View all IOT data</button>
              <button className="pp-btn pp-btn-outline" style={{marginLeft:8}}>Export data</button>
            </div>
          </div>

          <div style={{marginTop:20}}>
            <h2 className="pp-section-title">Consultation History</h2>
            <div className="pp-table-container">
              <table className="pp-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Patient</th>
                    <th>Type</th>
                    <th>Diagnosis</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.filter(a=> (a.status||'').toLowerCase() === 'completed').map(a => (
                    <tr key={a.id || a._id}>
                      <td>{a.slotDate || a.date || '—'}</td>
                      <td>{a.user?.name || a.patient_name || '—'}</td>
                      <td>{a.type || '—'}</td>
                      <td>{a.diagnosis || '—'}</td>
                      <td>
                        <div className="pp-appointment-actions">
                          <button className="pp-btn pp-btn-outline pp-btn-sm" onClick={()=>setActive(a)}>View</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DoctorConsultations;
