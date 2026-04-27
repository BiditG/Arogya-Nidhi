import 'dotenv/config';
import fetch from 'node-fetch';

(async () => {
  try {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    console.log('Using SUPABASE_URL', SUPABASE_URL ? '(set)' : '(missing)');
    console.log('Using SUPABASE_KEY', SUPABASE_KEY ? '(set)' : '(missing)');
    console.log('Using SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY ? '(set)' : '(missing)');

    const table = 'mcq_questions';
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`;
    const authKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY;
    const apikeyHeader = SUPABASE_KEY || SUPABASE_SERVICE_ROLE_KEY;
    console.log('Requesting', url);
    const r = await fetch(url, { headers: { apikey: apikeyHeader, Authorization: `Bearer ${authKey}`, Accept: 'application/json' } });
    console.log('Status:', r.status);
    const txt = await r.text();
    console.log('Body:', txt);
  } catch (err) {
    console.error('Error:', err);
  }
})();
