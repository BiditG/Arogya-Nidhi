import { useEffect, useState, useContext } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import DoctorSidebar from "../components/DoctorSidebar";
import { AppContext } from "../context/AppContext";
import "./PatientPortal.css";

const DUMMY_ACTIVE = {
  id: "da1",
  user: { name: "Anita Thapa", email: "anita.thapa@email.com" },
  slotDate: "May 1, 2026",
  slotTime: "10:00 AM",
  status: "scheduled",
  type: "General Checkup",
  chiefComplaint: "Recurring headache for the past 2 weeks, mainly in the mornings.",
  symptoms: "Throbbing headache (7/10 pain), photophobia, mild nausea. No fever.",
  diagnosis: "",
  prescription: "",
  recommendedTests: "CBC, BP monitoring for 1 week",
  followUp: "",
};

const DUMMY_HISTORY = [
  { id: "dc4", user: { name: "Rajan Adhikari" }, slotDate: "Apr 30, 2026", type: "Routine Checkup", diagnosis: "Hypertension — controlled", status: "completed" },
  { id: "dc5", user: { name: "Sunita Poudel" }, slotDate: "Apr 29, 2026", type: "Follow-up", diagnosis: "Post-surgery recovery", status: "completed" },
  { id: "dc6", user: { name: "Bikash Shrestha" }, slotDate: "Apr 28, 2026", type: "Diabetes Management", diagnosis: "Type 2 Diabetes — improving", status: "completed" },
];

const DUMMY_AI_SUMMARY = `Patient Anita Thapa (28F) presents with 2-week history of recurring morning headaches (7/10 severity).

Key findings:
• Throbbing bilateral headaches, worse on waking
• Associated photophobia and mild nausea
• No history of migraines; no fever or neurological symptoms
• Vital signs: BP 122/78, HR 76, Temp 37.1°C

Likely diagnosis: Tension-type headache, possible migraine variant.
Recommended: CBC, BP monitoring over 1 week, consider migraine prophylaxis if recurrent.`;

const FORM_FIELDS = [
  { label: "Chief Complaint", key: "chiefComplaint", rows: 2 },
  { label: "Symptoms", key: "symptoms", rows: 3 },
  { label: "Diagnosis", key: "diagnosis", rows: 2 },
  { label: "Prescription", key: "prescription", rows: 3 },
  { label: "Recommended Tests", key: "recommendedTests", rows: 1 },
  { label: "Follow-up Instructions", key: "followUp", rows: 2 },
];

