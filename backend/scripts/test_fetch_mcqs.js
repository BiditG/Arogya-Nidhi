import fetch from 'node-fetch';

(async () => {
  try {
    const url = 'http://localhost:3001/api/students/mcqs?limit=1&table=mcq_questions';
    console.log('Requesting', url);
    const r = await fetch(url, {headers: {Accept: 'application/json'}});
    console.log('Status:', r.status, r.statusText);
    const txt = await r.text();
    console.log('Body:', txt);
  } catch (err) {
    console.error('Fetch failed:', err);
    process.exit(1);
  }
})();
