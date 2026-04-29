
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

  const { data, error } = await query;
  if (error) throw error;
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
