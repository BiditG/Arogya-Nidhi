import supabase from '../config/supabase.js';

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
    .in('status', ['pending', 'confirmed']);
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
     .select(`id,scheduled_at:scheduledAt,doctor:doctor_profiles(id,specialty,user:users(name,avatar_url)),consultation_summary:consultation_summaries(id,prescription,diagnosis,created_at:createdAt)`)
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
  const normalizedIot = (iot || []).map((r) => ({
    ...r,
    resultScore: r.resultScore ?? r.result_score ?? null,
    testType: r.testType ?? r.test_type ?? null,
    recordedAt: r.recordedAt ?? r.recorded_at ?? null,
  }));
  return { ...data, emergencyContacts, addressInfo, iotReadings: normalizedIot };
}

// ─── Appointments ─────────────────────────────────────────────────────────────

async function getUpcomingAppointments(patientId, { page = 1, limit = 10 } = {}) {
  const now = new Date().toISOString();
  const offset = (page - 1) * limit;
  const base = supabase
    .from('appointments')
      .select(`*, doctor:doctor_profiles(id,specialty,consultation_fee:consultationFee, user:users(name,avatar_url)), consultation_summary:consultation_summaries(diagnosis,prescription,follow_up_date:followUpDate), payment:payments(status,amount,currency)`, { count: 'exact' })
    .eq('patient_id', patientId)
    .gte('scheduled_at', now)
    .in('status', ['pending', 'confirmed'])
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
      .select(`*, doctor:doctor_profiles(id,specialty,consultation_fee:consultationFee,is_verified:isVerified, user:users(name,avatar_url,email,phone)), consultation_summary:consultation_summaries(*), payment:payments(status,amount,currency,paid_at:paidAt)`, { count: 'exact' })
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
      .select(`*, doctor:doctor_profiles(id,specialty,sub_specialty:subSpecialty,consultation_fee:consultationFee,qualifications,is_verified:isVerified, user:users(name,avatar_url,email,phone)), consultation_summary:consultation_summaries(*), payment:payments(*), anonymized_case:anonymized_cases(id,specialty_tag:specialtyTag,is_approved:isApproved)`) 
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
    .in('status', ['pending', 'confirmed'])
    .order('scheduled_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function bookAppointment(data) {
  const payload = {
    patient_id: data.patientId ?? data.patient_id,
    doctor_id: data.doctorId ?? data.doctor_id,
    scheduled_at: data.scheduledAt ?? data.scheduled_at,
    duration_minutes: data.durationMinutes ?? data.duration_minutes ?? 30,
    status: data.status ?? 'pending',
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
    .select(`*, doctor:doctor_profiles(specialty, user:users(name,avatar_url)), consultation_summary:consultation_summaries(ai_summary:aiSummary,doctor_notes:doctorNotes,diagnosis,prescription,follow_up_date:followUpDate,created_at:createdAt)`, { count: 'exact' })
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
    .select(`*, doctor:doctor_profiles(specialty, user:users(name,avatar_url)), consultation_summary:consultation_summaries(diagnosis,prescription,follow_up_date:followUpDate,created_at:createdAt)`) 
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
  return { total: count || 0, page, limit, readings: data };
}

async function getRecentIotReadings(patientId, take = 3) {
  const { data, error } = await supabase.from('iot_readings').select('*').eq('patient_id', patientId).order('recorded_at', { ascending: false }).limit(take);
  if (error) throw error;
  return data;
}

async function findIotReadingById(id, patientId) {
  const { data, error } = await supabase.from('iot_readings').select('*').eq('id', id).eq('patient_id', patientId).maybeSingle();
  if (error) throw error;
  return data;
}

async function createIotReading(data) {
  const { data: created, error } = await supabase.from('iot_readings').insert(data).select().maybeSingle();
  if (error) throw error;
  return created;
}

// ─── Patient queries ──────────────────────────────────────────────────────────

async function getPatientQueries(patientId, { page = 1, limit = 10, isResolved } = {}) {
  const offset = (page - 1) * limit;
  let query = supabase
    .from('patient_queries')
      .select(`*, responses:query_responses(id,responseText:response_text,isAccepted:is_accepted,created_at:createdAt, doctor:doctor_profiles(specialty, user:users(name,avatar_url))), triage_decision:triage_decisions(*)`, { count: 'exact' })
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
      .select(`*, responses:query_responses(id,responseText:response_text,isAccepted:is_accepted,created_at:createdAt, doctor:doctor_profiles(id,specialty,isVerified:isVerified, user:users(name,avatar_url))), triage_decision:triage_decisions(*)`)
    .eq('id', id)
    .eq('patient_id', patientId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function createQuery(data) {
  // normalize camelCase keys to snake_case columns for PostgREST
  const payload = {
    patient_id: data.patientId,
    title: data.title,
    symptom_text: data.symptomText ?? null,
    is_anonymous: data.isAnonymous === true || data.isAnonymous === 'true',
  };
  const { data: created, error } = await supabase.from('patient_queries').insert(payload).select().maybeSingle();
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
      .select(`*, patient:patients(id, user:users(id,name,avatar_url)), responses:query_responses(id,responseText:response_text,isAccepted:is_accepted,created_at:createdAt, doctor:doctor_profiles(id,specialty,user:users(name,avatar_url))), triage_decision:triage_decisions(*)`, { count: 'exact' })
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
    .select(`*, patient:patients(id, user:users(id,name,avatar_url)), responses:query_responses(id,responseText:response_text,isAccepted:is_accepted,created_at:createdAt, doctor:doctor_profiles(id,specialty,user:users(name,avatar_url))), triage_decision:triage_decisions(*)`, { count: 'exact' })
    .order('created_at', { ascending: false });
  if (isResolved !== undefined) query = query.eq('is_resolved', isResolved);
  const { data, count, error } = await query.range(offset, offset + limit - 1);
  if (error) throw error;
  return { total: count || 0, page, limit, queries: data };
}

async function findQueryByIdForDoctor(id) {
  const { data, error } = await supabase
    .from('patient_queries')
    .select(`*, patient:patients(id, user:users(id,name,avatar_url)), responses:query_responses(id,responseText:response_text,isAccepted:is_accepted,created_at:createdAt, doctor:doctor_profiles(id,specialty,user:users(name,avatar_url))), triage_decision:triage_decisions(*)`)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function createQueryResponse({ queryId, doctorId, responseText }) {
  const payload = {
    query_id: queryId,
    doctor_id: doctorId,
    response_text: responseText || null,
  };
  const { data: created, error } = await supabase.from('query_responses').insert(payload).select().maybeSingle();
  if (error) throw error;
  return created;
}

// ─── Doctors (for booking) ────────────────────────────────────────────────────

async function getAvailableDoctors({ page = 1, limit = 10, specialty } = {}) {
  const offset = (page - 1) * limit;
  let query = supabase
    .from('doctor_profiles')
      .select('id,specialty,sub_specialty:subSpecialty,consultation_fee:consultationFee,qualifications,license_no:licenseNo,is_verified:isVerified,is_available:isAvailable, user:users(name,avatar_url,email)', { count: 'exact' })
    .eq('is_available', true)
    .eq('is_verified', true)
    .order('id', { ascending: true });
  if (specialty) query = query.ilike('specialty', `%${specialty}%`);
  const { data, count, error } = await query.range(offset, offset + limit - 1);
  if (error) throw error;
  return { total: count || 0, page, limit, doctors: data };
}

async function findDoctorById(id) {
  const { data, error } = await supabase
    .from('doctor_profiles')
    .select('id,specialty,subSpecialty:sub_specialty,consultationFee:consultation_fee,qualifications,licenseNo:license_no,isVerified:is_verified,isAvailable:is_available, user:users(name,avatar_url,email)')
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
  updateQuery,
  deleteQuery,
  incrementQueryView,
  // doctor-facing
  getAllQueriesForDoctor,
  findQueryByIdForDoctor,
  createQueryResponse,
  // doctors
  getAvailableDoctors,
  findDoctorById,
};
