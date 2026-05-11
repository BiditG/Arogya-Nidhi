import validator from "validator";
import bcrypt from "bcrypt";
import { v2 as cloudinary } from "cloudinary";
import supabase from "../config/supabase.js";
import repo from "../repository/auth.repository.js";
import { generateAccessToken } from "../util/token.util.js";
import { createNotificationSafe } from "../services/notification.service.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MAX_USERS = 100;

// API to register user
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Please fill in all required fields." });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters long." });
    }

    // create Supabase auth user
    const { data: createdUser, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role: 'patient' },
      email_confirm: true,
    });
    if (createErr) return res.status(500).json({ success: false, message: createErr.message });

    // persist into local users table via repo
    await repo.upsertUser({
      id: createdUser?.id || createdUser?.user?.id,
      email,
      name,
      role: 'patient',
      is_active: true,
    });

    // issue backend JWT
    const token = generateAccessToken({ id: createdUser?.id || createdUser?.user?.id });
    return res.status(201).json({ success: true, token });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// API for user login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ success: false, message: error.message });
    const sUser = data.user;
    const token = generateAccessToken({ id: sUser.id });
    return res.status(200).json({ success: true, token });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// API to get user details
const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.user;
    const userData = await repo.findUserById(userId);
    res.status(200).json({ success: true, userData });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

//API for update user profile
const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.user;
    const { name, phone, address, dob, gender } = req.body;
    const imgFile = req.file;

    if (!name || !phone || !address || !dob || !gender) {
      return res.status(404).json({ success: false, message: "User data is missing." });
    }

    const addressObj = JSON.parse(address);

    const updates = { name, phone, address: addressObj, dob, gender };

    if (imgFile) {
      const imgUpload = await cloudinary.uploader.upload(imgFile.path, { resource_type: 'image' });
      updates.avatar_url = imgUpload.secure_url;
    }

    const updated = await repo.upsertUser({ id: userId, ...updates });

    res.status(200).json({ success: true, message: 'User profile updated.', user: updated });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// API to book an appointment
const bookAppointment = async (req, res) => {
  try {
    const { userId } = req.user;
    const { docId, slotDate, slotTime } = req.body;
    const normalizedDocId = typeof docId === 'string' ? docId.trim() : docId;

    if (!normalizedDocId || normalizedDocId === 'undefined' || normalizedDocId === 'null') {
      return res.status(400).json({ success: false, message: 'docId is required.' });
    }
    if (!UUID_RE.test(String(normalizedDocId))) {
      return res.status(400).json({ success: false, message: 'docId must be a valid UUID.' });
    }

    const { data: doctorProfile, error: doctorErr } = await supabase
      .from('doctor_profiles')
      .select('id,user_id,is_verified,is_available')
      .eq('id', normalizedDocId)
      .maybeSingle();
    if (doctorErr) return res.status(500).json({ success: false, message: doctorErr.message });
    if (!doctorProfile) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }
    if (!doctorProfile.is_verified || !doctorProfile.is_available) {
      return res.status(400).json({ success: false, message: 'Doctor is not available for booking.' });
    }

    // Check existing appointment for this doctor at the same slot
    const { data: existing, error: existErr } = await supabase
      .from('appointments')
      .select('*')
      .eq('doctor_id', normalizedDocId)
      .eq('slot_date', slotDate)
      .eq('slot_time', slotTime)
      .maybeSingle();
    if (existErr) return res.status(500).json({ success: false, message: existErr.message });
    if (existing) return res.status(400).json({ success: false, message: 'This slot is already booked.' });

    const appointmentData = {
      patient_id: userId,
      doctor_id: normalizedDocId,
      slot_date: slotDate,
      slot_time: slotTime,
      amount: req.body.amount || 0,
      created_at: new Date().toISOString(),
    };

    const { data: created, error: createErr } = await supabase.from('appointments').insert(appointmentData).select().maybeSingle();
    if (createErr) return res.status(500).json({ success: false, message: createErr.message });

    await Promise.all([
      createNotificationSafe({
        userId,
        title: 'Appointment booked',
        message: 'Your appointment has been booked.',
        type: 'appointment_booked',
        metadata: {
          appointmentId: created?.id,
          doctorId: normalizedDocId,
          slotDate,
          slotTime,
        },
      }),
      createNotificationSafe({
        userId: doctorProfile.user_id,
        title: 'New appointment',
        message: 'A patient booked an appointment with you.',
        type: 'appointment_booked',
        metadata: {
          appointmentId: created?.id,
          patientId: userId,
          slotDate,
          slotTime,
        },
      }),
    ]);

    return res.status(200).json({ success: true, message: 'Appointment booked successfully.', appointment: created });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// API to get all appointments of a user
const listAppointment = async (req, res) => {
  try {
    const { userId } = req.user;
    const { data, error } = await supabase.from('appointments').select('*').eq('patient_id', userId);
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.status(200).json({ success: true, appointments: data });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// API to cancel an appointment
const cancelAppointment = async (req, res) => {
  try {
    const { userId } = req.user;
    const { appointmentId } = req.body;
    const { data, error } = await supabase.from('appointments').select('*').eq('id', appointmentId).maybeSingle();
    if (error) return res.status(500).json({ success: false, message: error.message });
    if (!data) return res.status(404).json({ success: false, message: 'Appointment not found.' });
    if (data.patient_id !== userId) return res.status(403).json({ success: false, message: 'You are not authorized to cancel this appointment.' });
    const { error: upErr } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', appointmentId);
    if (upErr) return res.status(500).json({ success: false, message: upErr.message });
    return res.status(200).json({ success: true, message: 'Appointment cancelled.' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// API to make payment of an appointment
const makePayment = async (req, res) => {
  try {
    const { userId } = req.user;
    const { appointmentId } = req.body;
    const { data, error } = await supabase.from('appointments').select('*').eq('id', appointmentId).maybeSingle();
    if (error) return res.status(500).json({ success: false, message: error.message });
    if (!data) return res.status(404).json({ success: false, message: 'Appointment not found.' });
    if (data.status === 'cancelled') return res.status(400).json({ success: false, message: 'Appointment cancelled.' });
    if (data.payment === true) return res.status(400).json({ success: false, message: 'Payment already completed.' });
    if (data.patient_id !== userId) return res.status(403).json({ success: false, message: 'You are not authorized to make payment for this appointment.' });
    const { error: upErr } = await supabase.from('appointments').update({ payment: true }).eq('id', appointmentId);
    if (upErr) return res.status(500).json({ success: false, message: upErr.message });
    return res.status(200).json({ success: true, message: 'Payment successful.' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  bookAppointment,
  listAppointment,
  cancelAppointment,
  makePayment,
};
