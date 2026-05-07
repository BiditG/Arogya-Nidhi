import fetch from "node-fetch";
import supabase from '../config/supabase.js';
import { randomUUID } from 'crypto';
import service from "../services/dashboard.service.js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_TABLE = process.env.MCQ_TABLE || "mcq_questions";

// Cache a working header pair to avoid repeated 401 tests
let cachedSupabaseHeaders = null;
let headerCheckPromise = null;

async function resolveWorkingSupabaseHeaders(table = 'mcq_questions') {
  if (cachedSupabaseHeaders) return cachedSupabaseHeaders;
  if (headerCheckPromise) return headerCheckPromise;

  headerCheckPromise = (async () => {
    if (!SUPABASE_URL) return null;
    const combos = [
      { auth: SUPABASE_SERVICE_ROLE_KEY, apikey: SUPABASE_SERVICE_ROLE_KEY, name: 'service/service' },
      { auth: SUPABASE_SERVICE_ROLE_KEY, apikey: SUPABASE_KEY, name: 'service/anon' },
      { auth: SUPABASE_KEY, apikey: SUPABASE_KEY, name: 'anon/anon' },
      { auth: SUPABASE_KEY, apikey: SUPABASE_SERVICE_ROLE_KEY, name: 'anon/service' },
    ];

    for (const c of combos) {
      if (!c.auth || !c.apikey) continue;
      try {
        const testUrl = `${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`;
        const r = await fetch(testUrl, { headers: { apikey: c.apikey, Authorization: `Bearer ${c.auth}`, Accept: 'application/json' }, method: 'GET' });
        if (r.ok) {
          cachedSupabaseHeaders = { auth: c.auth, apikey: c.apikey, name: c.name };
          console.log('[studentsController] resolved Supabase headers:', c.name);
          break;
        } else {
          const txt = await r.text();
          console.log('[studentsController] supabase test failed for', c.name, r.status, txt.slice(0,200));
        }
      } catch (err) {
        console.log('[studentsController] supabase test error for', c.name, err && err.message);
      }
    }

    headerCheckPromise = null;
    return cachedSupabaseHeaders;
  })();

  return headerCheckPromise;
}

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

    const resolvedHeaders = await resolveWorkingSupabaseHeaders(table);
    if (!resolvedHeaders) {
      return res.status(500).json({ success: false, message: "Supabase not configured on server" });
    }

    const { auth: authKey, apikey: apikeyHeader, name: headerName } = resolvedHeaders;

    const url = `${SUPABASE_URL}/rest/v1/${table}?${select}${filterQuery}${lim}`;
    console.log('[studentsController] Supabase URL:', url);
    console.log('[studentsController] keys present:', { has_url: !!SUPABASE_URL, has_key: !!SUPABASE_KEY, has_service: !!SUPABASE_SERVICE_ROLE_KEY });
    // log masked header sources
    console.log('[studentsController] using headers:', headerName || 'resolved');
    console.log('[studentsController] header preview (masked):', { apikey: apikeyHeader ? `${String(apikeyHeader).slice(0,8)}...` : null, authorization: authKey ? `${String(authKey).slice(0,8)}...` : null });
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
    const resolvedHeaders = await resolveWorkingSupabaseHeaders(table);
    if (!resolvedHeaders) {
      return res.status(500).json({ success: false, message: "Supabase not configured on server" });
    }

    const { auth: authKey, apikey: apikeyHeader } = resolvedHeaders;

    // helper to fetch distinct values for a column
    const fetchDistinct = async (col) => {
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

async function resolveStudentProfileId(req) {
  const possibleUserId = req.user?.studentId || req.user?.profileId || req.user?.userId || req.user?.id || req.user?.sub;

  if (!possibleUserId) {
    throw { status: 401, message: "Student identity not found" };
  }

  const { data, error } = await supabase
    .from('student_profiles')
    .select('id, user_id')
    .eq('user_id', possibleUserId)
    .maybeSingle();

  if (error) throw error;

  if (data?.id) {
    return data.id;
  }

  const directProfile = await supabase
    .from('student_profiles')
    .select('id')
    .eq('id', possibleUserId)
    .maybeSingle();

  if (directProfile.error) throw directProfile.error;

  if (directProfile.data?.id) {
    return directProfile.data.id;
  }

  throw { status: 404, message: "Student profile not found" };
}

export const recordProgress = async (req, res) => {
  try {
    const studentProfileId = await resolveStudentProfileId(req);
    const { mcq_id, selected_option, is_correct, time_taken_seconds } = req.body;

    const payload = {
      student_id: studentProfileId,
      mcq_id,
      selected_option: selected_option ?? null,
      is_correct,
      time_taken_seconds: time_taken_seconds ?? null,
    };

    const { data, error } = await supabase
      .from('student_progress')
      .insert(payload)
      .select('id, student_id, mcq_id, selected_option, is_correct, time_taken_seconds, attempted_at')
      .single();

    if (error) throw error;

    return res.status(201).json({ success: true, data, message: 'Progress recorded' });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

export const getProgressSummary = async (req, res) => {
  try {
    const studentProfileId = await resolveStudentProfileId(req);

    const { data, error } = await supabase
      .from('student_progress')
      .select('id, mcq_id, selected_option, is_correct, time_taken_seconds, attempted_at')
      .eq('student_id', studentProfileId)
      .order('attempted_at', { ascending: false });

    if (error) throw error;

    const attempts = data || [];
    const correctAnswers = attempts.filter((attempt) => attempt.is_correct).length;
    const totalAttempts = attempts.length;
    const totalTime = attempts.reduce((sum, attempt) => sum + (attempt.time_taken_seconds || 0), 0);

    return res.status(200).json({
      success: true,
      data: {
        totalAttempts,
        correctAnswers,
        accuracy: totalAttempts ? Math.round((correctAnswers / totalAttempts) * 100) : 0,
        averageTimeSeconds: totalAttempts ? Math.round(totalTime / totalAttempts) : 0,
        recentAttempts: attempts.slice(0, 10),
      },
      message: 'Progress summary fetched',
    });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

export const getHealthQueries = async (req, res) => {
  try {
    const data = await service.getCommunityQueries(req.query);
    return res.status(200).json({ success: true, data, message: 'Queries fetched' });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

export const getHealthQueryDetails = async (req, res) => {
  try {
    const data = await service.getCommunityQueryDetails(req.params.id);
    return res.status(200).json({ success: true, data, message: 'Query details fetched' });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};
