import { useState, useContext, useEffect } from "react";
import axios from "axios";
import DoctorSidebar from "../components/DoctorSidebar";
import { AppContext } from "../context/AppContext";
import "./PatientPortal.css";

const Tab = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3 py-2 rounded ${active ? 'bg-primary text-white' : 'bg-transparent'}`}>
    {children}
  </button>
);

const ReportCard = ({ r }) => (
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',border:'1px solid var(--pp-border)',padding:12,marginBottom:12}}>
    <div>
      <div style={{fontWeight:600}}>{r.title || r.report_type || 'Lab Report'}</div>
      <div style={{color:'#6b7280'}}>{r.date || r.createdAt || ''}</div>
    </div>
    <div style={{display:'flex',gap:8}}>
      <button className="pp-btn pp-btn-outline pp-btn-sm">View</button>
      <button className="pp-btn pp-btn-outline pp-btn-sm">Download</button>
    </div>
  </div>
);

const DoctorPatientHistory = () => {
  const { token, backendUrl, logout } = useContext(AppContext);
  const [patientId, setPatientId] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [consultations, setConsultations] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [labReports, setLabReports] = useState([]);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('consultations');

  const headers = token ? { Authorization: `Bearer ${token}`, dtoken: token } : {};

  const clearData = () => {
    setProfile(null);
    setConsultations([]);
    setPrescriptions([]);
    setLabReports([]);
  };

  const search = async () => {
    if (!patientId || !String(patientId).trim()) return setError('Enter patient id or name');
    setError(null);
    setLoading(true);
    clearData();
    try {
      // Try a doctor-scoped endpoint first (may not exist). If it fails, fall back to showing placeholders.
      const url = `${backendUrl}/api/doctor/patient/${encodeURIComponent(patientId)}/history`;
      const { data } = await axios.get(url, { headers }).catch(() => ({ success: false }));
      if (data && data.success) {
        setProfile(data.profile || data.patient || null);
        setConsultations(data.consultations || data.history?.consultations || []);
        setPrescriptions(data.prescriptions || []);
        setLabReports(data.labReports || data.reports || []);
      } else {
        // No doctor endpoint - try public patient reports endpoint (may require patient role)
        // We'll show informational placeholders instead of failing silently.
        setError('No doctor-scoped patient endpoint found. Displaying placeholders.');
        // Populate UI with empty arrays so wireframe appears
        setProfile({ name: 'John Doe', id: patientId, age: 34, blood_group: 'A+', allergies: 'None', contact: '999-999-9999', emergency_contact: '888-888-8888' });
        setConsultations([
          { id: 'c1', diagnosis: 'Hypertension', doctor: 'Dr. A', date: '2026-04-01', notes: 'Follow-up in 2 weeks' },
          { id: 'c2', diagnosis: 'Diabetes', doctor: 'Dr. B', date: '2026-02-15', notes: 'Prescribed metformin' },
        ]);
        setPrescriptions([
          { id: 'p1', date: '2026-04-01', medication: 'Metformin', dosage: '500mg', duration: '30 days', prescribed_by: 'Dr. B' },
        ]);
        setLabReports([
          { id: 'r1', title: 'Complete Blood Count', date: '2026-03-20', fileUrl: '#' },
        ]);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>{
    // reset active tab when searching new patient
    setActiveTab('consultations');
  }, [profile]);

  return (
    <div className="pp-page">
      <div className="pp-container">
        <DoctorSidebar />
        <main className="pp-main-content">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <a href="/doctor-portal" style={{color:'#6b7280',fontSize:13}}>← Back to Dashboard</a>
              <h1 className="text-2xl font-semibold" style={{marginTop:8}}>Patient History</h1>
            </div>
            <div>
              <button className="pp-btn pp-btn-secondary" onClick={logout}>Logout</button>
            </div>
          </div>

          <div className="pp-panel" style={{marginTop:12}}>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <input className="pp-chat-input" placeholder="Enter patient id or name" value={patientId} onChange={e=>setPatientId(e.target.value)} />
              <button className="pp-btn pp-btn-primary" onClick={search} disabled={loading}>{loading? 'Searching...':'Search'}</button>
              <button className="pp-btn pp-btn-outline">Scan QR</button>
            </div>
            {error && <p style={{color:'crimson',marginTop:8}}>{error}</p>}
          </div>

          {/* Patient overview */}
          <div className="pp-panel" style={{marginTop:12}}>
            <div style={{display:'flex',gap:16}}>
              <div style={{width:160}}>
                <div style={{width:120,height:120,background:'#f1f5f9',borderRadius:8}} />
                <div style={{marginTop:8,color:'#6b7280'}}>{profile?.name || '—'}</div>
              </div>
              <div style={{flex:1}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <div className="pp-panel" style={{padding:8}}>
                    <div style={{fontSize:12,color:'#64748b'}}>Patient ID</div>
                    <div style={{fontWeight:700}}>{profile?.id || profile?.userId || '—'}</div>
                  </div>
                  <div className="pp-panel" style={{padding:8}}>
                    <div style={{fontSize:12,color:'#64748b'}}>Age</div>
                    <div style={{fontWeight:700}}>{profile?.age || '—'}</div>
                  </div>
                  <div className="pp-panel" style={{padding:8}}>
                    <div style={{fontSize:12,color:'#64748b'}}>Blood Group</div>
                    <div style={{fontWeight:700}}>{profile?.blood_group || '—'}</div>
                  </div>
                  <div className="pp-panel" style={{padding:8}}>
                    <div style={{fontSize:12,color:'#64748b'}}>Allergies</div>
                    <div style={{fontWeight:700}}>{profile?.allergies || '—'}</div>
                  </div>
                  <div className="pp-panel" style={{padding:8}}>
                    <div style={{fontSize:12,color:'#64748b'}}>Contact</div>
                    <div style={{fontWeight:700}}>{profile?.contact || '—'}</div>
                  </div>
                  <div className="pp-panel" style={{padding:8}}>
                    <div style={{fontSize:12,color:'#64748b'}}>Emergency Contact</div>
                    <div style={{fontWeight:700}}>{profile?.emergency_contact || '—'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{marginTop:12}}>
            <div style={{display:'flex',gap:8}}>
              <Tab active={activeTab==='consultations'} onClick={()=>setActiveTab('consultations')}>Consultations</Tab>
              <Tab active={activeTab==='prescriptions'} onClick={()=>setActiveTab('prescriptions')}>Prescriptions</Tab>
              <Tab active={activeTab==='labReports'} onClick={()=>setActiveTab('labReports')}>Lab Reports</Tab>
            </div>
            <hr style={{marginTop:8,marginBottom:12,border:'none',height:2,background:'#e6eefc'}} />
          </div>

          {/* Consultations list */}
          {activeTab === 'consultations' && (
            <div>
              <h2 className="pp-section-title">Recent Consultations</h2>
              <div className="pp-panel">
                {consultations.length === 0 && <p className="text-sm text-gray-600">No consultations available.</p>}
                {consultations.map(c => (
                  <div key={c.id || c._id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:12,borderBottom:'1px solid var(--pp-border-light)'}}>
                    <div>
                      <div style={{fontWeight:600}}>{c.diagnosis || c.title || '—'}</div>
                      <div style={{color:'#6b7280'}}>{c.date || c.slotDate || ''} — {c.doctor || c.doctorName || '—'}</div>
                    </div>
                    <div>
                      <button className="pp-btn pp-btn-outline" style={{marginRight:8}}>View Full Report</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prescriptions table */}
          {activeTab === 'prescriptions' && (
            <div style={{marginTop:12}}>
              <h2 className="pp-section-title">Prescription History</h2>
              <div className="pp-table-container">
                <table className="pp-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Medication</th>
                      <th>Dosage</th>
                      <th>Duration</th>
                      <th>Prescribed By</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptions.length === 0 && <tr><td colSpan={6} className="p-4">No prescriptions found.</td></tr>}
                    {prescriptions.map(p => (
                      <tr key={p.id || p._id}>
                        <td>{p.date || '—'}</td>
                        <td>{p.medication || p.name || '—'}</td>
                        <td>{p.dosage || '—'}</td>
                        <td>{p.duration || '—'}</td>
                        <td>{p.prescribed_by || p.prescribedBy || '—'}</td>
                        <td>
                          <div className="pp-appointment-actions">
                            <button className="pp-btn pp-btn-outline pp-btn-sm">View</button>
                            <button className="pp-btn pp-btn-outline pp-btn-sm">Download</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Lab reports */}
          {activeTab === 'labReports' && (
            <div style={{marginTop:12}}>
              <h2 className="pp-section-title">Laboratory Reports</h2>
              <div>
                {labReports.length === 0 && <p className="text-sm text-gray-600">No lab reports.</p>}
                {labReports.map(r => <ReportCard key={r.id || r._id} r={r} />)}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default DoctorPatientHistory;
