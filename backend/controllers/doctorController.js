import supabase from "../config/supabase.js";
import { generateAccessToken } from "../util/token.util.js";
import repo from "../repository/auth.repository.js";
import service from "../services/dashboard.service.js";

/**
 * Resolve doctor_profiles.id from logged-in user.
 * Supports:
 * - req.user.docId if already set
 * - req.user.id
 * - req.user.userId
 * - req.user.sub
 */
async function resolveDoctorProfileId(req) {
  const possibleId =
    req.user?.docId ||
    req.user?.id ||
    req.user?.userId ||
    req.user?.sub;

  if (!possibleId) {
    throw new Error("Doctor user id not found in token");
  }

  // First check if possibleId is already doctor_profiles.id
  const { data: byProfileId, error: profileIdError } = await supabase
    .from("doctor_profiles")
    .select("id")
    .eq("id", possibleId)
    .maybeSingle();

  if (profileIdError) throw profileIdError;
  if (byProfileId?.id) return byProfileId.id;

  // Otherwise treat it as users.id and find doctor profile
  const { data: byUserId, error: userIdError } = await supabase
    .from("doctor_profiles")
    .select("id")
    .eq("user_id", possibleId)
    .maybeSingle();

  if (userIdError) throw userIdError;

  if (!byUserId?.id) {
    // Log what we found to help debug
    console.error(`[resolveDoctorProfileId] No doctor_profiles row found for user_id=${possibleId}`);
    
    // Last resort: check if the table uses a different column or the profile exists at all
    const { data: anyProfile } = await supabase
      .from("doctor_profiles")
      .select("id, user_id")
      .limit(5);
    console.error(`[resolveDoctorProfileId] Sample doctor_profiles rows:`, JSON.stringify(anyProfile));
    
    throw new Error("Doctor profile not found");
  }

  return byUserId.id;
}

