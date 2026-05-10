import { useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
// ConfirmModal not used for the new appointment flow
import "./Appointments.css";

const Appointments = () => {
  const { backendUrl, token } = useContext(AppContext);

  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);

  const formatDateString = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTimeString = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getUserAppointments = useCallback(async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/appointments?status=confirmed", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAppointments(data.reverse());
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to fetch appointments"
      );
    }
  }, [backendUrl, token]);

  const handlePayClick = (appointmentId) => {
    navigate(`/payment/${appointmentId}`);
  };

  const handleJoinClick = (meetingLink) => {
    if (meetingLink) {
      window.open(meetingLink, "_blank");
    } else {
      toast.error("Meeting link not available");
    }
  };

  const getPaymentState = (appointment) => {
    const payments = Array.isArray(appointment?.payment) ? appointment.payment : [];
    const statuses = payments
      .map((p) => String(p?.status || "").toUpperCase())
      .filter(Boolean);

    if (statuses.includes("PAID")) return "PAID";
    if (statuses.includes("INITIATED")) return "INITIATED";
    if (statuses.includes("FAILED")) return "FAILED";
    return "UNPAID";
  };

  const buildFallbackMeetingLink = (appointmentId) => {
    if (!appointmentId) return "";
    const roomName = String(appointmentId).replace(/[^a-zA-Z0-9-]/g, "-");
    return `https://meet.jit.si/arogyanidhi-${roomName}`;
  };

  const getMeetingLink = (appointment) =>
    appointment.meeting_link ||
    appointment.meetingLink ||
    buildFallbackMeetingLink(appointment.id);

  useEffect(() => {
    if (token) {
      getUserAppointments();
    }
  }, [token, getUserAppointments]);

  return (
    <div className="myappt-page">
      <div className="myappt-container">
        <header className="myappt-header">
          <h1 className="myappt-title">My Appointments</h1>
          <p className="myappt-subtitle">View your confirmed appointments</p>
        </header>

        {appointments.length === 0 ? (
          <div className="myappt-empty">
            <p className="myappt-empty-title">No confirmed appointments found</p>
            <p className="myappt-empty-subtitle">Book an appointment to get started</p>
          </div>
        ) : (
          <div className="myappt-list">
            {appointments.map((appointment, index) => {
              const doctorAvatar =
                appointment.doctor?.user?.avatar_url ||
                appointment.doctor?.avatar_url ||
                appointment.doctor?.doctor_profile?.avatar_url ||
                "https://via.placeholder.com/96";

              const doctorName =
                appointment.doctor?.user?.name ||
                appointment.doctor?.name ||
                appointment.doctor?.full_name ||
                appointment.doctor?.doctor_profile?.name ||
                appointment.doctor?.doctor_profile?.[0]?.name ||
                "Doctor";

              const specialty =
                appointment.doctor?.specialty ||
                appointment.doctor?.doctor_profile?.specialty ||
                appointment.doctor?.doctor_profile?.[0]?.specialty ||
                "General physician";

              const meetingLink = getMeetingLink(appointment);
              const meetingAvailable = Boolean(meetingLink);
              const paymentState = getPaymentState(appointment);

              const dateLabel = formatDateString(
                appointment.scheduled_at || appointment.scheduledAt || appointment.appointment_date
              );
              const timeLabel = formatTimeString(
                appointment.scheduled_at || appointment.scheduledAt || appointment.appointment_time
              );

              return (
                <article className="myappt-card" key={appointment.id || index}>
                  <div className="myappt-card-body">
                    <div className="myappt-avatar" aria-hidden>
                      <img src={doctorAvatar} alt={doctorName} loading="lazy" />
                    </div>

                    <div className="myappt-info">
                      <div className="myappt-top">
                        <div className="myappt-doctor">
                          <h3 className="myappt-doctor-name">{doctorName}</h3>
                          <p className="myappt-specialty">{specialty}</p>
                        </div>
                        <span className="myappt-badge myappt-badge--confirmed">Confirmed</span>
                      </div>

                      <dl className="myappt-meta" aria-label="Appointment details">
                        <div className="myappt-meta-item">
                          <dt>Date</dt>
                          <dd>{dateLabel || "—"}</dd>
                        </div>
                        <div className="myappt-meta-item">
                          <dt>Time</dt>
                          <dd>{timeLabel || "—"}</dd>
                        </div>
                        <div className="myappt-meta-item">
                          <dt>Duration</dt>
                          <dd>{appointment.duration_minutes || 30} minutes</dd>
                        </div>
                        {appointment.reason ? (
                          <div className="myappt-meta-item myappt-meta-item--wide">
                            <dt>Reason</dt>
                            <dd>{appointment.reason}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>

                    <div className="myappt-side" aria-label="Appointment status">
                      <div className="myappt-pill-group">
                        {paymentState === "PAID" ? (
                          <span className="myappt-pill myappt-pill--success">Payment Completed</span>
                        ) : paymentState === "INITIATED" ? (
                          <span className="myappt-pill myappt-pill--warning">Payment Initiated</span>
                        ) : paymentState === "FAILED" ? (
                          <span className="myappt-pill myappt-pill--danger">Payment Failed</span>
                        ) : (
                          <span className="myappt-pill myappt-pill--muted">Payment Pending</span>
                        )}
                      </div>

                      <div className="myappt-actions">
                        <button
                          type="button"
                          onClick={() => handleJoinClick(meetingLink)}
                          className="myappt-btn myappt-btn--primary"
                          disabled={!meetingAvailable}
                        >
                          {meetingAvailable ? "Join Meeting" : "Meeting Unavailable"}
                        </button>

                        {paymentState !== "PAID" ? (
                          <button
                            type="button"
                            onClick={() => handlePayClick(appointment.id)}
                            className="myappt-btn myappt-btn--outline"
                          >
                            Pay Now
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Appointments;
