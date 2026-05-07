import authService from "../services/auth.service.js";
import { sendSuccess, sendError } from "../util/response.util.js";
import supabase from "../config/supabase.js";
import repo from "../repository/auth.repository.js";
import crypto from "crypto";

function getMeta(req) {
  return {
    ip: req.ip || req.headers["x-forwarded-for"],
    userAgent: req.headers["user-agent"],
  };
}

export async function register(req, res) {
  try {
    const { email, password, name, role, ...profile } = req.body;

    if (!email || !password || !role || !name) {
      return sendError(res, "email, password, name and role are required", 400);
    }

    if (!supabase) {
      return sendError(res, "Supabase not configured on server", 500);
    }

    // 1. Create/Ensure Auth User exists in Supabase Auth
    let supaUser = null;
    const { data: createdUser, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role },
      email_confirm: true,
    });

    if (createErr) {
      // If user already exists in Auth, retrieve their ID using admin API
      if (createErr.message.includes("already registered") || createErr.status === 422) {
        const { data: listData, error: listErr } = await supabase.auth.admin.listUsers();
        const existingUser = listData?.users?.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (listErr || !existingUser) {
          return sendError(res, "User exists in Auth but could not be retrieved", 500);
        }
        supaUser = existingUser;
      } else {
        return sendError(res, "Supabase Auth Error: " + createErr.message, 500);
      }
    } else {
      supaUser = createdUser.user;
    }

    if (!supaUser) return sendError(res, "Failed to retrieve Supabase user", 500);

    // 2. Sync to local 'users' table
    const resolvedRole = role || 'patient';

    // Do not store passwords locally when using Supabase Auth; keep user record
    // in the `users` table limited to public/profile fields that exist in the
    // remote schema (avoids PostgREST schema cache mismatch for password_hash).
    const userData = {
      id: supaUser.id,
      email: supaUser.email,
      role: resolvedRole,
      name: name,
      is_active: resolvedRole === 'doctor' ? false : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      await repo.upsertUser(userData);
    } catch (dbErr) {
      console.error("Database Sync Error (users table):", dbErr);
      return sendError(res, "Database Sync Error: " + dbErr.message, 500);
    }

    // 3. Create role-specific profiles
    let roleProfile = null;
    try {
      const now = new Date().toISOString();
      if (resolvedRole === 'doctor') {
        // Check if profile already exists
        const { data: existing } = await supabase.from('doctor_profiles').select('id').eq('user_id', supaUser.id).maybeSingle();

        const doctorData = {
          user_id: supaUser.id,
          license_no: profile.licenseNo || profile.nmcLicenseNo || "PENDING",
          specialty: profile.specialty || "General Medicine",
          sub_specialty: profile.subSpecialty || null,
          consultation_fee: Number(profile.consultationFee) || 0,
          qualifications: profile.qualifications || null,
          is_verified: false,
          is_available: true,
          updated_at: now,
        };

        if (existing) {
          const { data: updated, error: upErr } = await supabase.from('doctor_profiles').update(doctorData).eq('id', existing.id).select().maybeSingle();
          if (upErr) console.warn("Doctor profile update error:", upErr.message);
          roleProfile = updated;
        } else {
          doctorData.id = crypto.randomUUID();
          doctorData.created_at = now;
          const { data: created, error: crErr } = await supabase.from('doctor_profiles').insert(doctorData).select().maybeSingle();
          if (crErr) console.warn("Doctor profile insert error:", crErr.message);
          roleProfile = created;
        }

        // Create a pending verification record if profile exists (new or updated)
        if (roleProfile) {
          const { data: existingV } = await supabase.from('doctor_verifications').select('id').eq('doctor_id', roleProfile.id).maybeSingle();
          const vData = {
            doctor_id: roleProfile.id,
            status: 'pending',
          };
          if (existingV) {
            await supabase.from('doctor_verifications').update(vData).eq('id', existingV.id);
          } else {
            vData.id = crypto.randomUUID();
            vData.created_at = now;
            await supabase.from('doctor_verifications').insert(vData);
          }
        }
      } else if (resolvedRole === 'student') {
        const { data: existing } = await supabase.from('student_profiles').select('id').eq('user_id', supaUser.id).maybeSingle();
        const studentData = {
          user_id: supaUser.id,
          institution: profile.institution || null,
          faculty: profile.faculty || null,
          updated_at: now,
        };
        if (existing) {
          const { data: updated } = await supabase.from('student_profiles').update(studentData).eq('id', existing.id).select().maybeSingle();
          roleProfile = updated;
        } else {
          studentData.id = crypto.randomUUID();
          studentData.created_at = now;
          const { data: created } = await supabase.from('student_profiles').insert(studentData).select().maybeSingle();
          roleProfile = created;
        }
      } else if (resolvedRole === 'patient') {
        const { data: existing } = await supabase.from('patients').select('id').eq('user_id', supaUser.id).maybeSingle();
        const patientData = {
          user_id: supaUser.id,
          date_of_birth: profile.dateOfBirth || null,
          blood_group: profile.bloodGroup || null,
          gender: profile.gender || null,
          medical_history: profile.medicalHistory || null,
          allergies: profile.allergies || null,
          updated_at: now,
        };
        if (existing) {
          const { data: updated } = await supabase.from('patients').update(patientData).eq('id', existing.id).select().maybeSingle();
          roleProfile = updated;
        } else {
          patientData.id = crypto.randomUUID();
          patientData.created_at = now;
          const { data: created } = await supabase.from('patients').insert(patientData).select().maybeSingle();
          roleProfile = created;
        }
      }
    } catch (profErr) {
      console.warn("Profile creation warning:", profErr.message);
    }

    // 4. Return success with a session token
    const { data: authData } = await supabase.auth.signInWithPassword({ email, password });

    return sendSuccess(res, {
      session: authData?.session,
      user: supaUser,
      profile: roleProfile
    }, "Registration successful", 201);
  } catch (err) {
    console.error("Registration Exception:", err);
    return sendError(res, err.message || "Registration failed", 500);
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, "Email and password are required", 400);
    }

    if (!supabase) return sendError(res, "Supabase not configured on server", 500);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return sendError(res, error.message || "Login failed", 401);
    // Sync Supabase metadata into users table (ensure role & name persisted)
    try {
      const supaUser = data?.user;
      const metadata = supaUser?.user_metadata || {};
      const role = metadata.role || 'patient';

      // Find the current user status to avoid overriding it
      const existingUser = await repo.findUserById(supaUser.id);

      await repo.upsertUser({
        id: supaUser?.id,
        email: supaUser?.email,
        role: role,
        name: metadata.name || supaUser?.email?.split('@')?.[0] || '',
        avatar_url: metadata.avatar_url || supaUser?.avatar_url || null,
        // Keep existing is_active status if it exists, otherwise default for non-doctors
        is_active: existingUser ? existingUser.is_active : (role !== 'doctor'),
      });
    } catch (err) {
      console.warn('Failed to sync Supabase user to users table on login', err?.message || err);
    }

    return sendSuccess(res, { session: data.session, user: data.user }, "Login successful");
  } catch (err) {
    console.error("Login error", err);
    return sendError(res, err.message || "Login failed", err.status || 500);
  }
}

