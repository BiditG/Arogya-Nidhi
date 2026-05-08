import { useEffect, useState, useContext, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import DoctorSidebar from "../components/DoctorSidebar";
import { AppContext } from "../context/AppContext";
import "./PatientPortal.css";

const DoctorAppointments = () => {
  const { token, backendUrl } = useContext(AppContext);

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const headers = token
    ? {
        Authorization: `Bearer ${token}`,
        dtoken: token,
      }
    : {};

  const normalizeStatus = (status) => String(status || "").toLowerCase();

  const getPatientName = (appointment) => {
    return (
      appointment?.patient?.users?.name ||
      appointment?.patient?.user?.name ||
      appointment?.patient_name ||
      "Unknown Patient"
    );
  };

  const getAppointmentDate = (appointment) => {
    if (!appointment?.scheduled_at) return "—";

    return new Date(appointment.scheduled_at).toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getAppointmentTime = (appointment) => {
    if (!appointment?.scheduled_at) return "—";

    return new Date(appointment.scheduled_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getAppointmentType = (appointment) => {
    return appointment?.type || appointment?.reason || appointment?.patient_notes || "Consultation";
  };

  const loadAppointments = useCallback(async () => {
    if (!token) return;

    setLoading(true);

    try {
      const { data } = await axios.get(`${backendUrl}/api/doctor/appointments`, {
        headers,
      });

      if (data?.success) {
        setAppointments(data.appointments || []);
      } else {
        setAppointments([]);
        toast.error(data?.message || "Failed to load appointments");
      }
    } catch (err) {
      console.error("Load appointments error:", err);
      setAppointments([]);
      toast.error(err?.response?.data?.message || "Failed to load appointments");
    } finally {
      setLoading(false);
    }
  }, [token, backendUrl]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const filtered = appointments.filter((appointment) => {
    const appointmentStatus = normalizeStatus(appointment.status);
    const patientName = getPatientName(appointment).toLowerCase();

    if (statusFilter && appointmentStatus !== statusFilter) return false;
    if (searchQ && !patientName.includes(searchQ.toLowerCase())) return false;

    return true;
  });

  const scheduled = filtered.filter((appointment) =>
    ["confirmed", "scheduled"].includes(normalizeStatus(appointment.status))
  );

  const completed = filtered.filter(
    (appointment) => normalizeStatus(appointment.status) === "completed"
  );

  const cancelled = filtered.filter(
    (appointment) => normalizeStatus(appointment.status) === "cancelled"
  );

  const complete = async (appointment) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/doctor/complete-appointment`,
        { appointmentId: appointment.id },
        { headers }
      );

      if (data?.success) {
        toast.success(data.message || "Appointment marked completed");
        loadAppointments();
      } else {
        toast.error(data?.message || "Failed to complete appointment");
      }
    } catch (err) {
      console.error("Complete appointment error:", err);
      toast.error(err?.response?.data?.message || "Failed to complete appointment");
    }
  };

  return (
    <div className="pp-page">
      <div className="pp-container">
        <DoctorSidebar />

        <main className="pp-main-content">
          <p className="pp-welcome">Manage Appointments</p>

          <section className="pp-section">
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                className="pp-chat-input"
                style={{ minWidth: 180 }}
                placeholder="Search patient…"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
              />

              <select
                className="pp-chat-input"
                style={{ minWidth: 180 }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="confirmed">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              {statusFilter && (
                <button
                  className="pp-btn pp-btn-outline pp-btn-sm"
                  onClick={() => setStatusFilter("")}
                >
                  Clear
                </button>
              )}

              <button
                className="pp-btn pp-btn-outline pp-btn-sm"
                onClick={loadAppointments}
              >
                Refresh
              </button>
            </div>
          </section>

          <section className="pp-section">
            <h2 className="pp-section-title">Scheduled Appointments</h2>

            <div className="pp-table-container">
              <table className="pp-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {scheduled.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No scheduled appointments.</td>
                    </tr>
                  ) : (
                    scheduled.map((appointment) => (
                      <tr key={appointment.id || appointment._id}>
                        <td>{getPatientName(appointment)}</td>
                        <td>{getAppointmentDate(appointment)}</td>
                        <td>{getAppointmentTime(appointment)}</td>
                        <td>{getAppointmentType(appointment)}</td>
                        <td>{appointment.status}</td>
                        <td>
                          <div className="pp-appointment-actions">
                            <button className="pp-btn pp-btn-outline pp-btn-sm">
                              View
                            </button>

                            <button
                              className="pp-btn pp-btn-primary pp-btn-sm"
                              onClick={() => complete(appointment)}
                            >
                              Complete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="pp-section">
            <h2 className="pp-section-title">Completed</h2>

            <div className="pp-table-container">
              <table className="pp-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Diagnosis</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {completed.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No completed appointments.</td>
                    </tr>
                  ) : (
                    completed.map((appointment) => (
                      <tr key={appointment.id || appointment._id}>
                        <td>{getPatientName(appointment)}</td>
                        <td>{getAppointmentDate(appointment)}</td>
                        <td>{getAppointmentTime(appointment)}</td>
                        <td>{getAppointmentType(appointment)}</td>
                        <td>{appointment.diagnosis || "—"}</td>
                        <td>
                          <div className="pp-appointment-actions">
                            <button className="pp-btn pp-btn-outline pp-btn-sm">
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {cancelled.length > 0 && (
            <section className="pp-section">
              <h2 className="pp-section-title">Cancelled</h2>

              <div className="pp-table-container">
                <table className="pp-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {cancelled.map((appointment) => (
                      <tr key={appointment.id || appointment._id}>
                        <td>{getPatientName(appointment)}</td>
                        <td>{getAppointmentDate(appointment)}</td>
                        <td>{getAppointmentTime(appointment)}</td>
                        <td>{getAppointmentType(appointment)}</td>
                        <td>{appointment.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

export default DoctorAppointments;
