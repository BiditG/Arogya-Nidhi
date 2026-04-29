import { useContext, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import DoctorSidebar from "../components/DoctorSidebar";
import { ChatBubbleLeftRightIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import "./PatientPortal.css";

const DUMMY_QUERY = {
  id: "q1",
  title: "Persistent headache for 3 weeks",
  symptom_text:
    "I have been experiencing headaches every morning for the past 3 weeks. The pain is throbbing and mainly on the left side. Paracetamol provides temporary relief but it returns within a few hours. I am worried this could be something serious.",
  created_at: "2026-04-25T10:30:00Z",
  patient: { user: { name: "Anita Thapa" } },
  responses: [
    {
      id: "r1",
      doctor: { user: { name: "Dr. Rahul Sharma" } },
      created_at: "2026-04-26T09:15:00Z",
      response_text:
        "Thank you for reaching out. Based on your description, this sounds like tension-type headaches, which are very common. The throbbing character and unilateral location can sometimes indicate a migraine variant. I recommend keeping a headache diary noting triggers (stress, sleep, diet). Please book an appointment so I can examine you properly and check your blood pressure. If you develop vision changes, vomiting, or a sudden severe headache, please go to the emergency room immediately.",
    },
  ],
};

const DoctorQueryDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { backendUrl, token } = useContext(AppContext);
  const [query, setQuery] = useState(location.state?.query || null);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (query) return;
    const load = async () => {
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${token}`, dtoken: token };
        const res = await fetch(`${backendUrl}/api/doctor/queries/${id}`, { headers });
        const data = await res.json().catch(() => null);
        if (data?.success && data.query) {
          setQuery(data.query);
        } else {
          setQuery({ ...DUMMY_QUERY, id });
        }
      } catch {
        setQuery({ ...DUMMY_QUERY, id });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, token, backendUrl]);

  const submitAnswer = async () => {
    if (!answer.trim()) return;
    setSubmitting(true);
    const newResponse = {
      id: `r-${Date.now()}`,
      doctor: { user: { name: "Dr. Rahul Sharma" } },
      created_at: new Date().toISOString(),
      response_text: answer.trim(),
    };
    try {
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        dtoken: token,
      };
      await fetch(`${backendUrl}/api/doctor/queries/${id}/responses`, {
        method: "POST",
        headers,
        body: JSON.stringify({ responseText: answer.trim() }),
      });
    } catch {
      // optimistic add regardless
    } finally {
      setQuery((prev) => ({ ...prev, responses: [...(prev.responses || []), newResponse] }));
      setAnswer("");
      setSubmitting(false);
    }
  };

  const fmtDateTime = (d) =>
    d
      ? new Date(d).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "";

  return (
    <div className="pp-page">
      <div className="pp-container">
        <DoctorSidebar />
        <main className="pp-main-content">
          <p className="pp-welcome" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="pp-btn pp-btn-outline pp-btn-sm"
              onClick={() => navigate("/doctor-portal/queries")}
            >
              ← Back
            </button>
            Patient Query
          </p>

          {loading ? (
            <div className="pp-panel">
              <div className="pp-stat-label">Loading query...</div>
            </div>
          ) : query ? (
            <>
              <section className="pp-section">
                <div className="pp-panel">
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div className="pp-appointment-icon">
                      <UserCircleIcon style={{ width: 22, height: 22 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 4 }}>
                        {query.title}
                      </div>
                      <div
                        style={{ fontSize: "0.8125rem", color: "var(--pp-text-muted)", marginBottom: 12 }}
                      >
                        {query.patient?.user?.name || "Anonymous"} · {fmtDateTime(query.created_at)}
                      </div>
                      <div
                        style={{
                          background: "var(--pp-background)",
                          padding: 12,
                          borderRadius: 6,
                          fontSize: "0.875rem",
                          color: "var(--pp-text-secondary)",
                          lineHeight: 1.7,
                          borderLeft: "3px solid var(--pp-primary)",
                        }}
                      >
                        {query.symptom_text || query.symptomText || "—"}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="pp-section">
                <h2 className="pp-section-title">
                  Responses ({(query.responses || []).length})
                </h2>
                {(query.responses || []).length === 0 ? (
                  <div className="pp-appointment-list">
                    <div className="pp-appointment-item">
                      <div className="pp-appointment-info">
                        <div className="pp-appointment-title">
                          No responses yet. Be the first to respond.
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="pp-appointment-list">
                    {(query.responses || []).map((r) => (
                      <div
                        key={r.id}
                        className="pp-appointment-item"
                        style={{ alignItems: "flex-start" }}
                      >
                        <div className="pp-appointment-icon">
                          <ChatBubbleLeftRightIcon style={{ width: 20, height: 20 }} />
                        </div>
                        <div className="pp-appointment-info">
                          <div className="pp-appointment-title">
                            {r.doctor?.user?.name || "Doctor"}
                          </div>
                          <div className="pp-appointment-meta">
                            {fmtDateTime(r.created_at || r.createdAt)}
                          </div>
                          <div
                            style={{
                              marginTop: 8,
                              fontSize: "0.875rem",
                              color: "var(--pp-text-secondary)",
                              lineHeight: 1.7,
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {r.response_text || r.responseText}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="pp-section">
                <h2 className="pp-section-title">Post Your Response</h2>
                <div className="pp-ai-container">
                  <div className="pp-chat-area">
                    <textarea
                      rows={5}
                      style={{
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        resize: "vertical",
                        fontSize: "0.875rem",
                        color: "var(--pp-text-primary)",
                        lineHeight: 1.7,
                      }}
                      placeholder="Write your medical response here…"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                    />
                  </div>
                  <div className="pp-chat-input-container">
                    <button
                      className="pp-btn pp-btn-primary"
                      onClick={submitAnswer}
                      disabled={submitting || !answer.trim()}
                    >
                      {submitting ? "Posting…" : "Post Response"}
                    </button>
                    <button className="pp-btn pp-btn-outline" onClick={() => setAnswer("")}>
                      Clear
                    </button>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <div className="pp-panel">Query not found.</div>
          )}
        </main>
      </div>
    </div>
  );
};

export default DoctorQueryDetail;
