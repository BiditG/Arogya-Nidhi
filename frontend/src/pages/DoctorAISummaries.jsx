import { useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import DoctorSidebar from "../components/DoctorSidebar";
import { AppContext } from "../context/AppContext";
import { SparklesIcon } from "@heroicons/react/24/outline";
import "./PatientPortal.css";

const DoctorAISummaries = () => {
  const { token, backendUrl } = useContext(AppContext);
  const location = useLocation();
  const requestedPatient = location.state || null;
  const [loading, setLoading] = useState(false);
  const [summaries, setSummaries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [queryDraft, setQueryDraft] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (requestedPatient?.patientName || requestedPatient?.patientEmail) {
      const requestedQuery = requestedPatient.patientName || requestedPatient.patientEmail;
      setQuery(requestedQuery);
      setQueryDraft(requestedQuery);
    }
  }, [requestedPatient?.patientName, requestedPatient?.patientEmail]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const headers = token ? { dtoken: token, Authorization: `Bearer ${token}` } : {};
        const { data } = await axios.get(backendUrl + "/api/doctor/ai-summaries", { headers });

        if (data?.success && Array.isArray(data.summaries)) {
          setSummaries(data.summaries);
        } else {
          setSummaries([]);
          setError(data?.message || "Failed to load summaries.");
        }
      } catch (err) {
        setSummaries([]);
        setError(err?.response?.data?.message || "Failed to load summaries.");
      } finally {
        setLoading(false);
      }
    };

    if (token) load();
  }, [backendUrl, token]);

  const filtered = summaries.filter((summary) => {
    const needle = query.toLowerCase();
    return (
      !needle ||
      (summary.patientName || "").toLowerCase().includes(needle) ||
      (summary.patientEmail || "").toLowerCase().includes(needle) ||
      (summary.aiSummary || "").toLowerCase().includes(needle) ||
      (summary.medicalHistory || "").toLowerCase().includes(needle) ||
      (summary.allergies || "").toLowerCase().includes(needle)
    );
  });

  const runSearch = () => {
    const nextQuery = queryDraft.trim();
    setQuery(nextQuery);
    const match = summaries.find((summary) => {
      const needle = nextQuery.toLowerCase();
      return (
        !needle ||
        (summary.patientName || "").toLowerCase().includes(needle) ||
        (summary.patientEmail || "").toLowerCase().includes(needle) ||
        (summary.aiSummary || "").toLowerCase().includes(needle) ||
        (summary.medicalHistory || "").toLowerCase().includes(needle) ||
        (summary.allergies || "").toLowerCase().includes(needle)
      );
    });
    setSelected(match || null);
  };

  useEffect(() => {
    if (!requestedPatient) return;

    const requestedAppointmentId = String(requestedPatient.appointmentId || "").trim();
    const requestedPatientId = String(requestedPatient.patientId || "").trim();
    const patientName = String(requestedPatient.patientName || "").toLowerCase();
    const patientEmail = String(requestedPatient.patientEmail || "").toLowerCase();

    const match = summaries.find((summary) => {
      const summaryAppointmentId = String(summary.appointmentId || summary.id || "").trim();
      const summaryPatientId = String(summary.patientId || "").trim();
      const summaryName = String(summary.patientName || "").toLowerCase();
      const summaryEmail = String(summary.patientEmail || "").toLowerCase();

      if (requestedAppointmentId && summaryAppointmentId === requestedAppointmentId) return true;
      if (requestedPatientId && summaryPatientId === requestedPatientId) return true;
      if (patientEmail && summaryEmail && summaryEmail === patientEmail) return true;
      if (patientName && summaryName && summaryName.includes(patientName)) return true;
      if (patientEmail && summaryEmail && summaryEmail.includes(patientEmail)) return true;
      return false;
    });

    if (match) setSelected(match);
  }, [requestedPatient, summaries]);

  useEffect(() => {
    if (!selected?.id) return;
    const id = `ai-summary-${selected.id}`;
    const t = setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
    return () => clearTimeout(t);
  }, [selected?.id]);

  return (
    <div className="pp-page">
      <div className="pp-container">
        <DoctorSidebar />
        <main className="pp-main-content">
          <p className="pp-welcome">AI Summaries</p>

          <section className="pp-section">
            <div className="pp-ai-container">
              <div className="pp-ai-header">
                <div className="pp-ai-avatar">
                  <SparklesIcon style={{ width: 20, height: 20 }} />
                </div>
                <div>
                  <div className="pp-ai-title">AI Clinical Summaries</div>
                  <div className="pp-ai-subtitle">
                    Auto-generated from booked patients' medical history and allergies
                  </div>
                </div>
              </div>

              {requestedPatient?.patientName && (
                <div className="pp-panel" style={{ marginBottom: 12, padding: 12 }}>
                  <div style={{ fontWeight: 700 }}>{requestedPatient.patientName}</div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--pp-text-muted)" }}>
                    {requestedPatient.patientEmail || "AI summaries for selected patient"}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  className="pp-chat-input"
                  style={{ flex: "1 1 260px" }}
                  placeholder="Search by patient, history, allergies, or summary..."
                  value={queryDraft}
                  onChange={(event) => setQueryDraft(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && runSearch()}
                />
                <button type="button" className="pp-btn pp-btn-primary" onClick={runSearch}>
                  Search
                </button>
                {query && (
                  <button
                    type="button"
                    className="pp-btn pp-btn-outline"
                    onClick={() => {
                      setQuery("");
                      setQueryDraft("");
                      setSelected(null);
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </section>

          <section className="pp-section">
            <h2 className="pp-section-title">Patient Summaries</h2>
            {loading ? (
              <div className="pp-panel">
                <div className="pp-stat-label">Loading summaries...</div>
              </div>
            ) : error ? (
              <div className="pp-panel">{error}</div>
            ) : filtered.length === 0 ? (
              <div className="pp-panel">
                No summaries found. A summary will appear here after a patient books with you and has medical history or allergies saved in their profile.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {filtered.map((summary) => {
                  const isExpanded = selected?.id === summary.id;
                  return (
                    <div key={summary.id} id={`ai-summary-${summary.id}`} className="pp-panel">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>
                            {summary.patientName || "Unknown Patient"}
                          </div>
                          <div style={{ fontSize: "0.8125rem", color: "var(--pp-text-muted)", marginBottom: 8 }}>
                            {[summary.date, summary.patientEmail].filter(Boolean).join(" | ")}
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                            <span style={pillStyle}>History: {summary.medicalHistory || "Not recorded"}</span>
                            <span style={pillStyle}>Allergies: {summary.allergies || "Not recorded"}</span>
                          </div>
                        </div>
                        <button
                          className="pp-btn pp-btn-outline pp-btn-sm"
                          style={{ flexShrink: 0 }}
                          onClick={() => setSelected(isExpanded ? null : summary)}
                        >
                          {isExpanded ? "Close" : "View Summary"}
                        </button>
                      </div>

                      {isExpanded && (
                        <div style={{ marginTop: 12 }}>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                              gap: 10,
                              marginBottom: 12,
                            }}
                          >
                            <div style={detailBoxStyle}>
                              <div className="pp-stat-label" style={{ marginBottom: 4 }}>Medical History</div>
                              <div style={detailTextStyle}>{summary.medicalHistory || "Not recorded"}</div>
                            </div>
                            <div style={detailBoxStyle}>
                              <div className="pp-stat-label" style={{ marginBottom: 4 }}>Allergies</div>
                              <div style={detailTextStyle}>{summary.allergies || "Not recorded"}</div>
                            </div>
                          </div>
                          <div
                            style={{
                              background: "var(--pp-background)",
                              padding: 16,
                              borderRadius: 6,
                              whiteSpace: "pre-wrap",
                              fontSize: "0.875rem",
                              color: "var(--pp-text-secondary)",
                              lineHeight: 1.7,
                            }}
                          >
                            {summary.aiSummary || "No AI summary available."}
                          </div>
                        </div>
                      )}

                      {!isExpanded && (
                        <div
                          style={{
                            fontSize: "0.875rem",
                            color: "var(--pp-text-secondary)",
                            whiteSpace: "pre-wrap",
                            lineHeight: 1.6,
                          }}
                        >
                          {(summary.aiSummary || "No summary available.").slice(0, 220)}
                          {(summary.aiSummary || "").length > 220 ? "..." : ""}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

const pillStyle = {
  border: "1px solid var(--pp-border)",
  borderRadius: 6,
  padding: "4px 8px",
  fontSize: "0.75rem",
  color: "var(--pp-text-secondary)",
};

const detailBoxStyle = {
  border: "1px solid var(--pp-border)",
  borderRadius: 6,
  padding: 12,
};

const detailTextStyle = {
  color: "var(--pp-text-secondary)",
  fontSize: "0.875rem",
};

export default DoctorAISummaries;
