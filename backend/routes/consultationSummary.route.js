import express from "express";
import supabase from "../config/supabase.js";
import { authenticate } from "../middlewares/auth.js";

const router = express.Router();

async function getPatientIdFromUser(userId) {
  const { data, error } = await supabase
    .from("patients")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data?.id;
}

async function getDoctorProfileIdFromUser(userId) {
  const { data, error } = await supabase
    .from("doctor_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data?.id;
}

function cleanOptionalText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeFollowupDate(value) {
  const cleaned = cleanOptionalText(value);
  if (!cleaned) return null;

  const dateKey = cleaned.slice(0, 10);
  const parsed = new Date(`${dateKey}T00:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey) || Number.isNaN(parsed.getTime())) {
    throw { status: 400, message: "Follow-up date must be a valid date" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (parsed < today) {
    throw { status: 400, message: "Follow-up date cannot be in the past" };
  }

  return dateKey;
}

// Doctor creates/updates prescription after consultation
router.post("/", authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    const doctorId = await getDoctorProfileIdFromUser(userId);

    if (!doctorId) {
      return res.status(403).json({ success: false, message: "Doctor profile not found" });
    }

    const {
      appointmentId,
      diagnosis,
      prescription,
      followupDate,
      doctorNotes,
      complete,
    } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ success: false, message: "appointmentId is required" });
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", appointmentId)
      .maybeSingle();

    if (appointmentError) throw appointmentError;

    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    if (appointment.doctor_id !== doctorId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const normalizedDiagnosis = cleanOptionalText(diagnosis);
    const normalizedPrescription = cleanOptionalText(prescription);
    const normalizedDoctorNotes = cleanOptionalText(doctorNotes);
    const normalizedFollowupDate = normalizeFollowupDate(followupDate);

    if (!normalizedDiagnosis && !normalizedPrescription && !normalizedDoctorNotes && !normalizedFollowupDate) {
      return res.status(400).json({
        success: false,
        message: "Add notes, diagnosis, prescription, tests, or a valid follow-up date before saving.",
      });
    }

    const payload = {
      appointment_id: appointmentId,
      diagnosis: normalizedDiagnosis,
      prescription: normalizedPrescription,
      followup_date: normalizedFollowupDate,
      doctor_notes: normalizedDoctorNotes,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("consultation_summaries")
      .upsert(payload, { onConflict: "appointment_id" })
      .select()
      .single();

    if (error) throw error;

    if (complete === true || complete === "true") {
      await supabase
        .from("appointments")
        .update({ status: "COMPLETED" })
        .eq("id", appointmentId);
    }

    return res.status(200).json({
      success: true,
      message: complete === true || complete === "true"
        ? "Consultation completed successfully"
        : "Consultation details saved successfully",
      summary: data,
    });
  } catch (error) {
    console.error("Save consultation summary error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to save prescription",
    });
  }
});

// Patient gets own prescriptions
router.get("/my-prescriptions", authenticate, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    const patientId = await getPatientIdFromUser(userId);

    if (!patientId) {
      return res.status(404).json({ success: false, message: "Patient profile not found" });
    }

    const { data, error } = await supabase
      .from("consultation_summaries")
      .select(`
        *,
        appointment:appointments(
          id,
          scheduled_at,
          status,
          patient_id,
          doctor:doctor_profiles(
            id,
            specialty,
            users(name,email,avatar_url)
          )
        )
      `)
      .eq("appointment.patient_id", patientId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const prescriptions = (data || []).filter((item) => item.appointment);

    return res.status(200).json({
      success: true,
      prescriptions,
    });
  } catch (error) {
    console.error("Get prescriptions error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load prescriptions",
    });
  }
});

export default router;
