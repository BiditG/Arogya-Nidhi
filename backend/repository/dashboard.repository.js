import supabase from '../config/supabase.js';

const DOCTOR_SPECIALTY_ALIASES = {
  cardiology: ['Cardiology', 'Cardiologist', 'Heart Specialist'],
  neurology: ['Neurology', 'Neurologist'],
  dermatology: ['Dermatology', 'Dermatologist'],
  orthopedics: ['Orthopedics', 'Orthopedic', 'Orthopedist', 'Orthopedic Surgeon'],
  pediatrics: ['Pediatrics', 'Pediatrician', 'Pediatricians'],
  general: ['General', 'General Physician', 'General physician', 'Physician'],
};

function normalizeIotReading(row) {
  if (!row) return row;
  const readingData = row.readingData ?? row.reading_data ?? row.sensorData ?? row.sensor_data ?? {};
  const sensorData = readingData && typeof readingData === 'object' ? readingData : { value: readingData };
  const scoreValue = row.resultScore ?? row.result_score ?? sensorData?.resultScore ?? sensorData?.score ?? null;
  return {
    ...row,
    readingData: sensorData,
    sensorData,
    resultScore: scoreValue === null || scoreValue === undefined ? null : Number(scoreValue),
    testType: row.testType ?? row.test_type ?? sensorData?.test ?? null,
    normalRange: row.normalRange ?? row.normal_range ?? null,
    recordedAt: row.recordedAt ?? row.recorded_at ?? null,
    createdAt: row.createdAt ?? row.created_at ?? row.recorded_at ?? row.recordedAt ?? null,
  };
}

