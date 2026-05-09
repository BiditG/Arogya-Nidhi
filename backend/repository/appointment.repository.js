
import supabase from '../config/supabase.js';

export const createAppointment = async (appointmentData) => {
  const { data, error } = await supabase
    .from('appointments')
    .insert(appointmentData)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getAppointments = async (filters) => {
  // Select related rows. Use table names/relations that exist in the DB schema.
  // appointments.patient_id -> patients, appointments.doctor_id -> doctor_profiles
  let query = supabase.from('appointments').select(`
    *,
    patient:patients(*),
    doctor:doctor_profiles(*),
    payment:payments(*)
  `);

  if (filters.patient_id) {
    query = query.eq('patient_id', filters.patient_id);
  }
  if (filters.doctor_id) {
    query = query.eq('doctor_id', filters.doctor_id);
  }
  if (filters.status) {
    const rawStatus = String(filters.status || '').trim();
    const lower = rawStatus.toLowerCase();
    const upper = rawStatus.toUpperCase();
    const statuses = Array.from(new Set([rawStatus, lower, upper].filter(Boolean)));
    query = query.in('status', statuses);
  }

  const { data, error } = await query;
  if (error) throw error;
  // Enrich doctor profiles with the corresponding user record (to include doctor name/avatar)
  try {
    const doctorUserIds = Array.from(
      new Set(
        (data || [])
          .map((a) => a?.doctor?.user_id)
          .filter(Boolean)
      )
    );

    if (doctorUserIds.length > 0) {
      const { data: users, error: usersErr } = await supabase
        .from('users')
        .select('*')
        .in('id', doctorUserIds);

      if (!usersErr && users) {
        const userMap = new Map(users.map((u) => [u.id, u]));
        data.forEach((appt) => {
          if (appt?.doctor?.user_id) {
            appt.doctor.user = userMap.get(appt.doctor.user_id) || null;
          }
        });
      }
    }
  } catch (e) {
    // non-fatal: if enrichment fails, return original data
    console.warn('Failed to enrich appointments with doctor user data', e);
  }

  return data;
};

export const getAppointmentById = async (id) => {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patient:patients(*),
      doctor:doctor_profiles(*),
      payment:payments(*)
    `)
    .eq('id', id)
    .single();
  if (error) throw error;
  // Attach doctor user info if available
  try {
    if (data?.doctor?.user_id) {
      const { data: user, error: userErr } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.doctor.user_id)
        .maybeSingle();
      if (!userErr) {
        data.doctor.user = user || null;
      }
    }
  } catch (e) {
    console.warn('Failed to attach doctor user to appointment', e);
  }

  return data;
};

export const updateAppointment = async (id, appointmentData) => {
  const { data, error } = await supabase
    .from('appointments')
    .update(appointmentData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};
