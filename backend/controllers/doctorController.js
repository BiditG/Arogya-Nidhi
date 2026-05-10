import supabase from "../config/supabase.js";
import { generateAccessToken } from "../util/token.util.js";
import service from "../services/dashboard.service.js";

function normalizeIotReading(row) {
  if (!row) return row;
  const readingData = row.reading_data ?? row.sensor_data ?? {};
  const sensorData = readingData && typeof readingData === "object" ? readingData : { value: readingData };
  const scoreValue = sensorData.resultScore ?? sensorData.score ?? null;

  return {
    ...row,
    readingData: sensorData,
    sensorData,
    resultScore: scoreValue === null || scoreValue === undefined ? null : Number(scoreValue),
    testType: row.test_type || sensorData.test || null,
    normalRange: row.normal_range || null,
    recordedAt: row.recorded_at || null,
    createdAt: row.created_at || row.recorded_at || null,
  };
}

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
    const docId = req.body?.docId || req.body?.doctorId || await resolveDoctorProfileId(req);

    const { data: existing, error: existingError } = await supabase
      .from("doctor_profiles")
      .select("is_available")
      .eq("id", docId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found",
      });
    }

    const nextAvailability =
      typeof req.body?.is_available === "boolean"
        ? req.body.is_available
        : !Boolean(existing.is_available);

    const { data: updated, error: updateError } = await supabase
      .from("doctor_profiles")
      .update({ is_available: nextAvailability })
      .eq("id", docId)
      .select()
      .maybeSingle();

    if (updateError) throw updateError;

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
    let { data, error } = await supabase
      .from("doctor_profiles")
      .select("*, users!doctor_profiles_user_id_fkey(name,email,avatar_url)")
      .order("created_at", { ascending: false });

    if (error) {
      const fallback = await supabase
        .from("doctor_profiles")
        .select("*, users(name,email,avatar_url)")
        .order("created_at", { ascending: false });

      if (fallback.error) {
        const plain = await supabase
          .from("doctor_profiles")
          .select("*")
          .order("created_at", { ascending: false });

        if (plain.error) {
          return res.status(500).json({
            success: false,
            message: error.message,
          });
        }

        data = plain.data;
      } else {
        data = fallback.data;
      }
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

    const isEarningAppointment = (appt) =>
      ["CONFIRMED", "COMPLETED"].includes(String(appt?.status || "").toUpperCase());
    const paidPaymentsFor = (appt) =>
      (appt.payment || []).filter((p) => String(p?.status || "").toUpperCase() === "PAID");
    const paidConfirmedPayments = appts
      .filter(isEarningAppointment)
      .flatMap((appt) => paidPaymentsFor(appt).map((payment) => ({ payment })));

    // Total earnings: sum paid money only from confirmed/completed bookings
    const totalEarning = paidConfirmedPayments.reduce(
      (sum, { payment }) => sum + (Number(payment.amount) || 0),
      0
    );

    // This month earnings
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const thisMonth = paidConfirmedPayments.reduce((sum, { payment }) => {
      if (payment.paid_at && payment.paid_at >= monthStart) {
        return sum + (Number(payment.amount) || 0);
      }
      return sum;
    }, 0);

    // Pending: appointments that are CONFIRMED but no PAID payment yet
    let pending = 0;
    appts.forEach((appt) => {
      if (String(appt.status || "").toUpperCase() === "CONFIRMED") {
        const hasPaid = paidPaymentsFor(appt).length > 0;
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
    paidConfirmedPayments.forEach(({ payment }) => {
      if (payment.paid_at) {
        const d = new Date(payment.paid_at);
        const key = d.toLocaleString("en-US", { month: "short" });
        if (key in monthlyMap) monthlyMap[key] += Number(payment.amount) || 0;
      }
    });
    const monthlyEarnings = Object.entries(monthlyMap).map(([month, earnings]) => ({ month, earnings }));

    // Avg per consultation (paid only)
    const paidCount = appts.filter((a) => isEarningAppointment(a) && paidPaymentsFor(a).length > 0).length;
    const avgPerConsultation = paidCount > 0 ? Math.round(totalEarning / paidCount) : 0;

    // Unique patients
    const patients = Array.from(new Set(appts.map((a) => a.patient_id)));

    // Today's appointments
    const todayStr = now.toISOString().slice(0, 10);
    const todaysAppointments = appts.filter((appointment) => {
      if (!appointment.scheduled_at) return false;
      return new Date(appointment.scheduled_at).toISOString().slice(0, 10) === todayStr;
    });

    // Pending appointments (PENDING status)
    const pendingAppointments = appts.filter((a) => ["pending", "PENDING"].includes(a.status));

    // Recent confirmed/completed consultations
    const recentConsultations = appts
      .filter((a) => ["confirmed", "CONFIRMED", "completed", "COMPLETED"].includes(a.status))
      .slice(0, 5);

    const dashData = {
      earning: totalEarning,
      thisMonth,
      pending,
      avgPerConsultation,
      monthlyEarnings,
      appointments: appts.length,
      patients: patients.length,
      todayAppointments: todaysAppointments.length,
      todayAppointmentsList: todaysAppointments,
      pendingAppointmentsList: pendingAppointments,
      latestAppointments: recentConsultations,
      recentAppointments: recentConsultations,
    };

    return res.status(200).json({ success: true, dashData });
  } catch (error) {
    console.error("doctorDashboard error", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const buildPatientAiSummary = (appointment) => {
  const patient = appointment?.patient || {};
  const user = patient?.users || patient?.user || {};
  const patientName = user?.name || "Unknown Patient";
  const scheduledAt = appointment?.scheduled_at
    ? new Date(appointment.scheduled_at).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Not scheduled";
  const medicalHistory = patient?.medical_history || "No medical history recorded.";
  const allergies = patient?.allergies || "No known allergies recorded.";
  const demographics = [
    patient?.gender ? `Gender: ${patient.gender}` : null,
    patient?.date_of_birth ? `DOB: ${patient.date_of_birth}` : null,
    patient?.blood_group ? `Blood group: ${patient.blood_group}` : null,
  ].filter(Boolean);
  const notes = appointment?.patient_notes || appointment?.reason || appointment?.ai_triage_summary || "No appointment notes provided.";

  return `Pre-consultation AI summary for ${patientName}

Appointment:
- Scheduled for: ${scheduledAt}
- Status: ${appointment?.status || "pending"}
- Patient notes: ${notes}

Patient profile:
${demographics.length ? demographics.map((item) => `- ${item}`).join("\n") : "- No demographic details recorded."}

Medical history:
- ${medicalHistory}

Allergies:
- ${allergies}

Clinical focus:
- Review the listed medical history before starting the consultation.
- Confirm allergy details before prescribing medication.
- Ask whether symptoms, medications, or chronic conditions have changed since registration.`;
};

const doctorAiSummaries = async (req, res) => {
  try {
    const docId = await resolveDoctorProfileId(req);

    const { data: appointments, error } = await supabase
      .from("appointments")
      .select(`
        id,
        patient_id,
        scheduled_at,
        status,
        ai_triage_summary,
        patient:patients(
          id,
          medical_history,
          allergies,
          blood_group,
          gender,
          date_of_birth,
          users(name,email,phone,avatar_url)
        )
      `)
      .eq("doctor_id", docId)
      .in("status", ["pending", "confirmed", "PENDING", "CONFIRMED"])
      .order("scheduled_at", { ascending: false });

    if (error) throw error;

    const latestAppointmentByPatient = new Map();
    (appointments || []).forEach((appointment) => {
      const patient = appointment?.patient || {};
      const patientId = appointment.patient_id || patient.id;
      if (!patientId || latestAppointmentByPatient.has(patientId)) return;
      latestAppointmentByPatient.set(patientId, appointment);
    });

    const summaries = Array.from(latestAppointmentByPatient.values()).map((appointment) => {
      const patient = appointment?.patient || {};
      const user = patient?.users || patient?.user || {};
      return {
        id: appointment.id,
        appointmentId: appointment.id,
        patientId: appointment.patient_id || patient.id,
        patientName: user?.name || "Unknown Patient",
        patientEmail: user?.email || "",
        date: appointment.scheduled_at
          ? new Date(appointment.scheduled_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "",
        medicalHistory: patient?.medical_history || "",
        allergies: patient?.allergies || "",
        aiSummary: buildPatientAiSummary(appointment),
      };
    });

    return res.status(200).json({
      success: true,
      summaries,
    });
  } catch (error) {
    console.error("doctorAiSummaries error", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to load AI summaries",
    });
  }
};

const doctorPatientHistory = async (req, res) => {
  try {
    const docId = await resolveDoctorProfileId(req);
    const search = String(req.params.patientId || "").trim();

    if (!search) {
      return res.status(400).json({ success: false, message: "Patient search is required" });
    }

    let patient = null;

    const { data: byId, error: byIdError } = await supabase
      .from("patients")
      .select(`
        id,
        user_id,
        date_of_birth,
        blood_group,
        gender,
        medical_history,
        allergies,
        users(name,email,phone,avatar_url)
      `)
      .eq("id", search)
      .maybeSingle();

    if (byIdError) throw byIdError;
    patient = byId;

    if (!patient) {
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id,name,email,phone,avatar_url")
        .or(`email.ilike.%${search}%,name.ilike.%${search}%`)
        .limit(5);

      if (usersError) throw usersError;
      const userIds = (users || []).map((user) => user.id);

      if (userIds.length) {
        const { data: patients, error: patientsError } = await supabase
          .from("patients")
          .select(`
            id,
            user_id,
            date_of_birth,
            blood_group,
            gender,
            medical_history,
            allergies,
            users(name,email,phone,avatar_url)
          `)
          .in("user_id", userIds)
          .limit(1);

        if (patientsError) throw patientsError;
        patient = patients?.[0] || null;
      }
    }

    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    const { data: appointments, error: appointmentsError } = await supabase
      .from("appointments")
      .select(`
        id,
        scheduled_at,
        status,
        patient_id,
        doctor_id,
        consultation_summary:consultation_summaries(
          id,
          diagnosis,
          prescription,
          followup_date,
          doctor_notes,
          created_at
        )
      `)
      .eq("doctor_id", docId)
      .eq("patient_id", patient.id)
      .order("scheduled_at", { ascending: false });

    if (appointmentsError) throw appointmentsError;

    const getSummary = (appointment) =>
      Array.isArray(appointment.consultation_summary)
        ? appointment.consultation_summary[0]
        : appointment.consultation_summary;

    const consultations = (appointments || []).map((appointment) => {
      const summary = getSummary(appointment);
      return {
        id: appointment.id,
        date: appointment.scheduled_at,
        scheduled_at: appointment.scheduled_at,
        status: appointment.status,
        diagnosis: summary?.diagnosis || "",
        notes: summary?.doctor_notes || "",
      };
    });

    const prescriptions = (appointments || [])
      .map(getSummary)
      .filter((summary) => summary?.id && (summary.prescription || summary.diagnosis));

    const { data: labReports, error: labError } = await supabase
      .from("iot_readings")
      .select("id,test_type,reading_data,normal_range,recorded_at,created_at")
      .eq("patient_id", patient.id)
      .order("recorded_at", { ascending: false })
      .limit(10);

    if (labError) throw labError;

    const user = patient.users || {};
    const profile = {
      id: patient.id,
      name: user.name || user.email || "Patient",
      email: user.email || "",
      phone: user.phone || "",
      date_of_birth: patient.date_of_birth,
      blood_group: patient.blood_group,
      gender: patient.gender,
      medical_history: patient.medical_history,
      allergies: patient.allergies,
    };

    return res.status(200).json({
      success: true,
      data: {
        profile,
        consultations,
        prescriptions,
        labReports: labReports || [],
      },
    });
  } catch (error) {
    console.error("doctorPatientHistory error", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to load patient history",
    });
  }
};

const doctorPatientIot = async (req, res) => {
  try {
    const docId = await resolveDoctorProfileId(req);
    const patientId = String(req.params.patientId || "").trim();

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "Patient id is required",
      });
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select("id")
      .eq("doctor_id", docId)
      .eq("patient_id", patientId)
      .limit(1)
      .maybeSingle();

    if (appointmentError) throw appointmentError;

    if (!appointment) {
      return res.status(403).json({
        success: false,
        message: "No appointment found for this patient",
      });
    }

    const { data, error } = await supabase
      .from("iot_readings")
      .select("id,test_type,reading_data,normal_range,recorded_at,created_at")
      .eq("patient_id", patientId)
      .order("recorded_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data: (data || []).map(normalizeIotReading),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
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
  doctorAiSummaries,
  doctorPatientHistory,
  doctorPatientIot,
  doctorProfile,
  updateDoctorProfile,
  getHealthQueries,
  getHealthQueryDetails,
  createHealthQueryResponse,
};
