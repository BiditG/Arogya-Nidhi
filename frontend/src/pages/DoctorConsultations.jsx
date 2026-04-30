import { useEffect, useState, useContext, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import DoctorSidebar from "../components/DoctorSidebar";
import { AppContext } from "../context/AppContext";
import "./PatientPortal.css";

const FORM_FIELDS = [
  { label: "Chief Complaint", key: "chiefComplaint", rows: 2 },
  { label: "Symptoms", key: "symptoms", rows: 3 },
  { label: "Diagnosis", key: "diagnosis", rows: 2 },
  { label: "Prescription", key: "prescription", rows: 4 },
  { label: "Recommended Tests", key: "recommendedTests", rows: 2 },
  { label: "Follow-up Date", key: "followUp", rows: 1 },
];

const DoctorConsultations = () => {
  const { token, backendUrl } = useContext(AppContext);

  const [appointments, setAppointments] = useState([]);
  const [active, setActive] = useState(null);
  const [aiSummary, setAiSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQ, setSearchQ] = useState("");

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
      appointment?.user?.name ||
      appointment?.patient_name ||
      "Unknown Patient"
    );
  };

  const getPatientEmail = (appointment) => {
    return (
      appointment?.patient?.users?.email ||
      appointment?.patient?.user?.email ||
      appointment?.user?.email ||
      ""
    );
  };

  const getDate = (appointment) => {
    if (!appointment?.scheduled_at) return appointment?.slotDate || "—";

    return new Date(appointment.scheduled_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getTime = (appointment) => {
    if (!appointment?.scheduled_at) return appointment?.slotTime || "—";

    return new Date(appointment.scheduled_at).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getType = (appointment) => {
    return appointment?.type || appointment?.reason || appointment?.patient_notes || "Consultation";
  };

  const prepareAppointmentForConsultation = (appointment) => {
    return {
      ...appointment,
      chiefComplaint: appointment?.chiefComplaint || "",
      symptoms: appointment?.symptoms || "",
      diagnosis: appointment?.diagnosis || "",
      prescription: appointment?.prescription || "",
      recommendedTests: appointment?.recommendedTests || "",
      followUp: appointment?.followUp || "",
    };
  };

  const load = useCallback(async () => {
    if (!token) return;

    setLoading(true);

    try {
      const { data } = await axios.get(`${backendUrl}/api/doctor/appointments`, {
        headers,
      });

      if (data?.success) {
        const list = data.appointments || [];
        setAppointments(list);

        const firstActive = list.find((appointment) =>
          ["confirmed", "scheduled", "pending"].includes(
            normalizeStatus(appointment.status)
          )
        );

        if (firstActive) {
          const prepared = prepareAppointmentForConsultation(firstActive);
          setActive(prepared);
          setAiSummary(buildAiSummary(prepared));
        } else {
          setActive(null);
          setAiSummary("");
        }
      } else {
        setAppointments([]);
        toast.error(data?.message || "Failed to load consultations");
      }
    } catch (err) {
      console.error("Load consultations error:", err);
      toast.error(err?.response?.data?.message || "Failed to load consultations");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [token, backendUrl]);

  useEffect(() => {
    load();
  }, [load]);

  const buildAiSummary = (appointment) => {
    if (!appointment) return "";

    return `Patient: ${getPatientName(appointment)}
Appointment: ${getDate(appointment)} at ${getTime(appointment)}
Type: ${getType(appointment)}

Notes:
${appointment.patient_notes || appointment.reason || "No patient notes available."}`;
  };

  const displayHistory = appointments
    .filter((appointment) => normalizeStatus(appointment.status) === "completed")
    .filter((appointment) => {
      if (!searchQ) return true;
      return getPatientName(appointment).toLowerCase().includes(searchQ.toLowerCase());
    });

  const activeAppointments = appointments.filter((appointment) =>
    ["confirmed", "scheduled", "pending"].includes(normalizeStatus(appointment.status))
  );

  const changeField = (key, value) => {
    setActive((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const selectAppointment = (appointment) => {
    const prepared = prepareAppointmentForConsultation(appointment);
    setActive(prepared);
    setAiSummary(buildAiSummary(prepared));
  };

  const savePrescription = async (shouldEndConsultation = false) => {
    if (!active?.id && !active?._id) {
      toast.error("No active appointment selected");
      return;
    }

    setSaving(true);

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/consultation-summaries`,
        {
          appointmentId: active.id || active._id,
          diagnosis: active.diagnosis || null,
          prescription: active.prescription || null,
          followupDate: active.followUp || null,
          doctorNotes: [
            active.chiefComplaint ? `Chief Complaint: ${active.chiefComplaint}` : "",
            active.symptoms ? `Symptoms: ${active.symptoms}` : "",
            active.recommendedTests
              ? `Recommended Tests: ${active.recommendedTests}`
              : "",
          ]
            .filter(Boolean)
            .join("\n"),
        },
        { headers }
      );

      if (data?.success) {
        toast.success(data.message || "Prescription saved successfully");

        await load();

        if (shouldEndConsultation) {
          setActive(null);
        }
      } else {
        toast.error(data?.message || "Failed to save prescription");
      }
    } catch (err) {
      console.error("Save prescription error:", err);
      toast.error(err?.response?.data?.message || "Failed to save prescription");
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = () => savePrescription(false);
  const savePrescriptionOnly = () => savePrescription(false);
  const endConsultation = () => savePrescription(true);

  return (
    <div className="pp-page">
      <div className="pp-container">
        <DoctorSidebar />

        <main className="pp-main-content">
          <p className="pp-welcome">Consultations</p>

          <section className="pp-section">
            <h2 className="pp-section-title">Active Consultation</h2>

            {loading ? (
              <div className="pp-panel">Loading consultation...</div>
            ) : !active ? (
              <div className="pp-panel">
                <p>No active consultation selected.</p>

                {activeAppointments.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    {activeAppointments.map((appointment) => (
                      <button
                        key={appointment.id || appointment._id}
                        className="pp-btn pp-btn-outline pp-btn-sm"
                        style={{ marginRight: 8, marginBottom: 8 }}
                        onClick={() => selectAppointment(appointment)}
                      >
                        {getPatientName(appointment)} — {getDate(appointment)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="pp-panel">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "200px 1fr",
                    gap: 20,
                  }}
                >
                  <div>
                    <div
                      style={{
                        width: 100,
                        height: 100,
                        background: "var(--pp-primary-lighter)",
                        border: "1px solid var(--pp-primary-light)",
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--pp-primary)",
                        fontWeight: 700,
                        fontSize: 32,
                      }}
                    >
                      {getPatientName(active).slice(0, 1)}
                    </div>

                    <div style={{ marginTop: 8, fontWeight: 700 }}>
                      {getPatientName(active)}
                    </div>

                    <div
                      style={{
                        color: "var(--pp-text-secondary)",
                        fontSize: "0.8125rem",
                      }}
                    >
                      {getPatientEmail(active)}
                    </div>

                    <div
                      style={{
                        color: "var(--pp-text-secondary)",
                        fontSize: "0.8125rem",
                        marginTop: 4,
                      }}
                    >
                      {getDate(active)} · {getTime(active)}
                    </div>

                    <div style={{ marginTop: 8 }}>
                      <span className="pp-status-badge pp-status-progress">
                        {getType(active)}
                      </span>
                    </div>

                    {activeAppointments.length > 1 && (
                      <div style={{ marginTop: 16 }}>
                        <div className="pp-panel-title" style={{ marginBottom: 8 }}>
                          Switch Patient
                        </div>

                        {activeAppointments.map((appointment) => (
                          <button
                            key={appointment.id || appointment._id}
                            className="pp-btn pp-btn-outline pp-btn-sm"
                            style={{ marginBottom: 6, width: "100%" }}
                            onClick={() => selectAppointment(appointment)}
                          >
                            {getPatientName(appointment)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    {FORM_FIELDS.map(({ label, key, rows }) => (
                      <div key={key} style={{ marginBottom: 12 }}>
                        <div className="pp-panel-title" style={{ marginBottom: 4 }}>
                          {label}
                        </div>

                        {key === "followUp" ? (
                          <input
                            type="date"
                            className="pp-chat-input"
                            style={{ width: "100%" }}
                            value={active?.[key] || ""}
                            onChange={(e) => changeField(key, e.target.value)}
                          />
                        ) : (
                          <textarea
                            className="pp-chat-input"
                            rows={rows}
                            style={{ width: "100%", resize: "vertical" }}
                            value={active?.[key] || ""}
                            onChange={(e) => changeField(key, e.target.value)}
                          />
                        )}
                      </div>
                    ))}

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        className="pp-btn pp-btn-secondary"
                        onClick={saveNotes}
                        disabled={saving}
                      >
                        Save Notes
                      </button>

                      <button
                        className="pp-btn pp-btn-outline"
                        onClick={savePrescriptionOnly}
                        disabled={saving}
                      >
                        Save Prescription
                      </button>

                      <button
                        className="pp-btn pp-btn-primary"
                        onClick={endConsultation}
                        disabled={saving}
                      >
                        {saving ? "Saving..." : "End Consultation"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="pp-section">
            <h2 className="pp-section-title">AI Patient Summary</h2>

            <div className="pp-panel">
              <div
                style={{
                  background: "var(--pp-background)",
                  padding: 12,
                  borderRadius: 6,
                  whiteSpace: "pre-wrap",
                  fontSize: "0.875rem",
                  color: "var(--pp-text-secondary)",
                  minHeight: 80,
                  lineHeight: 1.7,
                }}
              >
                {aiSummary || "No AI summary available."}
              </div>

              <button
                className="pp-btn pp-btn-outline pp-btn-sm"
                style={{ marginTop: 8 }}
                onClick={() => setAiSummary(buildAiSummary(active))}
              >
                Refresh Summary
              </button>
            </div>
          </section>

          <section className="pp-section">
            <h2 className="pp-section-title">IoT Device Data</h2>

            <div className="pp-bottom-grid">
              <div className="pp-panel">
                <h3 className="pp-panel-title">Tremor Analysis</h3>

                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    alignItems: "flex-end",
                    height: 80,
                    padding: "8px 0",
                  }}
                >
                  {[2, 4, 3, 6, 5, 3, 4, 2, 3, 5, 4, 3].map((value, index) => (
                    <div
                      key={index}
                      style={{
                        flex: 1,
                        background: "var(--pp-primary-light)",
                        height: `${value * 10}px`,
                        borderRadius: 2,
                      }}
                    />
                  ))}
                </div>

                <div
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--pp-text-secondary)",
                    marginTop: 4,
                  }}
                >
                  Score: 82/100 — Normal range
                </div>

                <button
                  className="pp-btn pp-btn-outline pp-btn-sm"
                  style={{ marginTop: 8 }}
                >
                  View Details
                </button>
              </div>

              <div className="pp-panel">
                <h3 className="pp-panel-title">Reaction Time Test</h3>

                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    alignItems: "flex-end",
                    height: 80,
                    padding: "8px 0",
                  }}
                >
                  {[5, 7, 6, 8, 6, 7, 5, 8, 7, 6, 8, 7].map((value, index) => (
                    <div
                      key={index}
                      style={{
                        flex: 1,
                        background: "var(--pp-primary-light)",
                        height: `${value * 8}px`,
                        borderRadius: 2,
                      }}
                    />
                  ))}
                </div>

                <div
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--pp-text-secondary)",
                    marginTop: 4,
                  }}
                >
                  Avg: 248ms — Above average
                </div>

                <button
                  className="pp-btn pp-btn-outline pp-btn-sm"
                  style={{ marginTop: 8 }}
                >
                  View Details
                </button>
              </div>
            </div>
          </section>

          <section className="pp-section">
            <h2 className="pp-section-title">Consultation History</h2>

            <div style={{ marginBottom: 12 }}>
              <input
                className="pp-chat-input"
                placeholder="Search patient…"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
              />
            </div>

            <div className="pp-table-container">
              <table className="pp-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Patient</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {displayHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No completed consultations.</td>
                    </tr>
                  ) : (
                    displayHistory.map((appointment) => (
                      <tr key={appointment.id || appointment._id}>
                        <td>{getDate(appointment)}</td>
                        <td>{getTime(appointment)}</td>
                        <td>{getPatientName(appointment)}</td>
                        <td>{getType(appointment)}</td>
                        <td>{appointment.status}</td>
                        <td>
                          <div className="pp-appointment-actions">
                            <button
                              className="pp-btn pp-btn-outline pp-btn-sm"
                              onClick={() => selectAppointment(appointment)}
                            >
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
        </main>
      </div>
    </div>
  );
};

export default DoctorConsultations;