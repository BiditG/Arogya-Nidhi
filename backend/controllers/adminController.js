import validator from "validator";
import bcrypt from "bcrypt";
import { v2 as cloudinary } from "cloudinary";
import { supabase } from "../config/supabase.js";
import repo from "../repository/auth.repository.js";
import { generateAccessToken } from "../util/token.util.js";
import jwt from "jsonwebtoken";

// API for adding doctor
const addDoctor = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      speciality,
      degree,
      experience,
      about,
      fees,
      address,
    } = req.body;
    const imageFile = req.file;

    // checking for all data to add-doctor
    if (
      !name ||
      !email ||
      !password ||
      !speciality ||
      !degree ||
      !experience ||
      !about ||
      !fees ||
      !address ||
      !imageFile
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Please fill all fields" });
    }

    // validating email format
    if (!validator.isEmail(email)) {
      return res
        .status(400)
        .json({ success: false, message: "Please enter a valid email!" });
    }

    // validating password length
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long!",
      });
    }

    // hashing the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // upload image to cloudinary
    const imageUpload = await cloudinary.uploader.upload(imageFile.path, { resource_type: 'image' });
    const imageUrl = imageUpload.secure_url;

    // create Supabase auth user for doctor
    const { data: createdUser, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role: 'doctor' },
      email_confirm: true,
    });
    if (createErr) return res.status(500).json({ success: false, message: createErr.message });

    // insert user into 'users' table
    const userId = createdUser?.id || createdUser?.user?.id;
    const userData = {
      id: userId,
      name,
      email,
      role: 'doctor',
      password_hash: hashedPassword,
      is_active: true, // Admin-added doctors are active immediately
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { error: userErr } = await supabase.from('users').insert(userData);
    if (userErr) return res.status(500).json({ success: false, message: "User table sync failed: " + userErr.message });

    // insert doctor profile in Supabase
    const doctorProfileData = {
      user_id: userId,
      specialty: speciality || "General Medicine",
      qualifications: degree || null,
      experience_years: parseInt(experience) || 0,
      bio: about || null,
      consultation_fee: Number(fees) || 0,
      address: typeof address === 'string' ? JSON.parse(address) : address,
      image: imageUrl,
      is_verified: true, // Admin-added doctors are verified immediately
      nmc_license_no: `ADMIN-${Date.now()}`, // Admin added doctors don't always have license in form
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: profErr } = await supabase.from('doctor_profiles').insert(doctorProfileData);
    if (profErr) return res.status(500).json({ success: false, message: "Profile creation failed: " + profErr.message });

    return res.status(201).json({ success: true, message: 'Doctor added successfully' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// API for Admin Login
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // checking for all data to login
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Please enter email and password!" });
    }

    if (
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const token = jwt.sign({ email, role: 'admin' }, process.env.JWT_SECRET);
      return res.status(200).json({
        success: true,
        token,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// API for getting all doctors
const getAllDoctors = async (req, res) => {
  try {
    // Explicitly joining the 'users' table
    const { data, error } = await supabase
      .from('doctor_profiles')
      .select('*, users!doctor_profiles_user_id_fkey(name, email, avatar_url)')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const formattedDoctors = data.map(doc => ({
      ...doc,
      users: doc.users || doc.user || {},
      license_no: doc.nmc_license_no // Map to a common name for frontend
    }));

    return res.status(200).json({ success: true, doctors: formattedDoctors });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// API to get all appointments list
const appointmentsAdmin = async (req, res) => {
  try {
    const { data, error } = await supabase.from('appointments').select('*');
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.status(200).json({ success: true, appointments: data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// API for appointment cancellation
const appointmentCancelAdmin = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const { data, error } = await supabase.from('appointments').select('*').eq('id', appointmentId).maybeSingle();
    if (error) return res.status(500).json({ success: false, message: error.message });
    if (!data) return res.status(404).json({ success: false, message: 'Appointment not found.' });
    const { error: upErr } = await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', appointmentId);
    if (upErr) return res.status(500).json({ success: false, message: upErr.message });
    return res.status(200).json({ success: true, message: 'Appointment cancelled.' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// API to get dashboard data for admin dashboard
const adminDashboard = async (req, res) => {
  try {
    const [{ data: doctors }, { data: users }, { data: appointments }] = await Promise.all([
      supabase.from('doctor_profiles').select('id'),
      supabase.from('users').select('id'),
      supabase.from('appointments').select('id'),
    ]);
    const dashData = {
      doctors: doctors?.length || 0,
      patients: users?.length || 0,
      appointments: appointments?.length || 0,
      latestAppointments: [],
    };
    return res.status(200).json({ success: true, dashData });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

// API for getting all users
const getAllUsers = async (req, res) => {
  try {
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ success: false, message: error.message });
    return res.status(200).json({ success: true, users: data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// API for adding a new user
const addUser = async (req, res) => {
  try {
    const { name, email, role, password } = req.body;
    
    if (!name || !email || !role || !password) {
      return res.status(400).json({ success: false, message: "Please fill all fields" });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email!" });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters long!" });
    }

    // Create Supabase auth user
    const { data: createdUser, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role },
      email_confirm: true,
    });
    if (createErr) return res.status(500).json({ success: false, message: createErr.message });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user into users table
    const newUser = {
      id: createdUser?.user?.id || createdUser?.id,
      name,
      email,
      password_hash: hashedPassword,
      role,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: insertErr } = await supabase.from('users').insert(newUser);
    if (insertErr) {
       // Cleanup auth user if db insert fails
       await supabase.auth.admin.deleteUser(newUser.id);
       return res.status(500).json({ success: false, message: insertErr.message });
    }

    return res.status(201).json({ success: true, message: 'User added successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// API for updating user details
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, is_active } = req.body;

    const updates = {
      updated_at: new Date().toISOString()
    };
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (role !== undefined) updates.role = role;
    if (is_active !== undefined) updates.is_active = is_active;

    const { error } = await supabase.from('users').update(updates).eq('id', id);
    if (error) return res.status(500).json({ success: false, message: error.message });

    return res.status(200).json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// API for deleting a user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Try deleting from users table first (will fail if foreign keys exist and cascade is not set)
    const { error: dbErr } = await supabase.from('users').delete().eq('id', id);
    if (dbErr) {
       // Fallback to soft delete
       await supabase.from('users').update({ is_active: false }).eq('id', id);
       return res.status(200).json({ success: true, message: 'User deactivated (could not be fully deleted due to linked records).' });
    }

    // Delete from Supabase Auth
    await supabase.auth.admin.deleteUser(id);

    return res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// API for verifying/approving a doctor
const verifyDoctor = async (req, res) => {
  try {
    const { doctorId, status } = req.body; // status: 'verified' or 'rejected'
    
    // Find the doctor profile
    const { data: profile, error: profErr } = await supabase.from('doctor_profiles').select('user_id').eq('id', doctorId).maybeSingle();
    if (profErr || !profile) return res.status(404).json({ success: false, message: 'Doctor profile not found' });

    const isVerified = status === 'verified';

    // Update doctor profile verification status
    const { error: upProfErr } = await supabase.from('doctor_profiles').update({ is_verified: isVerified }).eq('id', doctorId);
    if (upProfErr) return res.status(500).json({ success: false, message: upProfErr.message });

    // Also update the user's is_active status
    const { error: upUserErr } = await supabase.from('users').update({ is_active: isVerified }).eq('id', profile.user_id);
    if (upUserErr) return res.status(500).json({ success: false, message: upUserErr.message });

    return res.status(200).json({ success: true, message: `Doctor ${status} successfully` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export {
  addDoctor,
  loginAdmin,
  getAllDoctors,
  appointmentsAdmin,
  appointmentCancelAdmin,
  adminDashboard,
  getAllUsers,
  addUser,
  updateUser,
  deleteUser,
  verifyDoctor,
};
