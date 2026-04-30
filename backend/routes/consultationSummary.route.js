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

    const payload = {
      appointment_id: appointmentId,
      diagnosis: diagnosis || null,
      prescription: prescription || null,
      followup_date: followupDate || null,
      doctor_notes: doctorNotes || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("consultation_summaries")
      .upsert(payload, { onConflict: "appointment_id" })
      .select()
      .single();

    if (error) throw error;

    await supabase
      .from("appointments")
      .update({ status: "COMPLETED" })
      .eq("id", appointmentId);

    return res.status(200).json({
      success: true,
      message: "Prescription saved successfully",
      summary: data,
    });
  } catch (error) {
    console.error("Save consultation summary error:", error);
    return res.status(500).json({
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