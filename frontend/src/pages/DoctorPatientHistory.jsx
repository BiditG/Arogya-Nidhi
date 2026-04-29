import { useState, useContext } from "react";
import axios from "axios";
import DoctorSidebar from "../components/DoctorSidebar";
import { AppContext } from "../context/AppContext";
import "./PatientPortal.css";

const DUMMY_PROFILE = {
  name: "Rajan Adhikari",
  id: "PAT-4521",
  age: 52,
  blood_group: "B+",
  allergies: "Penicillin",
  contact: "+977 981-234-5678",
  emergency_contact: "+977 984-876-5432",
};

const DUMMY_CONSULTATIONS = [
  { id: "c1", diagnosis: "Hypertension — controlled", doctor: "Dr. Rahul Sharma", date: "Apr 30, 2026", notes: "Blood pressure 135/85. Continue Amlodipine 5mg. Sodium restriction advised." },
  { id: "c2", diagnosis: "Hypertension — initial diagnosis", doctor: "Dr. Rahul Sharma", date: "Jan 15, 2026", notes: "BP 165/95. Started Amlodipine 5mg. Lifestyle changes advised." },
  { id: "c3", diagnosis: "Annual wellness check", doctor: "Dr. Priya Mehta", date: "Oct 10, 2025", notes: "Overall health good. Lipid panel slightly elevated." },
];

const DUMMY_PRESCRIPTIONS = [
  { id: "p1", date: "Apr 30, 2026", medication: "Amlodipine", dosage: "5mg", duration: "90 days", prescribed_by: "Dr. Rahul Sharma" },
  { id: "p2", date: "Apr 30, 2026", medication: "Aspirin", dosage: "75mg", duration: "90 days", prescribed_by: "Dr. Rahul Sharma" },
  { id: "p3", date: "Jan 15, 2026", medication: "Amlodipine", dosage: "5mg (initial)", duration: "30 days", prescribed_by: "Dr. Rahul Sharma" },
];

const DUMMY_LAB_REPORTS = [
  { id: "r1", title: "Complete Blood Count", date: "Apr 25, 2026" },
  { id: "r2", title: "Lipid Panel", date: "Apr 25, 2026" },
  { id: "r3", title: "Echocardiogram", date: "Mar 10, 2026" },
];

const PROFILE_FIELDS = [
  { label: "Age", key: "age" },
  { label: "Blood Group", key: "blood_group" },
  { label: "Allergies", key: "allergies" },
  { label: "Contact", key: "contact" },
  { label: "Emergency Contact", key: "emergency_contact" },
];

const TABS = [
  { key: "consultations", label: "Consultations" },
  { key: "prescriptions", label: "Prescriptions" },
  { key: "labReports", label: "Lab Reports" },
];

