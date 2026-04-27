import { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { patientPortalApi } from '../utils/patientPortalApi';
import './DoctorQueries.css';

const DoctorQueries = () => {
  const { backendUrl } = useContext(AppContext);
  const [dtoken, setDtoken] = useState(localStorage.getItem('dtoken') || '');
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dtoken]);

  const load = async () => {
    if (!dtoken) return;
    setLoading(true);
    try {
      const res = await patientPortalApi.getDoctorQueries(backendUrl, dtoken, { page: 1, limit: 50 });
      setQueries(res.queries || []);
    } catch (err) {
      console.error('Failed to load doctor queries', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dq-page">
      <header className="dq-header">
        <h1>Doctor — Patient Queries</h1>
        <div>
          <input placeholder="doctor token (dtoken)" value={dtoken} onChange={(e)=>setDtoken(e.target.value)} style={{width:300}} />
          <button onClick={load} className="dq-btn">Load</button>
        </div>
      </header>

      <main>
        {loading ? <div>Loading...</div> : (
          <div className="dq-list">
            {queries.length === 0 ? <div>No queries</div> : queries.map(q => (
              <div key={q.id} className="dq-card">
                <div className="dq-title">{q.title}</div>
                <div className="dq-meta">Posted: {new Date(q.created_at).toLocaleString()} · Responses: {q.responses?.length || 0}</div>
                <div className="dq-actions">
                  <Link to={`/doctor-portal/queries/${q.id}`} state={{ dtoken }}>{/* preserve token via state */}
                    <button className="dq-btn">Open</button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default DoctorQueries;
