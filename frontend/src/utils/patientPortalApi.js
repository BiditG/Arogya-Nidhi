import axios from "axios";

const authConfig = (token, options = {}) => ({
  ...options,
  headers: {
    Authorization: `Bearer ${token}`,
    ...(options.headers || {}),
  },
});

const unwrap = (response) => response?.data?.data;

export const patientPortalApi = {
  getOverview: (backendUrl, token) =>
    axios
      .get(`${backendUrl}/api/patient/dashboard`, authConfig(token))
      .then(unwrap),

  getQuickActions: (backendUrl, token) =>
    axios
      .get(`${backendUrl}/api/patient/dashboard/quick-actions`, authConfig(token))
      .then(unwrap),

  getAppointments: (backendUrl, token, params = {}) =>
    axios
      .get(
        `${backendUrl}/api/patient/appointments`,
        authConfig(token, { params })
      )
      .then(unwrap),

  getUpcomingAppointments: (backendUrl, token, params = {}) =>
    axios
      .get(
        `${backendUrl}/api/patient/appointments/upcoming`,
        authConfig(token, { params })
      )
      .then(unwrap),

  getAppointmentById: (backendUrl, token, id) =>
    axios
      .get(`${backendUrl}/api/patient/appointments/${id}`, authConfig(token))
      .then(unwrap),

  bookAppointment: (backendUrl, token, payload) =>
    axios
      .post(`${backendUrl}/api/patient/appointments`, payload, authConfig(token))
      .then(unwrap),

  cancelAppointment: (backendUrl, token, id) =>
    axios
      .patch(
        `${backendUrl}/api/patient/appointments/${id}/cancel`,
        {},
        authConfig(token)
      )
      .then(unwrap),

  rescheduleAppointment: (backendUrl, token, id, payload) =>
    axios
      .patch(
        `${backendUrl}/api/patient/appointments/${id}/reschedule`,
        payload,
        authConfig(token)
      )
      .then(unwrap),

  getMedicalHistory: (backendUrl, token, params = {}) =>
    axios
      .get(
        `${backendUrl}/api/patient/medical-history`,
        authConfig(token, { params })
      )
      .then(unwrap),

  getRecentMedicalHistory: (backendUrl, token) =>
    axios
      .get(
        `${backendUrl}/api/patient/medical-history/recent`,
        authConfig(token)
      )
      .then(unwrap),

  getIotReadings: (backendUrl, token, params = {}) =>
    axios
      .get(`${backendUrl}/api/patient/iot`, authConfig(token, { params }))
      .then(unwrap),

  getRecentIotReadings: (backendUrl, token) =>
    axios
      .get(`${backendUrl}/api/patient/iot/recent`, authConfig(token))
      .then(unwrap),

  getIotReadingById: (backendUrl, token, id) =>
    axios
      .get(`${backendUrl}/api/patient/iot/${id}`, authConfig(token))
      .then(unwrap),

  submitIotTest: (backendUrl, token, payload) =>
    axios
      .post(`${backendUrl}/api/patient/iot`, payload, authConfig(token))
      .then(unwrap),

  getQueries: (backendUrl, token, params = {}) =>
    axios
      .get(`${backendUrl}/api/patient/queries`, authConfig(token, { params }))
      .then(unwrap),

  getQueryById: (backendUrl, token, id) =>
    axios
      .get(`${backendUrl}/api/patient/queries/${id}`, authConfig(token))
      .then(unwrap),

  createQuery: (backendUrl, token, payload) =>
    axios
      .post(`${backendUrl}/api/patient/queries`, payload, authConfig(token))
      .then(unwrap),

  updateQuery: (backendUrl, token, id, payload) =>
    axios
      .patch(`${backendUrl}/api/patient/queries/${id}`, payload, authConfig(token))
      .then(unwrap),

  closeQuery: (backendUrl, token, id) =>
    axios
      .patch(`${backendUrl}/api/patient/queries/${id}/close`, {}, authConfig(token))
      .then(unwrap),

  deleteQuery: (backendUrl, token, id) =>
    axios
      .delete(`${backendUrl}/api/patient/queries/${id}`, authConfig(token))
      .then(unwrap),

  getDoctors: (backendUrl, token, params = {}) =>
    axios
      .get(`${backendUrl}/api/patient/doctors`, authConfig(token, { params }))
      .then(unwrap),

  getDoctorById: (backendUrl, token, id) =>
    axios
      .get(`${backendUrl}/api/patient/doctors/${id}`, authConfig(token))
      .then(unwrap),
};