const DoctorPatientHistory = () => {
  const { token, backendUrl } = useContext(AppContext);
  const [patientId, setPatientId] = useState("");
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(DUMMY_PROFILE);
  const [consultations, setConsultations] = useState(DUMMY_CONSULTATIONS);
  const [prescriptions, setPrescriptions] = useState(DUMMY_PRESCRIPTIONS);
  const [labReports, setLabReports] = useState(DUMMY_LAB_REPORTS);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("consultations");

  const headers = token ? { Authorization: `Bearer ${token}`, dtoken: token } : {};

  const search = async () => {
    if (!patientId.trim()) return setError("Enter patient ID or name");
    setError(null);
    setLoading(true);
    try {
      const url = `${backendUrl}/api/doctor/patient/${encodeURIComponent(patientId)}/history`;
      const { data } = await axios.get(url, { headers }).catch(() => ({ data: null }));
      if (data?.success) {
        setProfile(data.profile || data.patient || DUMMY_PROFILE);
        setConsultations(data.consultations || DUMMY_CONSULTATIONS);
        setPrescriptions(data.prescriptions || DUMMY_PRESCRIPTIONS);
        setLabReports(data.labReports || data.reports || DUMMY_LAB_REPORTS);
      } else {
        setProfile({ ...DUMMY_PROFILE, id: patientId });
        setConsultations(DUMMY_CONSULTATIONS);
        setPrescriptions(DUMMY_PRESCRIPTIONS);
        setLabReports(DUMMY_LAB_REPORTS);
      }
    } catch {
      setError("Could not fetch patient data.");
    } finally {
      setLoading(false);
      setActiveTab("consultations");
    }
  };

  return (
    <div className="pp-page">
      <div className="pp-container">
        <DoctorSidebar />
        <main className="pp-main-content">
          <p className="pp-welcome">Patient History</p>

          <section className="pp-section">
            <div className="pp-panel">
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  className="pp-chat-input"
                  placeholder="Enter patient ID or name"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && search()}
                />
                <button className="pp-btn pp-btn-primary" onClick={search} disabled={loading}>
                  {loading ? "Searching…" : "Search"}
                </button>
                <button className="pp-btn pp-btn-outline">Scan QR</button>
              </div>
              {error && (
                <div style={{ color: "#dc2626", marginTop: 8, fontSize: "0.875rem" }}>{error}</div>
              )}
            </div>
          </section>

          {profile && (
            <section className="pp-section">
              <div className="pp-panel">
                <div style={{ display: "flex", gap: 20 }}>
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
                        fontSize: 36,
                      }}
                    >
                      {(profile.name || "P").slice(0, 1)}
                    </div>
                    <div style={{ marginTop: 8, fontWeight: 700 }}>{profile.name}</div>
                    <div style={{ color: "var(--pp-text-secondary)", fontSize: "0.8125rem" }}>
                      ID: {profile.id || "—"}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                      {PROFILE_FIELDS.map(({ label, key }) => (
                        <div key={key} className="pp-iot-item" style={{ flexDirection: "column", alignItems: "flex-start" }}>
                          <div className="pp-panel-title" style={{ marginBottom: 2 }}>{label}</div>
                          <div style={{ fontWeight: 600 }}>{profile[key] || "—"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {profile && (
            <section className="pp-section">
              <div style={{ display: "flex", gap: 4, marginBottom: 16, borderBottom: "2px solid var(--pp-border)", paddingBottom: 4 }}>
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    className={`pp-btn pp-btn-sm ${activeTab === t.key ? "pp-btn-primary" : "pp-btn-outline"}`}
                    onClick={() => setActiveTab(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {activeTab === "consultations" && (
                <div>
                  <h2 className="pp-section-title">Consultation History</h2>
                  <div className="pp-appointment-list">
                    {consultations.map((c) => (
                      <div key={c.id || c._id} className="pp-appointment-item">
                        <div className="pp-appointment-info">
                          <div className="pp-appointment-title">{c.diagnosis || c.title || "—"}</div>
                          <div className="pp-appointment-meta">
                            {c.date || c.slotDate || ""} · {c.doctor || c.doctorName || "—"}
                          </div>
                          {c.notes && (
                            <div style={{ fontSize: "0.8125rem", color: "var(--pp-text-secondary)", marginTop: 4 }}>
                              {c.notes}
                            </div>
                          )}
                        </div>
                        <div className="pp-appointment-actions">
                          <button className="pp-btn pp-btn-outline pp-btn-sm">View Report</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "prescriptions" && (
                <div>
                  <h2 className="pp-section-title">Prescription History</h2>
                  <div className="pp-table-container">
                    <table className="pp-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Medication</th>
                          <th>Dosage</th>
                          <th>Duration</th>
                          <th>Prescribed By</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prescriptions.map((p) => (
                          <tr key={p.id || p._id}>
                            <td>{p.date || "—"}</td>
                            <td>{p.medication || p.name || "—"}</td>
                            <td>{p.dosage || "—"}</td>
                            <td>{p.duration || "—"}</td>
                            <td>{p.prescribed_by || p.prescribedBy || "—"}</td>
                            <td>
                              <div className="pp-appointment-actions">
                                <button className="pp-btn pp-btn-outline pp-btn-sm">View</button>
                                <button className="pp-btn pp-btn-outline pp-btn-sm">Download</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "labReports" && (
                <div>
                  <h2 className="pp-section-title">Laboratory Reports</h2>
                  <div className="pp-appointment-list">
                    {labReports.map((r) => (
                      <div key={r.id || r._id} className="pp-appointment-item">
                        <div className="pp-appointment-info">
                          <div className="pp-appointment-title">{r.title || r.report_type || "Lab Report"}</div>
                          <div className="pp-appointment-meta">{r.date || r.createdAt || ""}</div>
                        </div>
                        <div className="pp-appointment-actions">
                          <button className="pp-btn pp-btn-outline pp-btn-sm">View</button>
                          <button className="pp-btn pp-btn-outline pp-btn-sm">Download</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

export default DoctorPatientHistory;
