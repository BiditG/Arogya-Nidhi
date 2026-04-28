import { useEffect, useState, useContext } from "react";
import axios from "axios";
import DoctorSidebar from "../components/DoctorSidebar";
import { AppContext } from "../context/AppContext";
import "./PatientPortal.css";

const EarningsCard = ({ label, value }) => (
  <div className="pp-stat-card">
    <div className="pp-stat-label">{label}</div>
    <div className="pp-stat-value">{value}</div>
  </div>
);

const TransactionsTable = ({ transactions = [] }) => (
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
        {transactions.length === 0 && (
          <tr><td colSpan={6} className="p-4">No transactions found.</td></tr>
        )}
        {transactions.map((t) => (
          <tr key={t.id || t._id}>
            <td>{t.slotDate || t.date || (t.createdAt || '').slice(0,10)}</td>
            <td>{t.user?.name || t.patient_name || '—'}</td>
            <td>{t.service || t.type || 'Consultation'}</td>
            <td>{t.amount != null ? `₹${t.amount}` : '—'}</td>
            <td>{t.payment ? 'Paid' : 'Pending'}</td>
            <td>
              <div className="pp-appointment-actions">
                <button className="pp-btn pp-btn-outline pp-btn-sm">View</button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const DoctorEarnings = () => {
  const { token, backendUrl, logout } = useContext(AppContext);
  const [dash, setDash] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  const headers = token ? { Authorization: `Bearer ${token}`, dtoken: token } : {};

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [{ data: dashData }, { data: apptData }] = await Promise.all([
          axios.get(backendUrl + '/api/doctor/dashboard', { headers }).catch(e => ({ data: {} })),
          axios.get(backendUrl + '/api/doctor/appointments', { headers }).catch(e => ({ data: {} })),
        ]);
        if (dashData?.success) setDash(dashData.dashData || dashData.dashData);
        if (apptData?.success) setTransactions((apptData.appointments || []).filter(a => a.amount));
      } catch (err) {
        console.error(err);
      } finally { setLoading(false); }
    };
    if (token) load();
  }, [backendUrl, token]);

  const monthly = dash?.monthly || [];

  return (
    <div className="pp-page">
      <div className="pp-container">
        <DoctorSidebar />
        <main className="pp-main-content">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <a href="/doctor-portal" style={{color:'#6b7280',fontSize:13}}>← Back to Dashboard</a>
              <h1 className="text-2xl font-semibold" style={{marginTop:8}}>Earnings & Revenue</h1>
            </div>
            <div>
              <button className="pp-btn pp-btn-secondary" onClick={logout}>Logout</button>
            </div>
          </div>

          <section className="pp-section" style={{marginTop:12}}>
            <div className="pp-stats-grid">
              <EarningsCard label="Total Earnings" value={dash?.earning || '₹0'} />
              <EarningsCard label="This Month" value={dash?.thisMonth || '₹0'} />
              <EarningsCard label="Pending Payment" value={dash?.pending || '₹0'} />
              <EarningsCard label="Avg per Consultation" value={dash?.avgPerConsultation || '₹0'} />
            </div>
          </section>

          <section className="pp-section" style={{marginTop:18}}>
            <h2 className="pp-section-title">Monthly Earnings Trend</h2>
            <div className="pp-panel" style={{height:220, display:'flex', alignItems:'center', justifyContent:'center'}}>
              <div style={{width:'100%'}}>
                <div style={{display:'flex',gap:8,alignItems:'flex-end',height:140}}>
                  {(monthly.length ? monthly : [3,6,9,4,11,8]).map((v,i)=> (
                    <div key={i} style={{flex:1,background:'#e6eefc',height:`${(v||0)*8}px`,borderRadius:4}} />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section style={{marginTop:18}}>
            <h2 className="pp-section-title">Recent Transactions</h2>
            <TransactionsTable transactions={transactions} />
          </section>

          <section style={{marginTop:18}}>
            <h2 className="pp-section-title">Payout Methods</h2>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div className="pp-panel">
                <div style={{fontWeight:700,marginBottom:8}}>Bank Account</div>
                <div style={{color:'#6b7280'}}>Account ending ••••1234</div>
                <div style={{marginTop:12}}>
                  <button className="pp-btn pp-btn-outline">Update</button>
                </div>
              </div>
              <div className="pp-panel">
                <div style={{fontWeight:700,marginBottom:8}}>Tax Information</div>
                <div style={{color:'#6b7280'}}>GST / Tax details</div>
                <div style={{marginTop:12}}>
                  <button className="pp-btn pp-btn-outline">Manage</button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default DoctorEarnings;
