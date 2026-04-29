import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import DoctorSidebar from "../components/DoctorSidebar";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import "./PatientPortal.css";

const DUMMY_QUERIES = [
  {
    id: "q1",
    title: "Persistent headache for 3 weeks",
    symptom_text:
      "I have been experiencing headaches every morning for the past 3 weeks. The pain is throbbing and mainly on the left side. Paracetamol provides temporary relief but it returns within a few hours.",
    created_at: "2026-04-25T10:30:00Z",
    patient: { user: { name: "Anita Thapa" } },
    responses: [{ id: "r1" }],
    isResolved: false,
  },
  {
    id: "q2",
    title: "Swollen ankles — should I be concerned?",
    symptom_text:
      "My ankles have been swollen for about a week, particularly in the evenings. No pain but feels tight. I have been sitting for long hours at work.",
    created_at: "2026-04-27T14:15:00Z",
    patient: { user: { name: "Bikash Shrestha" } },
    responses: [],
    isResolved: false,
  },
  {
    id: "q3",
    title: "Chest tightness after exercise",
    symptom_text:
      "After my morning run I feel tightness in my chest for about 10–15 minutes. No sharp pain. Goes away on its own. Should I be worried about my heart?",
    created_at: "2026-04-28T09:00:00Z",
    patient: { user: { name: "Priya Gautam" } },
    responses: [{ id: "r2" }, { id: "r3" }],
    isResolved: true,
  },
  {
    id: "q4",
    title: "Medication side effects — dizziness",
    symptom_text:
      "I started Amlodipine 5mg last week and have been feeling dizzy in the mornings. Is this normal? Should I reduce the dose?",
    created_at: "2026-04-29T16:45:00Z",
    patient: { user: { name: "Rajan Adhikari" } },
    responses: [{ id: "r4" }],
    isResolved: false,
  },
];

const DoctorQueries = () => {
  const { backendUrl, token } = useContext(AppContext);
  const [queries, setQueries] = useState(DUMMY_QUERIES);
  const [loading, setLoading] = useState(false);
  const [searchQ, setSearchQ] = useState("");

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${token}`, dtoken: token };
        const res = await fetch(`${backendUrl}/api/doctor/queries`, { headers });
        const data = await res.json().catch(() => null);
        if (data?.success && Array.isArray(data.queries) && data.queries.length > 0) {
          setQueries(data.queries);
        }
      } catch {
        // keep dummy
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, backendUrl]);

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "";

  const filtered = queries.filter(
    (q) =>
      !searchQ ||
      (q.title || "").toLowerCase().includes(searchQ.toLowerCase()) ||
      (q.patient?.user?.name || "").toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <div className="pp-page">
      <div className="pp-container">
        <DoctorSidebar />
        <main className="pp-main-content">
          <p className="pp-welcome">Patient Queries</p>

          <section className="pp-section">
            <div className="pp-ai-container">
              <div className="pp-ai-header">
                <div className="pp-ai-avatar">
                  <ChatBubbleLeftRightIcon style={{ width: 20, height: 20 }} />
                </div>
                <div>
                  <div className="pp-ai-title">Health Query Inbox</div>
                  <div className="pp-ai-subtitle">Respond to patient questions and concerns</div>
                </div>
              </div>
              <input
                className="pp-chat-input"
                style={{ width: "100%" }}
                placeholder="Search by patient name or query title…"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
              />
            </div>
          </section>

          <section className="pp-section">
            <h2 className="pp-section-title">Open Queries</h2>
            {loading ? (
              <div className="pp-appointment-list">
                <div className="pp-appointment-item">
                  <div className="pp-appointment-info">
                    <div className="pp-appointment-title">Loading queries...</div>
                  </div>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="pp-appointment-list">
                <div className="pp-appointment-item">
                  <div className="pp-appointment-info">
                    <div className="pp-appointment-title">No queries found.</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="pp-appointment-list">
                {filtered.map((q) => (
                  <div key={q.id} className="pp-appointment-item">
                    <div className="pp-appointment-icon">
                      <ChatBubbleLeftRightIcon style={{ width: 20, height: 20 }} />
                    </div>
                    <div className="pp-appointment-info">
                      <div className="pp-appointment-title">{q.title}</div>
                      <div className="pp-appointment-meta">
                        {q.patient?.user?.name || "Anonymous"} · {fmtDate(q.created_at)} ·{" "}
                        {q.responses?.length || 0} response
                        {q.responses?.length !== 1 ? "s" : ""}
                      </div>
                      {q.symptom_text && (
                        <div
                          style={{
                            fontSize: "0.8125rem",
                            color: "var(--pp-text-muted)",
                            marginTop: 4,
                          }}
                        >
                          {q.symptom_text.slice(0, 100)}
                          {q.symptom_text.length > 100 ? "…" : ""}
                        </div>
                      )}
                    </div>
                    <div className="pp-appointment-actions">
                      <span
                        className={`pp-status-badge ${
                          q.isResolved ? "pp-status-resolved" : "pp-status-progress"
                        }`}
                      >
                        {q.isResolved ? "Resolved" : "Open"}
                      </span>
                      <Link to={`/doctor-portal/queries/${q.id}`} state={{ query: q }}>
                        <button className="pp-btn pp-btn-primary pp-btn-sm">Respond</button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default DoctorQueries;