export async function refreshToken(req, res) {
  try {
    const token = req.body.refreshToken || req.cookies?.refreshToken;

    if (!token) {
      return sendError(res, "Refresh token required", 400);
    }

    const tokens = await authService.refresh(token, getMeta(req));
    return sendSuccess(res, tokens, "Token refreshed");
  } catch (err) {
    return sendError(res, err.message, err.status || 500);
  }
}

export async function logout(req, res) {
  try {
    const token = req.body.refreshToken || req.cookies?.refreshToken;

    await authService.logout(token);

    return sendSuccess(res, {}, "Logged out successfully");
  } catch (err) {
    return sendError(res, err.message, err.status || 500);
  }
}

export async function logoutAll(req, res) {
  try {
    await authService.logoutAll(req.user.sub);

    return sendSuccess(res, {}, "Logged out from all devices");
  } catch (err) {
    return sendError(res, err.message, err.status || 500);
  }
}

export async function me(req, res) {
  try {
    const id = req.user?.userId || req.user?.sub || req.user?.id || null;
    if (!id) return sendError(res, 'User id not found in token', 400);

    // Try find local user by id, then by email
    let user = null;
    try {
      user = await repo.findUserById(id);
    } catch (_) {
      // ignore
    }
    if (!user && req.user?.email) {
      try { user = await repo.findUserByEmail(req.user.email); } catch (_) { }
    }

    if (!user) return sendError(res, 'User not found', 404);

    if (!user.barcode) {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const candidate = generateBarcodeValue();
        try {
          user = await repo.updateUserById(id, { barcode: candidate });
          break;
        } catch (err) {
          const message = String(err?.message || '').toLowerCase();
          if (!message.includes('duplicate') && !message.includes('unique')) {
            throw err;
          }
        }
      }
    }

    return sendSuccess(res, { user }, 'User profile');
  } catch (err) {
    return sendError(res, err.message || 'Failed to fetch user', err.status || 500);
  }
}

