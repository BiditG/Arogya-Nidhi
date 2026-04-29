import fetch from 'node-fetch';

(async function(){
  try {
    const res = await fetch('http://localhost:3001/api/ai/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'student', text: 'I have a headache and fever' }] })
    });
    console.log('status', res.status);
    const text = await res.text();
    console.log(text);
  } catch (err) {
    console.error('error', err);
  }
})();