function normalizeSpecialty(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSpecialtySearchTerms(specialty) {
  const requested = String(specialty || '').trim();
  if (!requested) return [];

  const normalized = normalizeSpecialty(requested);
  const aliasEntry = Object.entries(DOCTOR_SPECIALTY_ALIASES).find(([, aliases]) =>
    aliases.some((alias) => {
      const aliasText = normalizeSpecialty(alias);
      return aliasText === normalized || aliasText.includes(normalized) || normalized.includes(aliasText);
    })
  );

  const terms = aliasEntry ? aliasEntry[1] : [requested];
  return [...new Set([requested, ...terms].map((term) => String(term || '').trim()).filter(Boolean))];
}

function escapePostgrestOrValue(value) {
  return String(value || '').replace(/[(),]/g, ' ').replace(/\s+/g, ' ').trim();
}

// ─── Patient lookup ───────────────────────────────────────────────────────────

async function findPatientByUserId(userId) {
  const { data, error } = await supabase
    .from('patients')
    .select('*, user:users(id,name,email,avatar_url)')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ─── Dashboard overview ───────────────────────────────────────────────────────

async function getUpcomingAppointmentsCount(patientId) {
  const now = new Date().toISOString();
  const { count, error } = await supabase
    .from('appointments')
    .select('*', { count: 'exact' })
    .eq('patient_id', patientId)
    .gte('scheduled_at', now)
    .in('status', ['pending', 'confirmed', 'PENDING', 'CONFIRMED']);
  if (error) throw error;
  return count || 0;
}

async function getPendingTestsCount(patientId) {
  // In the current schema, iot_readings has no result score column.
  // Use recent IoT submissions as a lightweight pending signal.
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const { count, error } = await supabase
    .from('iot_readings')
    .select('*', { count: 'exact' })
    .eq('patient_id', patientId)
    .gte('recorded_at', sevenDaysAgo.toISOString());
  if (error) throw error;
  return count || 0;
}

async function getLatestPrescriptions(patientId, take = 3) {
  const { data, error } = await supabase
    .from('appointments')
     .select(`id,scheduledAt:scheduled_at,doctor:doctor_profiles(id,specialty,user:users(name,avatar_url)),consultation_summary:consultation_summaries(id,prescription,diagnosis,createdAt:created_at)`)
    .eq('patient_id', patientId)
    .order('scheduled_at', { ascending: false })
    .limit(Math.max(take * 3, 10));
  if (error) throw error;
  const flattened = (data || [])
    .map((row) => ({
      id: row.consultation_summary?.id,
      prescription: row.consultation_summary?.prescription,
      diagnosis: row.consultation_summary?.diagnosis,
      createdAt: row.consultation_summary?.createdAt,
      appointment: {
        id: row.id,
        scheduledAt: row.scheduledAt,
        doctor: row.doctor,
      },
    }))
    .filter((row) => row.id && row.prescription)
    .slice(0, take);
  return flattened;
}

// Health score: computed from profile completeness + recent vitals
async function getHealthScoreData(patientId) {
  const { data, error } = await supabase
    .from('patients')
    .select(`bloodGroup:blood_group,gender,dateOfBirth:date_of_birth,allergies,medicalHistory:medical_history`)
    .eq('id', patientId)
    .maybeSingle();
  if (error) throw error;

  // Related data may not always have FK relationships configured in PostgREST cache,
  // so fetch these pieces independently.
  let emergencyContacts = [];
  try {
    const { data: contacts, error: contactsErr } = await supabase
      .from('emergency_contacts')
      .select('id')
      .eq('patient_id', patientId);
    if (!contactsErr) emergencyContacts = contacts || [];
  } catch (_) {
    emergencyContacts = [];
  }

  let addressInfo = null;
  try {
    const { data: address, error: addrErr } = await supabase
      .from('patient_addresses')
      .select('id')
      .eq('patient_id', patientId)
      .maybeSingle();
    if (!addrErr) addressInfo = address || null;
  } catch (_) {
    addressInfo = null;
  }

  // fetch recent iot readings separately
  const { data: iot, error: iotErr } = await supabase
    .from('iot_readings')
    .select('*')
    .eq('patient_id', patientId)
    .order('recorded_at', { ascending: false })
    .limit(5);
  if (iotErr) throw iotErr;
  const normalizedIot = (iot || []).map(normalizeIotReading);
  return { ...data, emergencyContacts, addressInfo, iotReadings: normalizedIot };
}

// ─── Appointments ─────────────────────────────────────────────────────────────

async function getUpcomingAppointments(patientId, { page = 1, limit = 10 } = {}) {
  const now = new Date().toISOString();
  const offset = (page - 1) * limit;
  const base = supabase
    .from('appointments')
    .select(`*, doctor:doctor_profiles(id,specialty,consultationFee:consultation_fee, user:users(name,avatar_url)), consultation_summary:consultation_summaries(diagnosis,prescription,followUpDate:followup_date), payment:payments(status,amount,currency)`, { count: 'exact' })
    .eq('patient_id', patientId)
    .gte('scheduled_at', now)
    .in('status', ['pending', 'confirmed', 'PENDING', 'CONFIRMED'])
    .order('scheduled_at', { ascending: true })
    .range(offset, offset + limit - 1);
  const { data, count, error } = await base;
  if (error) throw error;
  return { total: count || 0, page, limit, appointments: data };
}

async function getAllAppointments(patientId, { page = 1, limit = 10, status } = {}) {
  const offset = (page - 1) * limit;
  let query = supabase
    .from('appointments')
      .select(`*, doctor:doctor_profiles(id,specialty,consultationFee:consultation_fee,isVerified:is_verified, user:users(name,avatar_url,email,phone)), consultation_summary:consultation_summaries(*), payment:payments(status,amount,currency,paidAt:paid_at)`, { count: 'exact' })
    .eq('patient_id', patientId)
    .order('scheduled_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, count, error } = await query.range(offset, offset + limit - 1);
  if (error) throw error;
  return { total: count || 0, page, limit, appointments: data };
}

async function findAppointmentById(id, patientId) {
  const { data, error } = await supabase
    .from('appointments')
      .select(`*, doctor:doctor_profiles(id,specialty,subSpecialty:sub_specialty,consultationFee:consultation_fee,qualifications,isVerified:is_verified, user:users(name,avatar_url,email,phone)), consultation_summary:consultation_summaries(*), payment:payments(*), anonymized_case:anonymized_cases(id,specialtyTag:specialty_tag,isApproved:is_approved)`) 
    .eq('id', id)
    .eq('patient_id', patientId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findAppointmentByDoctorAndScheduledAt(doctorId, scheduledAt) {
  const { data, error } = await supabase
    .from('appointments')
    .select('id, status, scheduled_at')
    .eq('doctor_id', doctorId)
    .eq('scheduled_at', scheduledAt)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findAppointmentsByDoctorBetween(doctorId, startsAt, endsAt) {
  const { data, error } = await supabase
    .from('appointments')
    .select('id, status, scheduled_at')
    .eq('doctor_id', doctorId)
    .gte('scheduled_at', startsAt)
    .lt('scheduled_at', endsAt)
    .in('status', ['pending', 'confirmed', 'PENDING', 'CONFIRMED'])
    .order('scheduled_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function bookAppointment(data) {
  const meetingLink = data.meetingLink !== undefined ? data.meetingLink : data.meeting_link;
  const payload = {
    patient_id: data.patientId ?? data.patient_id,
    doctor_id: data.doctorId ?? data.doctor_id,
    scheduled_at: data.scheduledAt ?? data.scheduled_at,
    duration_minutes: data.durationMinutes ?? data.duration_minutes ?? 30,
    status: data.status ?? 'pending',
    ...(meetingLink !== undefined ? { meeting_link: meetingLink } : {}),
  };

  const { data: created, error } = await supabase
    .from('appointments')
    .insert(payload)
    .select('*, doctor:doctor_profiles(id,specialty, user:users(name,avatar_url))')
    .maybeSingle();
  if (error) throw error;
  return created;
}

async function cancelAppointment(id) {
  const { data: updated, error } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id).maybeSingle();
  if (error) throw error;
  return updated;
}

async function updateAppointment(id, data) {
  const payload = {
    ...(data.scheduledAt !== undefined ? { scheduled_at: data.scheduledAt } : {}),
    ...(data.status !== undefined ? { status: data.status } : {}),
    ...(data.scheduled_at !== undefined ? { scheduled_at: data.scheduled_at } : {}),
    ...(data.meetingLink !== undefined ? { meeting_link: data.meetingLink } : {}),
    ...(data.meeting_link !== undefined ? { meeting_link: data.meeting_link } : {}),
  };

  const { data: updated, error } = await supabase.from('appointments').update(payload).eq('id', id).maybeSingle();
  if (error) throw error;
  return updated;
}

// ─── Medical history ──────────────────────────────────────────────────────────

async function getMedicalHistory(patientId, { page = 1, limit = 10 } = {}) {
  const offset = (page - 1) * limit;
  const { data, count, error } = await supabase
    .from('appointments')
    .select(`*, doctor:doctor_profiles(specialty, user:users(name,avatar_url)), consultation_summary:consultation_summaries(aiSummary:ai_summary,doctorNotes:doctor_notes,diagnosis,prescription,followUpDate:followup_date,createdAt:created_at)`, { count: 'exact' })
    .eq('patient_id', patientId)
    .eq('status', 'completed')
    .not('consultation_summary', 'is', null)
    .order('scheduled_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return { total: count || 0, page, limit, records: data };
}

async function getRecentMedicalHistory(patientId, take = 3) {
  const { data, error } = await supabase
    .from('appointments')
    .select(`*, doctor:doctor_profiles(specialty, user:users(name,avatar_url)), consultation_summary:consultation_summaries(diagnosis,prescription,followUpDate:followup_date,createdAt:created_at)`) 
    .eq('patient_id', patientId)
    .eq('status', 'completed')
    .not('consultation_summary', 'is', null)
    .order('scheduled_at', { ascending: false })
    .limit(take);
  if (error) throw error;
  return data;
}

// ─── IoT readings ─────────────────────────────────────────────────────────────

async function getIotReadings(patientId, { page = 1, limit = 10, testType } = {}) {
  const offset = (page - 1) * limit;
  let query = supabase.from('iot_readings').select('*', { count: 'exact' }).eq('patient_id', patientId).order('recorded_at', { ascending: false });
  if (testType) query = query.eq('test_type', testType);
  const { data, count, error } = await query.range(offset, offset + limit - 1);
  if (error) throw error;
  return { total: count || 0, page, limit, readings: (data || []).map(normalizeIotReading) };
}

async function getRecentIotReadings(patientId, take = 3) {
  const { data, error } = await supabase.from('iot_readings').select('*').eq('patient_id', patientId).order('recorded_at', { ascending: false }).limit(take);
  if (error) throw error;
  return (data || []).map(normalizeIotReading);
}

async function findIotReadingById(id, patientId) {
  const { data, error } = await supabase.from('iot_readings').select('*').eq('id', id).eq('patient_id', patientId).maybeSingle();
  if (error) throw error;
  return normalizeIotReading(data);
}

async function createIotReading(data) {
  const readingInput = data.readingData ?? data.sensorData ?? {};
  const readingData = Array.isArray(readingInput)
    ? { samples: readingInput }
    : readingInput && typeof readingInput === 'object'
      ? { ...readingInput }
      : { value: readingInput };

  if (data.resultScore !== undefined && data.resultScore !== null) {
    readingData.resultScore = data.resultScore;
  }
  if (data.notes) {
    readingData.notes = data.notes;
  }

  const insertData = {
    patient_id: data.patientId,
    test_type: data.testType,
    reading_data: readingData,
    recorded_at: data.recordedAt || new Date().toISOString(),
  };
  if (data.normalRange !== undefined) insertData.normal_range = data.normalRange;

  const { data: created, error } = await supabase.from('iot_readings').insert(insertData).select().maybeSingle();
  if (error) throw error;
  return normalizeIotReading(created);
}

// ─── Patient queries ──────────────────────────────────────────────────────────

async function getPatientQueries(patientId, { page = 1, limit = 10, isResolved } = {}) {
  const offset = (page - 1) * limit;
  let query = supabase
    .from('patient_queries')
      .select(`*, responses:query_responses(id,responseText:response_text,isAccepted:is_accepted,createdAt:created_at, doctor:doctor_profiles(specialty, user:users(name,avatar_url))), triage_decision:triage_decisions(*)`, { count: 'exact' })
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (isResolved !== undefined) query = query.eq('is_resolved', isResolved);
  const { data, count, error } = await query.range(offset, offset + limit - 1);
  if (error) throw error;
  return { total: count || 0, page, limit, queries: data };
}

async function findQueryById(id, patientId) {
  const { data, error } = await supabase
    .from('patient_queries')
      .select(`*, responses:query_responses(id,responseText:response_text,isAccepted:is_accepted,createdAt:created_at, doctor:doctor_profiles(id,specialty,isVerified:is_verified, user:users(name,avatar_url))), triage_decision:triage_decisions(*)`)
    .eq('id', id)
    .eq('patient_id', patientId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getCommunityQueries({ page = 1, limit = 10, isResolved } = {}) {
  const offset = (page - 1) * limit;
  let query = supabase
    .from('patient_queries')
    .select(`id,title,symptomText:symptom_text,isAnonymous:is_anonymous,isResolved:is_resolved,viewCount:view_count,createdAt:created_at,updatedAt:updated_at,patient:patients(user:users(name,avatarUrl:avatar_url)),responses:query_responses(id,responseText:response_text,isAccepted:is_accepted,createdAt:created_at,doctor:doctor_profiles(id,specialty,isVerified:is_verified,user:users(name,avatarUrl:avatar_url))),triageDecision:triage_decisions(*)`, { count: 'exact' })
    .order('created_at', { ascending: false });

  if (isResolved !== undefined) query = query.eq('is_resolved', isResolved);

  const { data, count, error } = await query.range(offset, offset + limit - 1);
  if (error) throw error;
  return { total: count || 0, page, limit, queries: data };
}

async function findCommunityQueryById(id) {
  const { data, error } = await supabase
    .from('patient_queries')
    .select(`id,title,symptomText:symptom_text,isAnonymous:is_anonymous,isResolved:is_resolved,viewCount:view_count,createdAt:created_at,updatedAt:updated_at,patient:patients(user:users(name,avatarUrl:avatar_url)),responses:query_responses(id,responseText:response_text,isAccepted:is_accepted,createdAt:created_at,doctor:doctor_profiles(id,specialty,isVerified:is_verified,user:users(name,avatarUrl:avatar_url))),triageDecision:triage_decisions(*)`)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function createQuery(data) {
  // normalize camelCase keys to snake_case columns for PostgREST
  const patientId = data.patientId ?? data.patient_id;
  if (!patientId) {
    throw { status: 400, message: 'patientId is required' };
  }

  const payload = {
    patient_id: patientId,
    title: data.title,
    symptom_text: data.symptomText ?? data.symptom_text ?? null,
    is_anonymous: data.isAnonymous === true || data.isAnonymous === 'true' || data.is_anonymous === true || data.is_anonymous === 'true',
  };
  const { data: created, error } = await supabase.from('patient_queries').insert(payload).select().maybeSingle();
  if (error) throw error;
  return created;
}

async function createTriageDecision(data) {
  const payload = {
    query_id: data.queryId ?? data.query_id,
    recommended_specialty: data.recommendedSpecialty ?? data.recommended_specialty ?? null,
    urgency_level: data.urgencyLevel ?? data.urgency_level ?? null,
    confidence_score: data.confidenceScore ?? data.confidence_score ?? null,
    ai_reasoning: data.aiReasoning ?? data.ai_reasoning ?? null,
  };

  const { data: created, error } = await supabase
    .from('triage_decisions')
    .insert(payload)
    .select()
    .maybeSingle();
  if (error) throw error;
  return created;
}

async function createQueryResponse(data) {
  const { data: created, error } = await supabase
    .from('query_responses')
    .insert(data)
    .select('id,responseText:response_text,response_text,isAccepted:is_accepted,createdAt:created_at,created_at,doctor:doctor_profiles(id,specialty,user:users(name,avatar_url))')
    .maybeSingle();
  if (error) throw error;
  return created;
}

async function updateQuery(id, data) {
  // map possible camelCase fields to snake_case for update
  const payload = {};
  if (data.title !== undefined) payload.title = data.title;
  if (data.symptomText !== undefined) payload.symptom_text = data.symptomText;
  if (data.isAnonymous !== undefined) payload.is_anonymous = data.isAnonymous === true || data.isAnonymous === 'true';
  const { data: updated, error } = await supabase.from('patient_queries').update(payload).eq('id', id).maybeSingle();
  if (error) throw error;
  return updated;
}

async function deleteQuery(id) {
  const { data, error } = await supabase.from('patient_queries').delete().eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function incrementQueryView(id) {
  // Read current view_count then increment
  const { data: existing, error: getErr } = await supabase.from('patient_queries').select('view_count').eq('id', id).maybeSingle();
  if (getErr) throw getErr;
  const current = (existing && existing.view_count) || 0;
  const { data: updated, error } = await supabase.from('patient_queries').update({ view_count: current + 1 }).eq('id', id).maybeSingle();
  if (error) throw error;
  return updated;
}

// ─── Doctor-facing query operations ──────────────────────────────────────────

async function getAllQueriesForDoctor({ page = 1, limit = 10, isResolved } = {}) {
  const offset = (page - 1) * limit;
  let query = supabase
    .from('patient_queries')
      .select(`*, patient:patients(id, user:users(id,name,avatar_url)), responses:query_responses(id,responseText:response_text,isAccepted:is_accepted,createdAt:created_at, doctor:doctor_profiles(id,specialty,user:users(name,avatar_url))), triage_decision:triage_decisions(*)`, { count: 'exact' })
    .order('created_at', { ascending: false });
  if (isResolved !== undefined) query = query.eq('is_resolved', isResolved);
  const { data, count, error } = await query.range(offset, offset + limit - 1);
  if (error) throw error;
  return { total: count || 0, page, limit, queries: data };
}

async function getPublicQueries({ page = 1, limit = 10, isResolved } = {}) {
  const offset = (page - 1) * limit;
  let query = supabase
    .from('patient_queries')
    .select(`*, patient:patients(id, user:users(id,name,avatar_url)), responses:query_responses(id,responseText:response_text,isAccepted:is_accepted,createdAt:created_at, doctor:doctor_profiles(id,specialty,user:users(name,avatar_url))), triage_decision:triage_decisions(*)`, { count: 'exact' })
    .order('created_at', { ascending: false });
  if (isResolved !== undefined) query = query.eq('is_resolved', isResolved);
  const { data, count, error } = await query.range(offset, offset + limit - 1);
  if (error) throw error;
  return { total: count || 0, page, limit, queries: data };
}

async function findQueryByIdForDoctor(id) {
  const { data, error } = await supabase
    .from('patient_queries')
    .select(`*, patient:patients(id, user:users(id,name,avatar_url)), responses:query_responses(id,responseText:response_text,isAccepted:is_accepted,createdAt:created_at, doctor:doctor_profiles(id,specialty,user:users(name,avatar_url))), triage_decision:triage_decisions(*)`)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ─── Doctors (for booking) ────────────────────────────────────────────────────

async function getAvailableDoctors({ page = 1, limit = 10, specialty, includeUnverified = false } = {}) {
  const offset = (page - 1) * limit;
  let query = supabase
    .from('doctor_profiles')
      .select('id,user_id,specialty,subSpecialty:sub_specialty,consultationFee:consultation_fee,qualifications,licenseNo:license_no,isVerified:is_verified,isAvailable:is_available, user:users(id,name,avatar_url,email)', { count: 'exact' })
    .eq('is_available', true)
    .order('id', { ascending: true });

  if (!includeUnverified) {
    query = query.eq('is_verified', true);
  }

  const specialtyTerms = getSpecialtySearchTerms(specialty);
  if (specialtyTerms.length) {
    const specialtyFilter = specialtyTerms
      .map((term) => escapePostgrestOrValue(term))
      .filter(Boolean)
      .map((term) => `specialty.ilike.%${term}%`)
      .join(',');

    if (specialtyFilter) {
      query = query.or(specialtyFilter);
    }
  }

  const { data, count, error } = await query.range(offset, offset + limit - 1);
  if (error) throw error;
  return { total: count || 0, page, limit, doctors: data };
}

async function findDoctorById(id) {
  const { data, error } = await supabase
    .from('doctor_profiles')
    .select('id,user_id,specialty,subSpecialty:sub_specialty,consultationFee:consultation_fee,qualifications,licenseNo:license_no,isVerified:is_verified,isAvailable:is_available, user:users(id,name,avatar_url,email)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export default {
  findPatientByUserId,
  // overview
  getUpcomingAppointmentsCount,
  getPendingTestsCount,
  getLatestPrescriptions,
  getHealthScoreData,
  // appointments
  getUpcomingAppointments,
  getAllAppointments,
  findAppointmentById,
  findAppointmentByDoctorAndScheduledAt,
  findAppointmentsByDoctorBetween,
  bookAppointment,
  cancelAppointment,
  updateAppointment,
  // medical history
  getMedicalHistory,
  getRecentMedicalHistory,
  // iot
  getIotReadings,
  getRecentIotReadings,
  findIotReadingById,
  createIotReading,
  // queries
  getPatientQueries,
  findQueryById,
  getPublicQueries,
  createQuery,
  createTriageDecision,
  createQueryResponse,
  updateQuery,
  deleteQuery,
  incrementQueryView,
  // doctor-facing
  getAllQueriesForDoctor,
  findQueryByIdForDoctor,
  // doctors
  getAvailableDoctors,
  findDoctorById,
};
