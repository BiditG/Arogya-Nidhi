import { useContext, useEffect, useState } from "react";
import axios from "axios";
import DoctorSidebar from "../components/DoctorSidebar";
import { AppContext } from "../context/AppContext";
import { SparklesIcon } from "@heroicons/react/24/outline";
import "./PatientPortal.css";

const DUMMY_SUMMARIES = [
  {
    id: "s1",
    patientName: "Rajan Adhikari",
    date: "Apr 30, 2026",
    aiSummary: `Patient Rajan Adhikari (52M) presents for routine hypertension follow-up.

Key findings:
• BP: 135/85 mmHg (improved from 165/95 at initial visit)
• Heart rate: 72 bpm, regular rhythm
• No signs of end-organ damage
• Compliant with Amlodipine 5mg daily

Assessment: Hypertension — well controlled on current regimen.
Plan: Continue Amlodipine 5mg. Sodium restriction, daily 30-min walk. Follow-up in 4 weeks. Renal function panel in 3 months.`,
  },
  {
    id: "s2",
    patientName: "Sunita Poudel",
    date: "Apr 29, 2026",
    aiSummary: `Patient Sunita Poudel (41F) — post-cholecystectomy day 10 follow-up.

Key findings:
• Laparoscopic wound healing well — no erythema or discharge
• Mild periumbilical tenderness on palpation
• Ambulating independently, tolerating soft diet
• Bowel function restored day 4 post-op

Assessment: Normal post-operative recovery.
Plan: Suture removal today. Paracetamol 500mg PRN for pain. Resume normal diet. Return if fever >38°C or worsening pain. Full return to activity in 2 weeks.`,
  },
  {
    id: "s3",
    patientName: "Bikash Shrestha",
    date: "Apr 28, 2026",
    aiSummary: `Patient Bikash Shrestha (45M) — Type 2 Diabetes 3-month review.

Key findings:
• HbA1c: 7.4% (improved from 8.2% — target <7%)
• Fasting glucose: 112 mg/dL
• Weight: 78kg (down 2kg from last visit)
• No hypoglycaemic episodes reported

Assessment: Type 2 Diabetes — improving control.
Plan: Continue Metformin 1000mg BD. Reinforce dietary advice. Foot examination at next visit. Repeat HbA1c in 3 months. Ophthalmology referral pending.`,
  },
];

const DoctorAISummaries = () => {
  const { token, backendUrl } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  const [summaries, setSummaries] = useState(DUMMY_SUMMARIES);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const headers = token ? { dtoken: token, Authorization: `Bearer ${token}` } : {};
        const { data } = await axios
          .get(backendUrl + "/api/doctor/ai-summaries", { headers })
          .catch(() => ({ data: null }));
        if (data?.success && Array.isArray(data.summaries) && data.summaries.length > 0) {
          setSummaries(data.summaries);
        }
      } catch {
        // keep dummy summaries
      } finally {
        setLoading(false);
      }
    };
    if (token) load();
  }, [backendUrl, token]);

  const filtered = summaries.filter(
    (s) =>
      !query ||
      (s.patientName || "").toLowerCase().includes(query.toLowerCase()) ||
      (s.aiSummary || "").toLowerCase().includes(query.toLowerCase())
  );

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
                  <div className="pp-ai-subtitle">Auto-generated patient consultation summaries</div>
                </div>
              </div>
              <input
                className="pp-chat-input"
                style={{ width: "100%" }}
                placeholder="Search by patient name or summary text…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </section>

          <section className="pp-section">
            <h2 className="pp-section-title">Patient Summaries</h2>
            {loading ? (
              <div className="pp-panel">
                <div className="pp-stat-label">Loading summaries...</div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="pp-panel">No summaries found.</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {filtered.map((s) => (
                  <div
                    key={s.id}
                    className="pp-panel"
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>
                        {s.patientName || "Unknown Patient"}
                      </div>
                      <div style={{ fontSize: "0.8125rem", color: "var(--pp-text-muted)", marginBottom: 8 }}>
                        {s.date || ""}
                      </div>
                      <div
                        style={{
                          fontSize: "0.875rem",
                          color: "var(--pp-text-secondary)",
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.6,
                        }}
                      >
                        {(s.aiSummary || "No summary available.").slice(0, 200)}
                        {(s.aiSummary || "").length > 200 ? "…" : ""}
                      </div>
                    </div>
                    <button
                      className="pp-btn pp-btn-outline pp-btn-sm"
                      style={{ flexShrink: 0 }}
                      onClick={() => setSelected(s)}
                    >
                      View Full
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {selected && (
            <section className="pp-section">
              <div className="pp-panel">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "1rem" }}>{selected.patientName}</div>
                    <div style={{ fontSize: "0.8125rem", color: "var(--pp-text-muted)" }}>{selected.date}</div>
                  </div>
                  <button
                    className="pp-btn pp-btn-outline pp-btn-sm"
                    onClick={() => setSelected(null)}
                  >
                    Close
                  </button>
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
                  {selected.aiSummary || "No AI summary available."}
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

export default DoctorAISummaries;
