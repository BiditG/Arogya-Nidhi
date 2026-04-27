import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { patientPortalApi } from '../utils/patientPortalApi';

export default function PublicChat() {
  const backendUrl = window.__env?.BACKEND_URL || import.meta.env.VITE_BACKEND_URL || '';
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await patientPortalApi.getPublicQueries(backendUrl, { page: 1, limit: 50 });
      setQueries(res.queries || []);
    } catch (err) {
      console.error('Failed to load public queries', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Public Health Forum</h1>
      {loading && <div>Loading...</div>}
      {!loading && queries.length === 0 && <div>No public queries yet.</div>}
      <ul className="space-y-3">
        {queries.map((q) => (
          <li key={q.id} className="p-3 border rounded">
            <Link to={`/public-queries/${q.id}`} className="font-medium text-lg">{q.title}</Link>
            <div className="text-sm text-gray-600">Posted: {new Date(q.created_at).toLocaleString()}</div>
            <div className="mt-2 text-gray-800">{q.symptom_text ? q.symptom_text.slice(0,200) : ''}</div>
            <div className="mt-2 text-sm">Responses: {(q.responses || []).length}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
