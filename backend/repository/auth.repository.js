import { supabase } from '../config/supabase.js';

// ─── User ────────────────────────────────────────────────────────────────────

async function findUserByEmail(email) {
  const { data, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
  if (error) throw error;
  return data;
}

async function findUserById(id) {
  const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function findUserByPhone(phone) {
  const { data, error } = await supabase.from('users').select('*').eq('phone', phone).maybeSingle();
  if (error) throw error;
  return data;
}

async function createUser(data) {
  const { data: created, error } = await supabase.from('users').insert(data).select().maybeSingle();
  if (error) throw error;
  return created;
}

async function upsertUser(data) {
  // upsert by primary key or unique email
  const { data: created, error } = await supabase.from('users').upsert(data, { onConflict: 'email' }).select().maybeSingle();
  if (error) throw error;
  return created;
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

async function createPatient(data) {
  const { data: created, error } = await supabase.from('patients').insert(data).select().maybeSingle();
  if (error) throw error;
  return created;
}

async function createDoctorProfile(data) {
  const { data: created, error } = await supabase.from('doctor_profiles').insert(data).select().maybeSingle();
  if (error) throw error;
  return created;
}

async function createStudentProfile(data) {
  const { data: created, error } = await supabase.from('student_profiles').insert(data).select().maybeSingle();
  if (error) throw error;
  return created;
}

async function findDoctorProfileByUserId(user_id) {
  const { data, error } = await supabase.from('doctor_profiles').select('*').eq('user_id', user_id).maybeSingle();
  if (error) throw error;
  return data;
}

async function updateDoctorProfile(user_id, updates) {
  const { data, error } = await supabase.from('doctor_profiles').update(updates).eq('user_id', user_id).select().maybeSingle();
  if (error) throw error;
  return data;
}

// ─── Refresh Tokens ───────────────────────────────────────────────────────────

async function createRefreshToken(data) {
  const { data: created, error } = await supabase.from('refresh_tokens').insert(data).select().maybeSingle();
  if (error) throw error;
  return created;
}

async function findRefreshTokenByHash(tokenHash) {
  const { data, error } = await supabase
    .from('refresh_tokens')
    .select('*, user:users(*)')
    .eq('token_hash', tokenHash)
    .eq('is_revoked', false)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function revokeRefreshToken(id) {
  const { data, error } = await supabase.from('refresh_tokens').update({ is_revoked: true }).eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function revokeAllUserRefreshTokens(userId) {
  const { data, error } = await supabase.from('refresh_tokens').update({ is_revoked: true }).eq('user_id', userId).eq('is_revoked', false);
  if (error) throw error;
  return data;
}

export default {
  findUserByEmail,
  findUserById,
  findUserByPhone,
  createUser,
  upsertUser,
  createPatient,
  createDoctorProfile,
  createStudentProfile,
  findDoctorProfileByUserId,
  updateDoctorProfile,
  createRefreshToken,
  findRefreshTokenByHash,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
};