const changeAvailability = async (req, res) => {
  try {
    const docId = await resolveDoctorProfileId(req);

    const updated = await repo.updateDoctorProfile(docId, {
      is_available: req.body.is_available,
    });

    return res.status(200).json({
      success: true,
      message: "Doctor availability status changed successfully",
      profile: updated,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

const doctorList = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("doctor_profiles")
      .select("*, users(name,email,avatar_url)")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      doctors: data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password required",
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({
        success: false,
        message: error.message,
      });
    }

    const sUser = data.user;

    const { data: doctorProfile, error: docError } = await supabase
      .from("doctor_profiles")
      .select("id")
      .eq("user_id", sUser.id)
      .maybeSingle();

    if (docError) throw docError;

    if (!doctorProfile) {
      return res.status(403).json({
        success: false,
        message: "Doctor profile not found",
      });
    }

    const token = generateAccessToken({
      id: sUser.id,
      userId: sUser.id,
      docId: doctorProfile.id,
      role: "doctor",
      email: sUser.email,
    });

    return res.status(200).json({
      success: true,
      token,
      doctorId: doctorProfile.id,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const appointmentsDoctor = async (req, res) => {
  try {
    const docId = await resolveDoctorProfileId(req);

    const { data, error } = await supabase
      .from("appointments")
      .select(`
        *,
        patient:patients(
          *,
          users(name,email,phone,avatar_url)
        ),
        doctor:doctor_profiles(
          *,
          users(name,email,avatar_url)
        ),
        payment:payments(status,amount,paid_at)
      `)
      .eq("doctor_id", docId)
      .order("scheduled_at", { ascending: true });

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      appointments: data || [],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const appointmentComplete = async (req, res) => {
  try {
    const docId = await resolveDoctorProfileId(req);
    const { appointmentId } = req.body;

    const { data: appointment, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", appointmentId)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    if (appointment.doctor_id !== docId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    const { error: updateError } = await supabase
      .from("appointments")
      .update({ status: "COMPLETED" })
      .eq("id", appointmentId);

    if (updateError) {
      return res.status(500).json({
        success: false,
        message: updateError.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Appointment completed.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const appointmentCancel = async (req, res) => {
  try {
    const docId = await resolveDoctorProfileId(req);
    const { appointmentId } = req.body;

    const { data: appointment, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", appointmentId)
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    if (appointment.doctor_id !== docId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    const { error: updateError } = await supabase
      .from("appointments")
      .update({ status: "CANCELLED" })
      .eq("id", appointmentId);

    if (updateError) {
      return res.status(500).json({
        success: false,
        message: updateError.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Appointment cancelled.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const doctorDashboard = async (req, res) => {
  try {
    const docId = await resolveDoctorProfileId(req);

    // Fetch appointments with patient info and payments
    const { data: appointments, error } = await supabase
      .from("appointments")
      .select(`
        *,
        patient:patients(
          *,
          users(name,email,phone,avatar_url)
        ),
        payment:payments(status,amount,paid_at)
      `)
      .eq("doctor_id", docId)
      .order("scheduled_at", { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    const appts = appointments || [];

    // Total earnings: sum of all PAID payments for this doctor's appointments
    let totalEarning = 0;
    appts.forEach((appt) => {
      (appt.payment || []).forEach((p) => {
        if (p.status === "PAID") totalEarning += Number(p.amount) || 0;
      });
    });

    // This month earnings
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    let thisMonth = 0;
    appts.forEach((appt) => {
      (appt.payment || []).forEach((p) => {
        if (p.status === "PAID" && p.paid_at >= monthStart) {
          thisMonth += Number(p.amount) || 0;
        }
      });
    });

    // Pending: appointments that are CONFIRMED but no PAID payment yet
    let pending = 0;
    appts.forEach((appt) => {
      if (appt.status === "CONFIRMED") {
        const hasPaid = (appt.payment || []).some((p) => p.status === "PAID");
        if (!hasPaid) {
          // Use doctor's consultation fee as expected amount
          pending += Number(appt.consultation_fee) || 0;
        }
      }
    });

    // Monthly earnings for the last 6 months
    const monthlyMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString("en-US", { month: "short" });
      monthlyMap[key] = 0;
    }
    appts.forEach((appt) => {
      (appt.payment || []).forEach((p) => {
        if (p.status === "PAID" && p.paid_at) {
          const d = new Date(p.paid_at);
          const key = d.toLocaleString("en-US", { month: "short" });
          if (key in monthlyMap) monthlyMap[key] += Number(p.amount) || 0;
        }
      });
    });
    const monthlyEarnings = Object.entries(monthlyMap).map(([month, earnings]) => ({ month, earnings }));

    // Avg per consultation (paid only)
    const paidCount = appts.filter((a) => (a.payment || []).some((p) => p.status === "PAID")).length;
    const avgPerConsultation = paidCount > 0 ? Math.round(totalEarning / paidCount) : 0;

    // Unique patients
    const patients = Array.from(new Set(appts.map((a) => a.patient_id)));

    // Today's appointments
    const todayStr = now.toISOString().slice(0, 10);
    const todayAppointments = appts.filter((a) => (a.scheduled_at || "").slice(0, 10) === todayStr).length;

    // Pending appointments (PENDING status)
    const pendingAppointments = appts.filter((a) => a.status === "PENDING");

    // Recent confirmed/completed consultations
    const recentConsultations = appts
      .filter((a) => a.status === "CONFIRMED" || a.status === "COMPLETED")
      .slice(0, 5);

    const dashData = {
      earning: totalEarning,
      thisMonth,
      pending,
      avgPerConsultation,
      monthlyEarnings,
      appointments: appts.length,
      patients: patients.length,
      todayAppointments,
      todayAppointmentsList: appts.filter((a) => (a.scheduled_at || "").slice(0, 10) === todayStr),
      pendingAppointmentsList: pendingAppointments,
      latestAppointments: recentConsultations,
    };

    return res.status(200).json({ success: true, dashData });
  } catch (error) {
    console.error("doctorDashboard error", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const doctorProfile = async (req, res) => {
  try {
    const docId = await resolveDoctorProfileId(req);

    const { data: profile, error } = await supabase
      .from("doctor_profiles")
      .select("*, users(name,email,phone,avatar_url)")
      .eq("id", docId)
      .maybeSingle();

    if (error) throw error;

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateDoctorProfile = async (req, res) => {
  try {
    const docId = await resolveDoctorProfileId(req);

    const {
      fees,
      address,
      available,
      qualifications,
      specialty,
      license_no,
      bio,
      experience,
      consultation_fee,
    } = req.body;

    const updates = {};

    if (fees !== undefined) updates.consultation_fee = fees;
    if (consultation_fee !== undefined) updates.consultation_fee = consultation_fee;
    if (address !== undefined) updates.address = address;
    if (available !== undefined) updates.is_available = available;
    if (qualifications !== undefined) updates.qualifications = qualifications;
    if (specialty !== undefined) updates.specialty = specialty;
    if (license_no !== undefined) updates.license_no = license_no;
    if (bio !== undefined) updates.bio = bio;
    if (experience !== undefined) updates.experience = experience;

    const { data, error } = await supabase
      .from("doctor_profiles")
      .update(updates)
      .eq("id", docId)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: "Doctor profile updated.",
      profile: data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getHealthQueries = async (req, res) => {
  try {
    const data = await service.getCommunityQueries(req.query);
    return res.status(200).json({ success: true, data, message: 'Queries fetched' });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const getHealthQueryDetails = async (req, res) => {
  try {
    const data = await service.getCommunityQueryDetails(req.params.id);
    return res.status(200).json({ success: true, data, message: 'Query details fetched' });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

const createHealthQueryResponse = async (req, res) => {
  try {
    const data = await service.addQueryResponse(req.user?.docId, req.params.id, req.body);
    return res.status(201).json({ success: true, data, message: 'Response submitted successfully' });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
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
  getHealthQueries,
  getHealthQueryDetails,
  createHealthQueryResponse,
};
