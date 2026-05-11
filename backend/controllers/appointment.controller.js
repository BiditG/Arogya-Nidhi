
import {
  createAppointment as createAppointmentService,
  getAppointments as getAppointmentsService,
  getAppointmentById as getAppointmentByIdService,
  updateAppointment as updateAppointmentService,
} from '../services/appointment.service.js';

import patientRepo from '../repository/patient.repository.js';
import authRepo from '../repository/auth.repository.js';
import supabase from '../config/supabase.js';
import { createNotificationSafe } from '../services/notification.service.js';

export const createAppointment = async (req, res) => {
  try {
    const appointmentDate = req.body.appointment_date || req.body.appointmentDate;
    const appointmentTime = req.body.appointment_time || req.body.appointmentTime;
    if (!appointmentDate || !appointmentTime) {
      return res.status(400).json({ error: "appointment_date and appointment_time are required" });
    }
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Resolve patient.id (appointments.patient_id references patients.id)
    let patient = await patientRepo.findPatientByUserId(userId);
    if (!patient) {
      // create a minimal patient record linked to this user
      const createdPatient = await authRepo.createPatient({ user_id: userId });
      patient = createdPatient;
    }
    const patientId = patient?.id;
    if (!patientId) return res.status(500).json({ error: 'Failed to resolve patient profile' });

    // Combine date and time into single timestamptz field `scheduled_at` expected by DB
    // appointmentDate expected as YYYY-MM-DD and appointmentTime as HH:MM
    let scheduledAt;
    try {
      const dt = new Date(`${appointmentDate}T${appointmentTime}`);
      scheduledAt = dt.toISOString();
    } catch (e) {
      return res.status(400).json({ error: "Invalid date/time" });
    }

    // Only include columns that exist in the appointments table
    const payload = {
      patient_id: patientId,
      doctor_id: req.body.doctor_id,
      scheduled_at: scheduledAt,
      duration_minutes: req.body.duration_minutes || 30,
      status: req.body.status || "PENDING",
    };

    // Resolve doctor_id: if not found in doctor_profiles, assume it's user_id and find the profile
    let doctorId = req.body.doctor_id;
    const { data: doctorProfile, error: doctorError } = await supabase
      .from('doctor_profiles')
      .select('id,user_id,specialty,is_verified,is_available')
      .eq('id', doctorId)
      .maybeSingle();
    if (doctorError) throw doctorError;
    let resolvedDoctorProfile = doctorProfile;
    if (!doctorProfile) {
      // Assume doctorId is user_id, find the profile
      const { data: profileByUser, error: userError } = await supabase
        .from('doctor_profiles')
        .select('id,user_id,specialty,is_verified,is_available')
        .eq('user_id', doctorId)
        .maybeSingle();
      if (userError) throw userError;
      if (profileByUser) {
        doctorId = profileByUser.id;
        resolvedDoctorProfile = profileByUser;
        if (!profileByUser.is_verified || !profileByUser.is_available) {
          return res.status(400).json({ error: 'Doctor is not available for booking' });
        }
      } else {
        return res.status(400).json({ error: 'Invalid doctor_id' });
      }
    } else if (!doctorProfile.is_verified || !doctorProfile.is_available) {
      return res.status(400).json({ error: 'Doctor is not available for booking' });
    }
    payload.doctor_id = doctorId;

    const appointment = await createAppointmentService(payload);
    await Promise.all([
      createNotificationSafe({
        userId,
        title: 'Appointment booked',
        message: 'Your appointment has been booked.',
        type: 'appointment_booked',
        metadata: {
          appointmentId: appointment?.id,
          doctorId,
          scheduledAt,
          status: payload.status,
        },
      }),
      createNotificationSafe({
        userId: resolvedDoctorProfile?.user_id,
        title: 'New appointment',
        message: 'A patient booked an appointment with you.',
        type: 'appointment_booked',
        metadata: {
          appointmentId: appointment?.id,
          patientId,
          scheduledAt,
          status: payload.status,
        },
      }),
    ]);
    res.status(201).json(appointment);
  } catch (error) {
    console.error('createAppointment error:', error);
    // Return some error details to help debugging the 400 from frontend
    const message = error?.message || error?.msg || error?.details || String(error);
    res.status(400).json({ error: message, details: error });
  }
};

export const getAppointments = async (req, res) => {
  try {
    const filters = {};

    const userId = req.user?.userId || req.user?.id || req.user?.sub || null;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.query?.status) {
      filters.status = req.query.status;
    }

    if (req.user?.role === 'doctor') {
      const { data: doctorProfile, error } = await supabase
        .from('doctor_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (error || !doctorProfile) {
        return res.status(404).json({ error: 'Doctor profile not found' });
      }

      filters.doctor_id = doctorProfile.id;
    } else {
      const patient = await patientRepo.findPatientByUserId(userId);
      if (!patient) {
        return res.status(404).json({ error: 'Patient profile not found' });
      }
      filters.patient_id = patient.id;
    }

    const appointments = await getAppointmentsService(filters);
    res.status(200).json(appointments);

  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
export const getAppointmentById = async (req, res) => {
  try {
    const appointment = await getAppointmentByIdService(req.params.id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    res.status(200).json(appointment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateAppointment = async (req, res) => {
  try {
    const appointment = await updateAppointmentService(req.params.id, req.body);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    res.status(200).json(appointment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
