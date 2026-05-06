import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeftIcon,
  ArrowUpIcon,
  ChatBubbleLeftIcon,
  CheckBadgeIcon,
  EyeIcon,
  PaperAirplaneIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { AppContext } from "../context/AppContext";
import { patientPortalApi } from "../utils/patientPortalApi";
import { toast } from "react-toastify";
import "./DiscussionDetail.css";

const initialsFromName = (name) => {
  const value = (name || "").trim();
  if (!value) return "HP";
  return (
    value.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || "").join("").slice(0, 2) ||
    "HP"
  );
};

const fmtDate = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const fmtRelative = (iso) => {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const normalizeThread = (q) => {
  const patientName = q?.isAnonymous ? "Anonymous Patient" : q?.patient?.user?.name || "Patient";
  const responses = Array.isArray(q?.responses)
    ? q.responses.map((r) => ({
        id: r.id,
        authorName: r?.doctor?.user?.name || "Doctor",
        authorRole: "doctor",
        authorInitials: initialsFromName(r?.doctor?.user?.name || "Doctor"),
        body: r.responseText || "",
        postedAt: r.createdAt || r.created_at,
        verified: !!r?.doctor?.isVerified,
        specialty: r?.doctor?.specialty || "",
      }))
    : [];
  return {
    id: q.id,
    title: q.title || "Untitled question",
    body: q.symptomText || q.symptom_text || "",
    authorName: patientName,
    authorInitials: initialsFromName(patientName),
    authorRole: "patient",
    category: q?.triageDecision?.recommendedSpecialty || "General Health",
    urgency: q?.triageDecision?.urgencyLevel || null,
    aiReasoning: q?.triageDecision?.aiReasoning || null,
    postedAt: q.createdAt || q.created_at,
    views: Number(q.viewCount || q.view_count || 0),
    responses,
    isResolved: !!q.isResolved,
    isAnonymous: !!q.isAnonymous,
  };
};

const urgencyColor = (u) => {
  if (u === "high") return "#ef4444";
  if (u === "moderate") return "#f59e0b";
  return "#22c55e";
};

export default function PublicChatDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { backendUrl, token, userData } = useContext(AppContext);

  // Determine if the logged-in user is a doctor
  const isDoctor = userData?.role === "doctor";

  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [posting, setPosting] = useState(false);

  const loadThread = async () => {
    setLoading(true);
    try {
      const data = await patientPortalApi.getPublicQueryById(backendUrl, id);
      const query = data?.query || data?.data || data;
      setThread(normalizeThread(query));
    } catch (err) {
      toast.error("Failed to load discussion");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadThread(); }, [backendUrl, id]);

  const handleSubmitResponse = async () => {
    if (!isDoctor || !replyText.trim() || !token) return;
    setPosting(true);
    try {
      await patientPortalApi.createForumResponse(backendUrl, token, id, {
        responseText: replyText.trim(),
        isAccepted: false,
      });
      setReplyText("");
      toast.success("Response posted");
      await loadThread();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to post response");
    } finally {
      setPosting(false);
    }
  };

  const responseCount = useMemo(() => thread?.responses?.length || 0, [thread]);

  if (loading) {
    return (
      <div className="dd-page">
        <div className="dd-container" style={{ maxWidth: 900, margin: "0 auto", padding: "4rem 1.5rem", textAlign: "center" }}>
          <div className="dd-not-found">Loading discussion...</div>
        </div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="dd-page">
        <div className="dd-container" style={{ maxWidth: 900, margin: "0 auto", padding: "4rem 1.5rem" }}>
          <div className="dd-not-found">
            <p style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "0.5rem" }}>Discussion not found</p>
            <p>This post may have been removed or does not exist.</p>
            <Link to="/public-queries" style={{ color: "#2563eb", marginTop: "1rem", display: "inline-block" }}>
              ← Back to Forum
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dd-page" style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <div className="dd-container" style={{ maxWidth: 1400, margin: "0 auto" }}>
        <main className="dd-main-content" style={{ marginLeft: 0, paddingTop: "1.5rem" }}>
          <Link to="/public-queries" className="dd-back-link">
            <ArrowLeftIcon style={{ width: 16, height: 16 }} /> Back to Public Forum
          </Link>

          <div className="dd-content-grid">
            {/* Left: post + responses */}
            <div>
              {/* Original post card */}
              <div className="dd-post-card">
                <div className="dd-post-inner">
                  <div className="dd-post-votes" aria-hidden="true">
                    <div className="dd-vote-count">{responseCount}</div>
                    <div style={{ fontSize: "0.675rem", color: "var(--dd-text-muted)" }}>responses</div>
                  </div>

                  <div className="dd-post-body">
                    <div className="dd-post-meta-row">
                      <span className="dd-category-badge">{thread.category}</span>
                      {thread.urgency && (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: urgencyColor(thread.urgency) + "20",
                            color: urgencyColor(thread.urgency),
                            border: `1px solid ${urgencyColor(thread.urgency)}40`,
                            textTransform: "capitalize",
                          }}
                        >
                          {thread.urgency} urgency
                        </span>
                      )}
                      {thread.isResolved && (
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "#dcfce7",
                            color: "#16a34a",
                            border: "1px solid #86efac",
                          }}
                        >
                          ✓ Resolved
                        </span>
                      )}
                      <div className="dd-author-chip">
                        <div className="dd-author-avatar">{thread.authorInitials}</div>
                        <span className="dd-author-name">{thread.authorName}</span>
                        <span className="dd-role-badge dd-role-patient">Patient</span>
                        {thread.isAnonymous && <span className="dd-doctor-verified">Anonymous</span>}
                      </div>
                      <span className="dd-post-date">{fmtDate(thread.postedAt)}</span>
                    </div>

                    <h1 className="dd-post-title">{thread.title}</h1>
                    <p className="dd-post-text">{thread.body}</p>

                    <div className="dd-post-actions">
                      <button className="dd-action-btn">
                        <ChatBubbleLeftIcon style={{ width: 15, height: 15 }} /> {responseCount} Responses
                      </button>
                      <button className="dd-action-btn">
                        <EyeIcon style={{ width: 15, height: 15 }} /> {thread.views.toLocaleString()} Views
                      </button>
                      <button className="dd-action-btn" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                        <ArrowUpIcon style={{ width: 15, height: 15 }} /> Jump to Top
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Triage insight (read-only) */}
              {thread.aiReasoning && (
                <div
                  style={{
                    margin: "1rem 0",
                    padding: "1rem 1.25rem",
                    background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
                    border: "1px solid #bfdbfe",
                    borderRadius: "0.625rem",
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ fontSize: "1.25rem" }}>🤖</div>
                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.35rem" }}>
                      AI Triage Insight
                    </div>
                    <p style={{ color: "#1e3a8a", fontSize: "0.875rem", lineHeight: 1.5, margin: 0 }}>
                      {thread.aiReasoning}
                    </p>
                  </div>
                </div>
              )}

              {/* Responses */}
              <div className="dd-comments-header">
                <div className="dd-comments-title">
                  {responseCount} Response{responseCount !== 1 ? "s" : ""}
                </div>
              </div>

              {responseCount === 0 ? (
                <div style={{ textAlign: "center", padding: "2.5rem", color: "var(--dd-text-muted)", background: "var(--dd-surface)", border: "1px solid var(--dd-border)", borderRadius: "0.5rem", fontSize: "0.875rem" }}>
                  No doctor responses yet. Check back later.
                </div>
              ) : (
                <div className="dd-comment-thread">
                  {thread.responses.map((r) => (
                    <div key={r.id} className="dd-comment">
                      <div className="dd-comment-inner">
                        <div className="dd-comment-votes" aria-hidden="true">
                          <div className="dd-cv-count">•</div>
                        </div>
                        <div className="dd-comment-body">
                          <div className="dd-comment-meta">
                            <div className="dd-author-avatar">{r.authorInitials}</div>
                            <span className="dd-comment-author">{r.authorName}</span>
                            <span className="dd-role-badge dd-role-doctor">Doctor</span>
                            {r.verified && (
                              <span className="dd-doctor-verified">
                                <CheckBadgeIcon style={{ width: 13, height: 13, display: "inline", verticalAlign: "middle" }} /> Verified
                              </span>
                            )}
                            {r.specialty && (
                              <span style={{ fontSize: "0.72rem", color: "#64748b" }}>{r.specialty}</span>
                            )}
                            <span className="dd-comment-time">{fmtRelative(r.postedAt)}</span>
                          </div>
                          <p className="dd-comment-text">{r.body}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Doctor reply box */}
              {isDoctor && token ? (
                <div className="dd-comment-box">
                  <div className="dd-comment-box-title">Add a doctor response</div>
                  <textarea
                    className="dd-comment-textarea"
                    placeholder="Share your clinical suggestion or next-step advice..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  <div className="dd-comment-box-actions">
                    <button
                      className="dd-btn dd-btn-primary"
                      onClick={handleSubmitResponse}
                      disabled={!replyText.trim() || posting}
                    >
                      <PaperAirplaneIcon style={{ width: 15, height: 15 }} />
                      {posting ? "Posting..." : "Post Response"}
                    </button>
                  </div>
                </div>
              ) : !token ? (
                <div
                  style={{
                    marginTop: "1.5rem",
                    padding: "1.25rem",
                    background: "#f8fafc",
                    border: "1px dashed #cbd5e1",
                    borderRadius: "0.625rem",
                    textAlign: "center",
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <LockClosedIcon style={{ width: 16, height: 16, color: "#94a3b8" }} />
                  <span style={{ color: "#64748b", fontSize: "0.875rem" }}>
                    <button
                      type="button"
                      onClick={() => navigate("/login")}
                      style={{ color: "#2563eb", background: "none", border: "none", cursor: "pointer", fontWeight: 600, padding: 0 }}
                    >
                      Sign in
                    </button>{" "}
                    as a doctor to reply to this question.
                  </span>
                </div>
              ) : null}
            </div>

            {/* Right: info panel */}
            <div className="dd-info-panel">
              <div className="dd-panel-header">About this Discussion</div>
              <div className="dd-panel-body">
                <div className="dd-stat-row">
                  <span className="dd-stat-label">Posted by</span>
                  <span className="dd-stat-value">{thread.authorName}</span>
                </div>
                <div className="dd-stat-row">
                  <span className="dd-stat-label">Date</span>
                  <span className="dd-stat-value">{fmtDate(thread.postedAt)}</span>
                </div>
                <div className="dd-stat-row">
                  <span className="dd-stat-label">Responses</span>
                  <span className="dd-stat-value">{responseCount}</span>
                </div>
                <div className="dd-stat-row">
                  <span className="dd-stat-label">Views</span>
                  <span className="dd-stat-value">{thread.views.toLocaleString()}</span>
                </div>
                <div className="dd-stat-row">
                  <span className="dd-stat-label">Category</span>
                  <span className="dd-stat-value">{thread.category}</span>
                </div>
                {thread.urgency && (
                  <div className="dd-stat-row">
                    <span className="dd-stat-label">AI Urgency</span>
                    <span
                      style={{
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: urgencyColor(thread.urgency) + "20",
                        color: urgencyColor(thread.urgency),
                        textTransform: "capitalize",
                      }}
                    >
                      {thread.urgency}
                    </span>
                  </div>
                )}

                <div className="dd-panel-divider" />

                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--dd-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                  Status
                </div>
                <div className="dd-panel-tag-list">
                  <span className="dd-panel-tag">{thread.isResolved ? "Resolved" : "Open"}</span>
                  <span className="dd-panel-tag">Public</span>
                  {thread.responses.some((r) => r.authorRole === "doctor") && (
                    <span className="dd-panel-tag">Doctor Answered</span>
                  )}
                </div>

                <div className="dd-panel-divider" />

                <Link to="/public-queries" style={{ textDecoration: "none" }}>
                  <button type="button" className="dd-btn dd-btn-secondary" style={{ width: "100%", justifyContent: "center" }}>
                    <ArrowLeftIcon style={{ width: 15, height: 15 }} /> Back to Forum
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
