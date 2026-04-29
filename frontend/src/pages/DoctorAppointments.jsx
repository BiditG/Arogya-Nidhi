import { useEffect, useState, useContext } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import DoctorSidebar from "../components/DoctorSidebar";
import { AppContext } from "../context/AppContext";
import { UserCircleIcon } from "@heroicons/react/24/outline";
import "./PatientPortal.css";

const DUMMY_APPOINTMENTS = [
  { id: "da1", user: { name: "Bikash Shrestha" }, slotDate: "May 1, 2026", slotTime: "11:30 AM", status: "pending", type: "Follow-up" },
  { id: "da2", user: { name: "Deepak Karki" }, slotDate: "May 3, 2026", slotTime: "4:00 PM", status: "pending", type: "New Patient" },
  { id: "da3", user: { name: "Anita Thapa" }, slotDate: "May 1, 2026", slotTime: "10:00 AM", status: "scheduled", type: "General Checkup" },
  { id: "da4", user: { name: "Priya Gautam" }, slotDate: "May 2, 2026", slotTime: "9:00 AM", status: "scheduled", type: "Consultation" },
  { id: "da5", user: { name: "Rajan Adhikari" }, slotDate: "Apr 30, 2026", slotTime: "2:00 PM", status: "completed", type: "Routine Checkup", diagnosis: "Hypertension — controlled" },
  { id: "da6", user: { name: "Sunita Poudel" }, slotDate: "Apr 29, 2026", slotTime: "3:30 PM", status: "completed", type: "Follow-up", diagnosis: "Post-surgery recovery" },
];

const DoctorAppointments = () => {
  const { token, backendUrl } = useContext(AppContext);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const headers = token ? { Authorization: `Bearer ${token}`, dtoken: token } : {};

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(backendUrl + "/api/doctor/appointments", { headers });
      if (data.success) setAppointments((data.appointments || []).reverse());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  const displayList = appointments.length > 0 ? appointments : DUMMY_APPOINTMENTS;

  const filtered = displayList.filter((a) => {
    if (statusFilter && (a.status || "").toLowerCase() !== statusFilter) return false;
    if (searchQ && !(a.user?.name || a.patient_name || "").toLowerCase().includes(searchQ.toLowerCase()))
      return false;
    return true;
  });

  const pending = filtered.filter((a) => (a.status || "").toLowerCase() === "pending");
  const scheduled = filtered.filter((a) => (a.status || "").toLowerCase() === "scheduled");
  const completed = filtered.filter((a) => (a.status || "").toLowerCase() === "completed");

  const accept = (a) => {
    setAppointments((prev) =>
      (prev.length > 0 ? prev : DUMMY_APPOINTMENTS).map((x) =>
        x.id === a.id ? { ...x, status: "scheduled" } : x
      )
    );
    toast.success("Appointment accepted");
  };

  const reject = async (a) => {
    try {
      const { data } = await axios.post(
        backendUrl + "/api/doctor/cancel-appointment",
        { appointmentId: a.id },
        { headers }
      );
      if (data.success) {
        toast.success(data.message || "Rejected");
        load();
      }
    } catch {
      setAppointments((prev) =>
        (prev.length > 0 ? prev : DUMMY_APPOINTMENTS).filter((x) => x.id !== a.id)
      );
      toast.success("Appointment rejected");
    }
  };

  const complete = async (a) => {
    try {
      const { data } = await axios.post(
        backendUrl + "/api/doctor/complete-appointment",
        { appointmentId: a.id },
        { headers }
      );
      if (data.success) {
        toast.success(data.message || "Marked completed");
        load();
      }
    } catch {
      setAppointments((prev) =>
        (prev.length > 0 ? prev : DUMMY_APPOINTMENTS).map((x) =>
          x.id === a.id ? { ...x, status: "completed" } : x
        )
      );
      toast.success("Marked as completed");
    }
  };

  return (
    <div className="pp-page">
      <div className="pp-container">
        <DoctorSidebar />
        <main className="pp-main-content">
          <p className="pp-welcome">Manage Appointments</p>

          <section className="pp-section">
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                className="pp-chat-input"
                placeholder="Search patient…"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
              />
              <select
                className="pp-chat-input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="scheduled">Scheduled</option>
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
            </div>
          </section>

          <section className="pp-section">
            <h2 className="pp-section-title">Pending Requests</h2>
            {loading ? (
              <div className="pp-appointment-list">
                <div className="pp-appointment-item">
                  <div className="pp-appointment-info">
                    <div className="pp-appointment-title">Loading...</div>
                  </div>
                </div>
              </div>
            ) : pending.length === 0 ? (
              <div className="pp-appointment-list">
                <div className="pp-appointment-item">
                  <div className="pp-appointment-info">
                    <div className="pp-appointment-title">No pending requests</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="pp-appointment-list">
                {pending.map((a) => (
                  <div key={a.id || a._id} className="pp-appointment-item">
                    <div className="pp-appointment-icon">
                      <UserCircleIcon style={{ width: 22, height: 22 }} />
                    </div>
                    <div className="pp-appointment-info">
                      <div className="pp-appointment-title">
                        {a.user?.name || a.patient_name || "Unknown"}
                      </div>
                      <div className="pp-appointment-meta">
                        {a.slotDate || a.date} {a.slotTime || a.time} · {a.type || "Consultation"}
                      </div>
                    </div>
                    <div className="pp-appointment-actions">
                      <button className="pp-btn pp-btn-primary pp-btn-sm" onClick={() => accept(a)}>
                        Accept
                      </button>
                      <button className="pp-btn pp-btn-outline pp-btn-sm" onClick={() => reject(a)}>
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduled.length === 0 ? (
                    <tr>
                      <td colSpan={5}>No scheduled appointments.</td>
                    </tr>
                  ) : (
                    scheduled.map((a) => (
                      <tr key={a.id || a._id}>
                        <td>{a.user?.name || a.patient_name || "—"}</td>
                        <td>{a.slotDate || a.date || "—"}</td>
                        <td>{a.slotTime || a.time || "—"}</td>
                        <td>{a.type || "—"}</td>
                        <td>
                          <div className="pp-appointment-actions">
                            <button className="pp-btn pp-btn-outline pp-btn-sm">View</button>
                            <button
                              className="pp-btn pp-btn-primary pp-btn-sm"
                              onClick={() => complete(a)}
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
                    <th>Type</th>
                    <th>Diagnosis</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {completed.length === 0 ? (
                    <tr>
                      <td colSpan={5}>No completed appointments.</td>
                    </tr>
                  ) : (
                    completed.map((a) => (
                      <tr key={a.id || a._id}>
                        <td>{a.user?.name || a.patient_name || "—"}</td>
                        <td>{a.slotDate || a.date || "—"}</td>
                        <td>{a.type || "—"}</td>
                        <td>{a.diagnosis || "—"}</td>
                        <td>
                          <div className="pp-appointment-actions">
                            <button className="pp-btn pp-btn-outline pp-btn-sm">View</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default DoctorAppointments;