const DoctorConsultations = () => {
  const { token, backendUrl } = useContext(AppContext);
  const [appointments, setAppointments] = useState([]);
  const [active, setActive] = useState(DUMMY_ACTIVE);
  const [aiSummary, setAiSummary] = useState(DUMMY_AI_SUMMARY);
  const [loading, setLoading] = useState(false);
  const [searchQ, setSearchQ] = useState("");

  const headers = token ? { Authorization: `Bearer ${token}`, dtoken: token } : {};

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(backendUrl + "/api/doctor/appointments", { headers });
      if (data.success) {
        const list = (data.appointments || []).reverse();
        setAppointments(list);
        const first = list.find((a) =>
          ["scheduled", "pending"].includes((a.status || "").toLowerCase())
        );
        if (first)
          setActive({
            ...first,
            chiefComplaint: first.chiefComplaint || "",
            symptoms: first.symptoms || "",
            diagnosis: first.diagnosis || "",
            prescription: first.prescription || "",
            recommendedTests: first.recommendedTests || "",
            followUp: first.followUp || "",
          });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  const displayHistory = (appointments.length > 0 ? appointments : DUMMY_HISTORY)
    .filter((a) => (a.status || "").toLowerCase() === "completed")
    .filter((a) =>
      !searchQ ||
      (a.user?.name || a.patient_name || "").toLowerCase().includes(searchQ.toLowerCase())
    );

  const changeField = (key, value) => setActive((prev) => ({ ...prev, [key]: value }));

  const saveNotes = () => toast.success("Notes saved.");
  const generatePrescription = () => toast.info("Prescription generated (placeholder).");

  const endConsultation = async () => {
    if (!active) return;
    try {
      const { data } = await axios.post(
        backendUrl + "/api/doctor/complete-appointment",
        { appointmentId: active.id || active._id },
        { headers }
      );
      if (data.success) {
        toast.success(data.message || "Consultation ended");
        setActive(DUMMY_ACTIVE);
        load();
      }
    } catch {
      toast.success("Consultation ended (demo).");
      setActive(DUMMY_ACTIVE);
    }
  };

  return (
    <div className="pp-page">
      <div className="pp-container">
        <DoctorSidebar />
        <main className="pp-main-content">
          <p className="pp-welcome">Consultations</p>

          <section className="pp-section">
            <h2 className="pp-section-title">Active Consultation</h2>
            <div className="pp-panel">
              <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 20 }}>
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
                    {(active?.user?.name || "P").slice(0, 1)}
                  </div>
                  <div style={{ marginTop: 8, fontWeight: 700 }}>{active?.user?.name || "Unknown"}</div>
                  <div style={{ color: "var(--pp-text-secondary)", fontSize: "0.8125rem" }}>
                    {active?.user?.email || ""}
                  </div>
                  <div style={{ color: "var(--pp-text-secondary)", fontSize: "0.8125rem", marginTop: 4 }}>
                    {active?.slotDate} · {active?.slotTime}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <span className="pp-status-badge pp-status-progress">
                      {active?.type || "Consultation"}
                    </span>
                  </div>
                </div>

                <div>
                  {FORM_FIELDS.map(({ label, key, rows }) => (
                    <div key={key} style={{ marginBottom: 12 }}>
                      <div className="pp-panel-title" style={{ marginBottom: 4 }}>
                        {label}
                      </div>
                      <textarea
                        className="pp-chat-input"
                        rows={rows}
                        style={{ width: "100%", resize: "vertical" }}
                        value={active?.[key] || ""}
                        onChange={(e) => changeField(key, e.target.value)}
                      />
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="pp-btn pp-btn-secondary" onClick={saveNotes}>
                      Save Notes
                    </button>
                    <button className="pp-btn pp-btn-outline" onClick={generatePrescription}>
                      Generate Prescription
                    </button>
                    <button className="pp-btn pp-btn-primary" onClick={endConsultation}>
                      End Consultation
                    </button>
                  </div>
                </div>
              </div>
            </div>
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
                onClick={() => setAiSummary(DUMMY_AI_SUMMARY)}
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
                <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 80, padding: "8px 0" }}>
                  {[2, 4, 3, 6, 5, 3, 4, 2, 3, 5, 4, 3].map((v, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        background: "var(--pp-primary-light)",
                        height: `${v * 10}px`,
                        borderRadius: 2,
                      }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: "0.8125rem", color: "var(--pp-text-secondary)", marginTop: 4 }}>
                  Score: 82/100 — Normal range
                </div>
                <button className="pp-btn pp-btn-outline pp-btn-sm" style={{ marginTop: 8 }}>
                  View Details
                </button>
              </div>
              <div className="pp-panel">
                <h3 className="pp-panel-title">Reaction Time Test</h3>
                <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 80, padding: "8px 0" }}>
                  {[5, 7, 6, 8, 6, 7, 5, 8, 7, 6, 8, 7].map((v, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        background: "var(--pp-primary-light)",
                        height: `${v * 8}px`,
                        borderRadius: 2,
                      }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: "0.8125rem", color: "var(--pp-text-secondary)", marginTop: 4 }}>
                  Avg: 248ms — Above average
                </div>
                <button className="pp-btn pp-btn-outline pp-btn-sm" style={{ marginTop: 8 }}>
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
                    <th>Patient</th>
                    <th>Type</th>
                    <th>Diagnosis</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5}>No completed consultations.</td>
                    </tr>
                  ) : (
                    displayHistory.map((a) => (
                      <tr key={a.id || a._id}>
                        <td>{a.slotDate || a.date || "—"}</td>
                        <td>{a.user?.name || a.patient_name || "—"}</td>
                        <td>{a.type || "—"}</td>
                        <td>{a.diagnosis || "—"}</td>
                        <td>
                          <div className="pp-appointment-actions">
                            <button
                              className="pp-btn pp-btn-outline pp-btn-sm"
                              onClick={() =>
                                setActive({
                                  ...a,
                                  chiefComplaint: a.chiefComplaint || "",
                                  symptoms: a.symptoms || "",
                                  diagnosis: a.diagnosis || "",
                                  prescription: a.prescription || "",
                                  recommendedTests: a.recommendedTests || "",
                                  followUp: a.followUp || "",
                                })
                              }
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
