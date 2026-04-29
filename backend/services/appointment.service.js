
import * as appointmentRepository from "../repository/appointment.repository.js";

export const createAppointment = async (appointmentData) => {
  return await appointmentRepository.createAppointment(appointmentData);
};

export const getAppointments = async (filters) => {
  return await appointmentRepository.getAppointments(filters);
};

export const getAppointmentById = async (id) => {
  return await appointmentRepository.getAppointmentById(id);
};

export const updateAppointment = async (id, appointmentData) => {
  return await appointmentRepository.updateAppointment(id, appointmentData);
};
