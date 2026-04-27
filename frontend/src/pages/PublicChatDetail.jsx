import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { patientPortalApi } from '../utils/patientPortalApi';

export default function PublicChatDetail(){
  const { id } = useParams();
  const backendUrl = window.__env?.BACKEND_URL || import.meta.env.VITE_BACKEND_URL || '';
  const [query, setQuery] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dtoken, setDtoken] = useState('');
  const [replyText, setReplyText] = useState('');

  const load = async () => {
    setLoading(true);
    try{
      const res = await patientPortalApi.getPublicQueryById(backendUrl, id);
      setQuery(res);
    }catch(err){
      console.error('Failed to load public query', err);
    }finally{setLoading(false);}  
  };

  useEffect(()=>{ load(); }, [id]);

  const handleReply = async () => {
    if (!dtoken.trim() || !replyText.trim()) return;
    try{
      await patientPortalApi.createDoctorResponse(backendUrl, dtoken.trim(), id, { responseText: replyText });
      setReplyText('');
      load();
    }catch(err){
      console.error('Reply failed', err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!query) return <div>Not found</div>;

  return (
    <div className="container mx-auto p-4">
      <Link to="/public-queries">← Back to Public Forum</Link>
      <h1 className="text-2xl font-semibold mt-2">{query.title}</h1>
      <div className="text-sm text-gray-600">Posted: {new Date(query.created_at).toLocaleString()}</div>
      <div className="mt-4 text-gray-800">{query.symptom_text}</div>

      <h2 className="text-xl font-medium mt-6">Responses</h2>
      <ul className="space-y-3 mt-3">
        {(query.responses || []).map(r => (
          <li key={r.id} className="p-3 border rounded">
            <div className="font-medium">{r.doctor?.user?.name || 'Doctor'}</div>
            <div className="text-sm text-gray-600">{new Date(r.createdAt).toLocaleString()}</div>
            <div className="mt-2">{r.responseText}</div>
          </li>
        ))}
      </ul>

      <div className="mt-6 p-4 border rounded">
        <h3 className="font-medium">Doctor Reply (paste your doctor token)</h3>
        <input value={dtoken} onChange={(e)=>setDtoken(e.target.value)} placeholder="Doctor token (dtoken)" className="w-full p-2 border mt-2" />
        <textarea value={replyText} onChange={(e)=>setReplyText(e.target.value)} placeholder="Your reply" className="w-full p-2 border mt-2" rows={4} />
        <button onClick={handleReply} className="mt-2 bg-primary text-white px-4 py-2 rounded">Post Reply</button>
      </div>
    </div>
  );
}
