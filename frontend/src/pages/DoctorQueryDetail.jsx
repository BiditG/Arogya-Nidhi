import { useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { patientPortalApi } from '../utils/patientPortalApi';

const DoctorQueryDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { backendUrl } = useContext(AppContext);
  const [dtoken] = useState(location.state?.dtoken || localStorage.getItem('dtoken') || '');
  const [query, setQuery] = useState(null);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState('');

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, dtoken]);

  const load = async () => {
    if (!dtoken) return;
    setLoading(true);
    try {
      const q = await patientPortalApi.getDoctorQueryById(backendUrl, dtoken, id);
      setQuery(q);
    } catch (err) {
      console.error('Failed to load query', err);
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim()) return;
    try {
      await patientPortalApi.createDoctorResponse(backendUrl, dtoken, id, { responseText: answer.trim() });
      setAnswer('');
      load();
    } catch (err) {
      console.error('Failed to post response', err);
    }
  };

  if (!dtoken) return <div>Please provide a doctor token in the list page.</div>;

  return (
    <div style={{padding:20}}>
      <button onClick={()=>navigate(-1)}>Back</button>
      {loading ? <div>Loading...</div> : (
        query ? (
          <div>
            <h2>{query.title}</h2>
            <div>Patient: {query.patient?.user?.name || 'Anonymous'}</div>
            <p style={{whiteSpace:'pre-wrap'}}>{query.symptom_text || query.symptomText}</p>

            <h3>Responses</h3>
            <div>
              {(query.responses || []).map(r => (
                <div key={r.id} style={{border:'1px solid #ddd', padding:10, marginBottom:8}}>
                  <div><strong>{r.doctor?.user?.name || 'Doctor'}</strong> · {new Date(r.created_at || r.createdAt).toLocaleString()}</div>
                  <div style={{whiteSpace:'pre-wrap'}}>{r.response_text || r.responseText}</div>
                </div>
              ))}
            </div>

            <div style={{marginTop:20}}>
              <textarea value={answer} onChange={(e)=>setAnswer(e.target.value)} rows={6} style={{width:'100%'}} />
              <div style={{marginTop:8}}>
                <button onClick={submitAnswer}>Post Answer</button>
              </div>
            </div>
          </div>
        ) : <div>Query not found</div>
      )}
    </div>
  );
};

export default DoctorQueryDetail;
