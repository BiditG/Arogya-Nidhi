import supabase from "../config/supabase.js";
import { generateAccessToken } from "../util/token.util.js";
import repo from "../repository/auth.repository.js";

const changeAvailability = async (req, res) => {
  try {
    const docId = req.user?.docId || req.body.docId;
    const updated = await repo.updateDoctorProfile(docId, { is_available: req.body.is_available });
    return res.status(200).json({ success: true, message: 'Doctor availability status changed successfully', profile: updated });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const doctorList = async (req, res) => {
  try {
    const { data, error } = await supabase.from('doctor_profiles').select('*, users(name,email,avatar_url)').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.status(200).json({ success: true, doctors: data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// API for doctor login (via Supabase) - returns backend JWT
const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ success: false, message: error.message });
    const sUser = data.user;
    const token = generateAccessToken({ id: sUser.id });
    return res.status(200).json({ success: true, token });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// API to get doctor's own appointments only
const appointmentsDoctor = async (req, res) => {
  try {
    const docId = req.user?.docId;
    const { data, error } = await supabase.from('appointments').select('*').eq('doctor_id', docId);
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.status(200).json({ success: true, appointments: data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// API to make appointment completed for doctor portal
const appointmentComplete = async (req, res) => {
  try {
    const docId = req.user?.docId;
    const { appointmentId } = req.body;
    const { data, error } = await supabase.from('appointments').select('*').eq('id', appointmentId).maybeSingle();
    if (error) return res.status(500).json({ success: false, message: error.message });
    if (!data) return res.status(404).json({ success: false, message: 'Appointment not found' });
    if (data.doctor_id !== docId) return res.status(403).json({ success: false, message: 'Forbidden' });
    const { error: upErr } = await supabase.from('appointments').update({ status: 'completed' }).eq('id', appointmentId);
    if (upErr) return res.status(500).json({ success: false, message: upErr.message });
    return res.status(200).json({ success: true, message: 'Appointment Completed.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// API to make appointment cancel for doctor portal
const appointmentCancel = async (req, res) => {
  try {
    const docId = req.user?.docId;
    const { appointmentId } = req.body;
    const { data, error } = await supabase.from('appointments').select('*').eq('id', appointmentId).maybeSingle();
    if (error) return res.status(500).json({ success: false, message: error.message });
    if (!data) return res.status(404).json({ success: false, message: 'Appointment not found' });
    if (data.doctor_id !== docId) return res.status(403).json({ success: false, message: 'Forbidden' });
    const { error: upErr } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', appointmentId);
    if (upErr) return res.status(500).json({ success: false, message: upErr.message });
    return res.status(200).json({ success: true, message: 'Appointment Cancelled.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// API to get dashboard data for doctor portal
const doctorDashboard = async (req, res) => {
  try {
    console.debug('doctorDashboard request', { headers: req.headers, user: req.user });
    const docId = req.user?.docId;
    const { data: appointments, error } = await supabase.from('appointments').select('*').eq('doctor_id', docId);
    if (error) return res.status(500).json({ success: false, message: error.message });

    let earning = 0;
    (appointments || []).forEach((item) => {
      if (item.status === 'completed' || item.payment === true) {
        earning += item.amount || 0;
      }
    });

    const patients = Array.from(new Set((appointments || []).map(a => a.patient_id)));

    const dashData = {
      earning,
      appointments: (appointments || []).length,
      patients: patients.length,
      latestAppointments: (appointments || []).slice(-5).reverse(),
    };

    return res.status(200).json({ success: true, dashData });
  } catch (error) {
    console.error('doctorDashboard error', error);
    return res.status(500).json({ success: false, message: error?.message || 'Failed to load dashboard data' });
  }
};

const doctorProfile = async (req, res) => {
  try {
    const docId = req.user?.docId;
    const profile = await repo.findDoctorProfileByUserId(docId);
    if (!profile) return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    return res.status(200).json({ success: true, profile });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// API to update doctor profile for doctor portal
const updateDoctorProfile = async (req, res) => {
  try {
    const docId = req.user?.docId;
    const { fees, address, available, qualifications, specialty, license_no } = req.body;
    const updates = {};
    if (fees !== undefined) updates.consultation_fee = fees;
    if (address !== undefined) updates.address = address;
    if (available !== undefined) updates.is_available = available;
    if (qualifications !== undefined) updates.qualifications = qualifications;
    if (specialty !== undefined) updates.specialty = specialty;
    if (license_no !== undefined) updates.license_no = license_no;
    const updated = await repo.updateDoctorProfile(docId, updates);
    return res.status(200).json({ success: true, message: 'Doctor Profile Updated.', profile: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export {
  changeAvailability,
  doctorList,
  loginDoctor,
  appointmentsDoctor,
  appointmentComplete,
  appointmentCancel,
  doctorDashboard,
  doctorProfile,
  updateDoctorProfile,
};
