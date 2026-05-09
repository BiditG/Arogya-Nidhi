import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
// ConfirmModal not used for the new appointment flow

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

  const getUserAppointments = async () => {
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
  };

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

  useEffect(() => {
    if (token) {
      getUserAppointments();
    }
  }, [token]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Appointments</h1>
        <p className="text-gray-600 mt-1">View your confirmed appointments</p>
      </div>

      <div className="space-y-4">
        {appointments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No confirmed appointments found</p>
            <p className="text-gray-400 mt-2">Book an appointment to get started</p>
          </div>
        ) : (
          appointments.map((appointment, index) => {
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
              "Doctor Name";

            const specialty =
              appointment.doctor?.specialty ||
              appointment.doctor?.doctor_profile?.specialty ||
              appointment.doctor?.doctor_profile?.[0]?.specialty ||
              "General Physician";

            const meetingAvailable = Boolean(appointment.meeting_link);

            return (
              <div
                className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-200"
                key={appointment.id || index}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="flex-shrink-0">
                    <img
                      className="w-24 h-24 rounded-full object-cover border-2 border-gray-100"
                      src={doctorAvatar}
                      alt={doctorName}
                    />
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800">
                          {doctorName}
                        </h3>
                        <p className="text-gray-600">{specialty}</p>
                      </div>
                      <div className="mt-2 sm:mt-0">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-green-800">
                          Confirmed
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Date:</span>{" "}
                        {formatDateString(appointment.scheduled_at || appointment.appointment_date)}
                      </div>
                      <div>
                        <span className="font-medium">Time:</span>{" "}
                        {formatTimeString(appointment.scheduled_at || appointment.appointment_time)}
                      </div>
                      <div>
                        <span className="font-medium">Duration:</span>{" "}
                        {appointment.duration_minutes || 30} minutes
                      </div>
                      {appointment.reason && (
                        <div>
                          <span className="font-medium">Reason:</span>{" "}
                          {appointment.reason}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 mt-4 md:mt-0">
                    <button
                      onClick={() => handleJoinClick(appointment.meeting_link)}
                      className={`px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors duration-200 font-medium ${!meetingAvailable ? 'opacity-60 cursor-not-allowed' : ''}`}
                      disabled={!meetingAvailable}
                    >
                      {meetingAvailable ? 'Join Meeting' : 'Meeting Pending'}
                    </button>

                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-full font-medium">
                      Payment Completed
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Appointments;
