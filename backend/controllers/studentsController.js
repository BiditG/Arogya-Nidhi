import fetch from "node-fetch";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_TABLE = process.env.MCQ_TABLE || "mcq_questions";

export const getMCQs = async (req, res) => {
  try {
    const { subject, topic, year, limit } = req.query;
    const table = req.query.table || DEFAULT_TABLE;

    // temporarily request all columns to inspect actual column names
    const select = `select=*`;
    const filters = [];
    if (subject) filters.push(`subject=eq.${encodeURIComponent(subject)}`);
    if (topic) filters.push(`topic=eq.${encodeURIComponent(topic)}`);
    if (year) filters.push(`year=eq.${encodeURIComponent(year)}`);
    const filterQuery = filters.length ? `&${filters.join("&")}` : "";
    const lim = limit ? `&limit=${Number(limit)}` : "";

    if (!SUPABASE_URL || !(SUPABASE_KEY || SUPABASE_SERVICE_ROLE_KEY)) {
      return res.status(500).json({ success: false, message: "Supabase not configured on server" });
    }

    // prefer service role for Authorization and anon key for apikey header
    const authKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY;
    const apikeyHeader = SUPABASE_KEY || SUPABASE_SERVICE_ROLE_KEY;

    const url = `${SUPABASE_URL}/rest/v1/${table}?${select}${filterQuery}${lim}`;
    console.log('[studentsController] Supabase URL:', url);
    console.log('[studentsController] SUPABASE_KEY set?', Boolean(SUPABASE_KEY), 'SUPABASE_SERVICE_ROLE_KEY set?', Boolean(SUPABASE_SERVICE_ROLE_KEY));
    console.log('[studentsController] headers chosen -> apikeyHeader is serviceRole?', apikeyHeader === SUPABASE_SERVICE_ROLE_KEY, 'authKey is serviceRole?', authKey === SUPABASE_SERVICE_ROLE_KEY);
    const r = await fetch(url, {
      headers: {
        apikey: apikeyHeader,
        Authorization: `Bearer ${authKey}`,
        Accept: "application/json",
      },
    });
    if (!r.ok) {
      const txt = await r.text();
      console.log('[studentsController] Supabase response error', r.status, txt);
      return res.status(r.status).json({ success: false, message: txt });
    }
    const data = await r.json();
    // log a sample row so we can inspect actual keys returned by Supabase
    if (Array.isArray(data) && data.length) console.log('[studentsController] sample row keys:', Object.keys(data[0]));
    const mapped = data.map((row) => {
      // question text
      const questionText = row.question || "";

      // options may be JSON (array) or a JSON string
      let options = [];
      try {
        if (Array.isArray(row.options)) options = row.options;
        else if (typeof row.options === "string" && row.options.trim()) options = JSON.parse(row.options);
        else options = row.options ? [row.options] : [];
      } catch (err) {
        options = [];
      }

      // answer handling: Supabase schema stores `answer` which may be index or text
      let answerIndex = 0;
      const rawAnswer = row.answer ?? null;
      if (rawAnswer === null || rawAnswer === undefined) {
        answerIndex = 0;
      } else if (typeof rawAnswer === "number") {
        answerIndex = rawAnswer;
      } else if (/^\d+$/.test(String(rawAnswer).trim())) {
        answerIndex = Number(String(rawAnswer).trim());
      } else {
        // treat rawAnswer as option text; find its index in options
        const idx = options.findIndex((o) => String(o).trim() === String(rawAnswer).trim());
        answerIndex = idx >= 0 ? idx : 0;
      }

      return {
        id: row.id,
        exam: row.exam,
        subject: row.subject,
        topic: row.topic,
        question: questionText,
        options,
        answer: answerIndex,
        explanation: row.explanation || row.ai_explanation || "",
        year: row.year,
        created_at: row.created_at,
      };
    });

    res.json({ success: true, data: mapped });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getMetadata = async (req, res) => {
  try {
    const table = req.query.table || DEFAULT_TABLE;
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(500).json({ success: false, message: "Supabase not configured on server" });
    }

    // helper to fetch distinct values for a column
    const fetchDistinct = async (col) => {
      const authKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY;
      const apikeyHeader = SUPABASE_KEY || SUPABASE_SERVICE_ROLE_KEY;
      const url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(col)}&distinct=${encodeURIComponent(col)}`;
      const r = await fetch(url, {
        headers: {
          apikey: apikeyHeader,
          Authorization: `Bearer ${authKey}`,
          Accept: "application/json",
        },
      });
      if (!r.ok) return [];
      const data = await r.json();
      return data.map((row) => row[col]).filter(Boolean);
    };

    const subjects = await fetchDistinct("subject");
    const topics = await fetchDistinct("topic");
    const years = await fetchDistinct("year");

    // get total count using Prefer: count=exact
    const countUrl = `${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`;
    const authKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY;
    const apikeyHeader = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_KEY;
    const countRes = await fetch(countUrl, {
      method: "GET",
      headers: {
        apikey: apikeyHeader,
        Authorization: `Bearer ${authKey}`,
        Accept: "application/json",
        Prefer: "count=exact",
      },
    });
    let total = null;
    const contentRange = countRes.headers.get("content-range");
    if (contentRange) {
      const parts = contentRange.split("/");
      total = parts.length === 2 ? Number(parts[1]) : null;
    }

    res.json({ success: true, data: { subjects, topics, years, total } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
