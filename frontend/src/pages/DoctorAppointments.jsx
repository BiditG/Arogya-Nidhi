import { useEffect, useState, useContext } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import DoctorSidebar from "../components/DoctorSidebar";
import { AppContext } from "../context/AppContext";
import "./PatientPortal.css";

const FilterBar = ({ onFilter }) => {
  const [q, setQ] = useState("");
  const [range, setRange] = useState("");
  const [status, setStatus] = useState("");
  return (
    <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center'}}>
      <input className="pp-chat-input" placeholder="Search patient" value={q} onChange={e=>setQ(e.target.value)} />
      <input className="pp-chat-input" placeholder="Date range" value={range} onChange={e=>setRange(e.target.value)} />
      <select className="pp-chat-input" value={status} onChange={e=>setStatus(e.target.value)}>
        <option value="">All status</option>
        <option value="pending">Pending</option>
        <option value="scheduled">Scheduled</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <button className="pp-btn pp-btn-primary" onClick={() => onFilter({ q, range, status })}>Filter</button>
    </div>
  );
};

const PendingCard = ({ a, onAccept, onReject, onView }) => (
  <div style={{border:'1px solid #e5e7eb', padding:12, marginBottom:12, display:'flex', alignItems:'center', justifyContent:'space-between'}}>
    <div style={{display:'flex', gap:12, alignItems:'center'}}>
      <div style={{width:56,height:56,background:'#f1f5f9',borderRadius:8}} />
      <div>
        <div style={{fontWeight:600}}>{a.user?.name || a.patient_name || 'Unknown'}</div>
        <div style={{color:'#6b7280'}}>{a.slotDate || a.date || ''} {a.slotTime || a.time || ''}</div>
      </div>
    </div>
    <div style={{display:'flex', gap:8}}>
      <button className="pp-btn pp-btn-outline" onClick={()=>onAccept(a)}>Accept</button>
      <button className="pp-btn pp-btn-outline" onClick={()=>onReject(a)}>Reject</button>
      <button className="pp-btn pp-btn-outline" onClick={()=>onView(a)}>View Details</button>
    </div>
  </div>
);

const DoctorAppointments = () => {
  const { token, backendUrl, logout } = useContext(AppContext);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({});

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

  useEffect(()=>{ if (!token) return; load(); }, [token]);

  const applyFilter = ({ q, range, status }) => {
    setFilter({ q, range, status });
  };

  const filtered = appointments.filter((a) => {
    if (filter.status && (a.status || '').toLowerCase() !== filter.status) return false;
    if (filter.q) {
      const name = (a.user?.name || a.patient_name || '').toLowerCase();
      if (!name.includes(filter.q.toLowerCase())) return false;
    }
    return true;
  });

  const accept = async (a) => {
    // No dedicated 'accept' endpoint exists in backend. Optimistically update UI and remind to add backend support.
    try {
      const updated = appointments.map(x => x.id === a.id ? {...x, status: 'scheduled'} : x);
      setAppointments(updated);
      toast.info('Accepted locally. Add backend endpoint to persist schedule.');
    } catch (err) {
      toast.error('Failed to accept');
    }
  };

  const reject = async (a) => {
    try {
      const { data } = await axios.post(backendUrl + '/api/doctor/cancel-appointment', { appointmentId: a.id }, { headers });
      if (data.success) {
        toast.success(data.message || 'Rejected');
        load();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    }
  };

  const complete = async (a) => {
    try {
      const { data } = await axios.post(backendUrl + '/api/doctor/complete-appointment', { appointmentId: a.id }, { headers });
      if (data.success) {
        toast.success(data.message || 'Marked completed');
        load();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete');
    }
  };

  return (
    <div className="pp-page">
      <div className="pp-container">
        <DoctorSidebar />

        <main className="pp-main-content">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div>
              <a href="/doctor-portal" style={{color:'#6b7280',fontSize:13}}>← Back to Dashboard</a>
              <h1 className="text-2xl font-semibold" style={{marginTop:8}}>Manage Appointments</h1>
            </div>
            <div>
              <button className="pp-btn pp-btn-secondary" onClick={logout}>Logout</button>
            </div>
          </div>

          <FilterBar onFilter={applyFilter} />

          <div style={{display:'flex',gap:8,marginBottom:12}}>
            {['pending','scheduled','completed','cancelled'].map(s=> (
              <button key={s} className={`pp-btn ${filter.status===s? 'pp-btn-primary':'pp-btn-outline'}`} onClick={()=>setFilter(prev=>({...prev,status: prev.status===s? '': s}))}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>
            ))}
          </div>

          <section style={{marginTop:8}}>
            <h2 className="pp-section-title">Pending Appointment Requests</h2>
            <div>
              {(filtered.filter(a=> (a.status||'').toLowerCase() === 'pending')).length === 0 && <p className="text-sm text-gray-600">No pending requests.</p>}
              {filtered.filter(a=> (a.status||'').toLowerCase() === 'pending').map(a=> (
                <PendingCard key={a.id || a._id} a={a} onAccept={accept} onReject={reject} onView={(x)=>window.location.assign(`/doctor-portal/appointments/${x.id || x._id}`)} />
              ))}
            </div>
          </section>

          <section style={{marginTop:20}}>
            <h2 className="pp-section-title">Scheduled Appointments</h2>
            <div className="pp-table-container">
              <table className="pp-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.filter(a=> (a.status||'').toLowerCase() === 'scheduled').map(a=> (
                    <tr key={a.id || a._id}>
                      <td>{a.user?.name || a.patient_name || '—'}</td>
                      <td>{a.slotDate || a.date || '—'}</td>
                      <td>{a.slotTime || a.time || '—'}</td>
                      <td>{a.type || '—'}</td>
                      <td>
                        <div className="pp-appointment-actions">
                          <button className="pp-btn pp-btn-outline pp-btn-sm" onClick={()=>window.location.assign(`/doctor-portal/appointments/${a.id || a._id}`)}>View</button>
                          <button className="pp-btn pp-btn-primary pp-btn-sm" onClick={()=>complete(a)}>Complete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section style={{marginTop:20}}>
            <h2 className="pp-section-title">Patient History</h2>
            <div className="pp-panel">
              <div style={{display:'flex',gap:8}}>
                <input className="pp-chat-input" placeholder="Enter patient ID" />
                <button className="pp-btn pp-btn-primary">Search</button>
              </div>
            </div>
          </section>

          <section style={{marginTop:20}}>
            <h2 className="pp-section-title">Active Consultation</h2>
            <div className="pp-bottom-grid">
              <div className="pp-panel">
                <div style={{display:'flex',gap:12}}>
                  <div style={{width:80,height:80,background:'#f1f5f9',borderRadius:8}} />
                  <div>
                    <div style={{fontWeight:700}}>Patient Name</div>
                    <div style={{color:'#6b7280'}}>Age / Gender</div>
                    <div style={{marginTop:8}}>Short notes and conversation area placeholder.</div>
                  </div>
                </div>
              </div>
              <div className="pp-panel">
                <div style={{marginBottom:8}}>AI Summary & IOT Data</div>
                <button className="pp-btn pp-btn-outline pp-btn-sm">View Full AI Summary</button>
                <button className="pp-btn pp-btn-outline pp-btn-sm" style={{marginLeft:8}}>View IOT Test Data</button>
              </div>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
};

export default DoctorAppointments;
