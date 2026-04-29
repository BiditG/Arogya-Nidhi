import supabase from '../config/supabase.js';

// ─── Profile ──────────────────────────────────────────────────────────────────

async function findPatientByUserId(userId) {
  const { data, error } = await supabase
    .from('patients')
    .select(`*, user:users(id,email,name,phone,avatar_url,role,is_active,barcode,created_at)`)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findPatientByPhone(phone) {
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('phone', phone)
    .maybeSingle();
  if (userError) throw userError;
  if (!user?.id) return null;

  return findPatientByUserId(user.id);
}

async function findPatientById(id) {
  const { data, error } = await supabase
    .from('patients')
    .select('*, user:users(id,email,name,phone,avatar_url,barcode)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Update user-level fields (name, email, phone, avatarUrl)
async function updateUserProfile(userId, data) {
  const { data: updated, error } = await supabase
    .from('users')
    .update(data)
    .eq('id', userId)
    .select('id,email,name,phone,avatar_url,barcode,updated_at')
    .maybeSingle();
  if (error) throw error;
  return updated;
}

// Update patient-level fields (dob, bloodGroup, gender, allergies, medicalHistory, height, weight, etc.)
async function updatePatientProfile(userId, data) {
  const { data: updated, error } = await supabase
    .from('patients')
    .update(data)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return updated;
}

// ─── Emergency Contact ────────────────────────────────────────────────────────

async function findEmergencyContactsByPatient(patientId) {
  const { data, error } = await supabase
    .from('emergency_contacts')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

async function findEmergencyContactById(id) {
  const { data, error } = await supabase
    .from('emergency_contacts')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function createEmergencyContact(data) {
  const { data: created, error } = await supabase.from('emergency_contacts').insert(data).select().maybeSingle();
  if (error) throw error;
  return created;
}

async function updateEmergencyContact(id, data) {
  const { data: updated, error } = await supabase
    .from('emergency_contacts')
    .update(data)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return updated;
}

async function deleteEmergencyContact(id) {
  const { data, error } = await supabase.from('emergency_contacts').delete().eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

// ─── Patient Address ──────────────────────────────────────────────────────────

async function findAddressByPatient(patientId) {
  const { data, error } = await supabase
    .from('patient_addresses')
    .select('*')
    .eq('patient_id', patientId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function upsertAddress(patientId, data) {
  // Supabase: try update first, then insert if not exists
  const { data: updated, error: updateError } = await supabase
    .from('patient_addresses')
    .update(data)
    .eq('patient_id', patientId)
    .maybeSingle();
  if (updateError && !updated) {
    // ignore and try insert
  }
  if (updated) return updated;

  const insertPayload = { patient_id: patientId, ...data };
  const { data: created, error: insertError } = await supabase.from('patient_addresses').insert(insertPayload).select().maybeSingle();
  if (insertError) throw insertError;
  return created;
}

// ─── Medical Reports ──────────────────────────────────────────────────────────

const VALID_CATEGORIES = ['blood_test', 'x_ray', 'mri', 'ct_scan', 'prescription', 'other'];

async function findReportsByPatient(patientId, { category, page = 1, limit = 10 } = {}) {
  let query = supabase.from('medical_reports').select('*', { count: 'exact' }).eq('patient_id', patientId);
  if (category) query = query.eq('category', category);
  const offset = (page - 1) * limit;
  const { data, count, error } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  if (error) throw error;
  return { total: count || 0, page, limit, reports: data };
}

async function findReportById(id) {
  const { data, error } = await supabase.from('medical_reports').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function createMedicalReport(data) {
  const { data: created, error } = await supabase.from('medical_reports').insert(data).select().maybeSingle();
  if (error) throw error;
  return created;
}

async function updateMedicalReport(id, data) {
  const { data: updated, error } = await supabase.from('medical_reports').update(data).eq('id', id).maybeSingle();
  if (error) throw error;
  return updated;
}

async function deleteMedicalReport(id) {
  const { data, error } = await supabase.from('medical_reports').delete().eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export default {
  // profile
  findPatientByUserId,
  findPatientByPhone,
  findPatientById,
  updateUserProfile,
  updatePatientProfile,
  // emergency contacts
  findEmergencyContactsByPatient,
  findEmergencyContactById,
  createEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
  // address
  findAddressByPatient,
  upsertAddress,
  // reports
  VALID_CATEGORIES,
  findReportsByPatient,
  findReportById,
  createMedicalReport,
  updateMedicalReport,
  deleteMedicalReport,
};