export async function getDoctorProfile(req, res) {
  try {
    const id = req.user?.userId || req.user?.sub || req.user?.id || null;
    if (!id) return sendError(res, 'User id not found in token', 400);

    const profile = await repo.findDoctorProfileByUserId(id);
    if (!profile) return sendError(res, 'Doctor profile not found', 404);

    return sendSuccess(res, { profile }, 'Doctor profile');
  } catch (err) {
    console.error('getDoctorProfile error', err);
    return sendError(res, err.message || 'Failed to fetch doctor profile', err.status || 500);
  }
}

export async function updateDoctorProfile(req, res) {
  try {
    const id = req.user?.userId || req.user?.sub || req.user?.id || null;
    if (!id) return sendError(res, 'User id not found in token', 400);

    const body = req.body || {};
    const updates = {};
    const userUpdates = {};

    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
    const resolvedName = [firstName, lastName].filter(Boolean).join(' ') || (typeof body.name === 'string' ? body.name.trim() : '');

    if (resolvedName) userUpdates.name = resolvedName;
    if (body.email !== undefined && String(body.email || '').trim()) userUpdates.email = String(body.email).trim();
    if (body.phone !== undefined) userUpdates.phone = body.phone === '' ? null : body.phone;

    const consultationFee = body.consultation_fee ?? body.consultationFee;
    if (consultationFee !== undefined) {
      const parsed = consultationFee === '' || consultationFee === null ? null : Number(consultationFee);
      if (parsed !== null && Number.isNaN(parsed)) return sendError(res, 'Invalid consultation fee', 400);
      updates.consultation_fee = parsed;
    }
    if (body.qualifications !== undefined) updates.qualifications = body.qualifications;
    if (body.is_available !== undefined) updates.is_available = body.is_available;
    if (body.isAvailable !== undefined) updates.is_available = body.isAvailable;
    if (body.specialty !== undefined) updates.specialty = body.specialty;
    if (body.sub_specialty !== undefined) updates.sub_specialty = body.sub_specialty;
    if (body.subSpecialty !== undefined) updates.sub_specialty = body.subSpecialty;
    if (body.license_no !== undefined) updates.license_no = body.license_no;
    if (body.licenseNo !== undefined) updates.license_no = body.licenseNo;
    if (body.nmc_license_no !== undefined) updates.license_no = body.nmc_license_no;

    if (Object.keys(updates).length === 0 && Object.keys(userUpdates).length === 0) {
      return sendError(res, 'No updatable fields provided', 400);
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
    }

    let updatedUser = null;
    if (Object.keys(userUpdates).length > 0) {
      updatedUser = await repo.updateUserById(id, userUpdates);
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(id);
        const existingMeta = authUser?.user?.user_metadata || {};
        const nextMeta = { ...existingMeta };
        if (resolvedName) nextMeta.name = resolvedName;
        if (body.phone !== undefined) nextMeta.phone = body.phone === '' ? null : body.phone;
        if (updatedUser?.role && !nextMeta.role) nextMeta.role = updatedUser.role;

        const authUpdates = { user_metadata: nextMeta };
        if (userUpdates.email) authUpdates.email = userUpdates.email;

        await supabase.auth.admin.updateUserById(id, authUpdates);
      } catch {
        // ignore auth metadata sync failures
      }
    }

    const updatedProfile = Object.keys(updates).length > 0
      ? await repo.updateDoctorProfile(id, updates)
      : await repo.findDoctorProfileByUserId(id);

    return sendSuccess(res, { profile: updatedProfile, user: updatedUser }, 'Doctor profile updated');
  } catch (err) {
    console.error('updateDoctorProfile error', err);
    return sendError(res, err.message || 'Failed to update doctor profile', err.status || 500);
  }
}