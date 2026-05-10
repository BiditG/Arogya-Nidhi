import validator from "validator";
import { v2 as cloudinary } from "cloudinary";
import supabase from "../config/supabase.js";
import repo from "../repository/auth.repository.js";
import { generateAccessToken } from "../util/token.util.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";

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

    // Passwords are managed by Supabase Auth; avoid storing password hashes

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
    const userId = createdUser?.user?.id || createdUser?.id;
    const userData = {
      id: userId,
      name,
      email,
      role: 'doctor',
      is_active: true, // Admin-added doctors are active immediately
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const { error: userErr } = await supabase.from('users').insert(userData);
    if (userErr) return res.status(500).json({ success: false, message: "User table sync failed: " + userErr.message });

    // insert doctor profile in Supabase
    const doctorProfileData = {
      id: crypto.randomUUID(),
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
    let { data, error } = await supabase
      .from('doctor_profiles')
      .select('*, users!doctor_profiles_user_id_fkey(name, email, avatar_url), doctor_verifications(status)')
      .order('created_at', { ascending: false });

    if (error) {
      const withoutVerification = await supabase
        .from('doctor_profiles')
        .select('*, users!doctor_profiles_user_id_fkey(name, email, avatar_url)')
        .order('created_at', { ascending: false });

      if (withoutVerification.error) {
        const plain = await supabase
          .from('doctor_profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (plain.error) {
          return res.status(500).json({ success: false, message: error.message });
        }

        data = plain.data;
      } else {
        data = withoutVerification.data;
      }
    }

    const formattedDoctors = data.map(doc => {
      const verifications = doc.doctor_verifications || doc.doctor_verification;
      const verification = Array.isArray(verifications) ? verifications[0] : verifications;
      const user = doc.users || doc.user || {};
      const specialty = doc.specialty || doc.speciality || doc.sub_specialty || 'General physician';
      const licenseNo = doc.license_no || doc.nmc_license_no || null;
      
      return {
        ...doc,
        _id: doc.id,
        users: user,
        user,
        name: doc.name || user.name || user.email || licenseNo || `Dr ${String(doc.id || '').slice(0, 8)}`,
        image: doc.image || doc.avatar_url || user.avatar_url || null,
        speciality: specialty,
        specialty,
        fees: doc.consultation_fee ?? doc.fees ?? 0,
        fee: doc.consultation_fee ?? doc.fee ?? doc.fees ?? 0,
        available: Boolean(doc.available ?? doc.is_available),
        is_available: Boolean(doc.is_available ?? doc.available),
        license_no: licenseNo,
        verification_status: (doc.is_verified ? 'verified' : (verification?.status || 'pending')).toLowerCase()
      };
    });

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
    const [
      { data: doctors },
      { data: users },
      { data: appointments },
      { data: students },
      { data: patients },
    ] = await Promise.all([
      supabase.from('doctor_profiles').select('id'),
      supabase.from('users').select('id'),
      supabase.from('appointments').select(`
        id,
        status,
        scheduled_at,
        created_at,
        patient:patients(
          users(name,email)
        ),
        doctor:doctor_profiles(
          specialty,
          users(name,email)
        ),
        payment:payments(id,status,amount,paid_at,gateway)
      `),
      supabase.from('student_profiles').select('id'),
      supabase.from('patients').select('id'),
    ]);

    const isEarningAppointment = (appt) =>
      ['CONFIRMED', 'COMPLETED'].includes(String(appt?.status || '').toUpperCase());
    const paidPaymentsFor = (appt) =>
      (appt.payment || []).filter((p) => String(p?.status || '').toUpperCase() === 'PAID');
    const paidConfirmedPayments = (appointments || [])
      .filter(isEarningAppointment)
      .flatMap((appointment) =>
        paidPaymentsFor(appointment).map((payment) => ({ appointment, payment }))
      );
    const totalEarnings = paidConfirmedPayments.reduce(
      (sum, { payment }) => sum + (Number(payment.amount) || 0),
      0
    );

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const thisMonthEarnings = paidConfirmedPayments.reduce((sum, { payment }) => {
      if (payment.paid_at && payment.paid_at >= monthStart) {
        return sum + (Number(payment.amount) || 0);
      }
      return sum;
    }, 0);
    const avgPaidBooking = paidConfirmedPayments.length
      ? Math.round(totalEarnings / paidConfirmedPayments.length)
      : 0;
    const revenueTransactions = paidConfirmedPayments
      .sort((a, b) => new Date(b.payment.paid_at || b.appointment.scheduled_at || 0) - new Date(a.payment.paid_at || a.appointment.scheduled_at || 0))
      .slice(0, 10)
      .map(({ appointment, payment }) => ({
        id: payment.id,
        appointmentId: appointment.id,
        date: payment.paid_at || appointment.scheduled_at || appointment.created_at,
        amount: Number(payment.amount) || 0,
        status: payment.status,
        gateway: payment.gateway,
        patient: appointment.patient?.users?.name || appointment.patient?.users?.email || 'Patient',
        doctor: appointment.doctor?.users?.name || appointment.doctor?.users?.email || 'Doctor',
        specialty: appointment.doctor?.specialty || 'Consultation',
      }));

    const dashData = {
      totalUsers: users?.length || 0,
      totalDoctors: doctors?.length || 0,
      totalStudents: students?.length || 0,
      totalPatients: patients?.length || 0,
      totalAppointments: appointments?.length || 0,
      totalEarnings,
      earning: totalEarnings,
      thisMonthEarnings,
      paidBookingCount: paidConfirmedPayments.length,
      avgPaidBooking,
      revenueTransactions,
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

    // Insert user into users table
    const newUser = {
      id: createdUser?.user?.id || createdUser?.id,
      name,
      email,
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

    // If role is patient, create empty patient profile
    if (role === 'patient') {
      await supabase.from('patients').insert({
        id: crypto.randomUUID(),
        user_id: newUser.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
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

    // Manual cascading deletes
    await supabase.from('refresh_tokens').delete().eq('user_id', id);
    await supabase.from('notifications').delete().eq('user_id', id);
    await supabase.from('ai_interaction_logs').delete().eq('user_id', id);

    // Profile specific deletes
    const { data: user } = await supabase.from('users').select('role').eq('id', id).maybeSingle();
    if (user) {
      if (user.role === 'doctor') {
        const { data: profile } = await supabase.from('doctor_profiles').select('id').eq('user_id', id).maybeSingle();
        if (profile) {
          await supabase.from('doctor_verifications').delete().eq('doctor_id', profile.id);
          // Note: Appointments and query_responses might have other constraints, but let's try to delete profile
          await supabase.from('doctor_profiles').delete().eq('id', profile.id);
        }
      } else if (user.role === 'patient') {
        await supabase.from('patients').delete().eq('user_id', id);
      } else if (user.role === 'student') {
        await supabase.from('student_profiles').delete().eq('user_id', id);
      }
    }

    // Finally delete from users table
    const { error: dbErr } = await supabase.from('users').delete().eq('id', id);
    
    if (dbErr) {
       // Fallback to soft delete if still restricted
       await supabase.from('users').update({ is_active: false }).eq('id', id);
       return res.status(200).json({ success: true, message: 'User deactivated (could not be fully deleted due to linked records).' });
    }

    // delete auth user
    const { error: authErr } = await supabase.auth.admin.deleteUser(id);
    if (authErr) console.warn("Auth delete failed:", authErr.message);

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

    // Update or create the doctor_verifications record
    try {
      const { data: existingV } = await supabase.from('doctor_verifications').select('id').eq('doctor_id', doctorId).maybeSingle();
      const vData = {
        doctor_id: doctorId,
        status: isVerified ? 'verified' : 'rejected',
        verified_at: isVerified ? new Date().toISOString() : null,
        reviewed_by: 'admin'
      };

      if (existingV) {
        await supabase.from('doctor_verifications').update(vData).eq('id', existingV.id);
      } else {
        vData.id = crypto.randomUUID();
        vData.created_at = new Date().toISOString();
        await supabase.from('doctor_verifications').insert(vData);
      }
    } catch (vErr) {
      console.warn("Failed to update doctor_verifications record:", vErr.message);
    }

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
