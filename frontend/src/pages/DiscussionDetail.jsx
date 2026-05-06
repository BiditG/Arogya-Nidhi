import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import DoctorSidebar from "../components/DoctorSidebar";
import PatientSidebar from "../components/PatientSidebar";
import { ArrowLeftIcon, ArrowUpIcon, ChatBubbleLeftIcon, CheckBadgeIcon, EyeIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { AppContext } from "../context/AppContext";
import { patientPortalApi } from "../utils/patientPortalApi";
import { toast } from "react-toastify";
import "./DiscussionDetail.css";

const ROLE_META = {
  patient: {
    title: "PATIENT PORTAL",
    backLink: "/patient-portal",
    dashboardLink: "/patient-portal",
    profileLink: "/patient-portal/profile",
    sidebar: PatientSidebar,
  },
  doctor: {
    title: "DOCTOR PORTAL",
    backLink: "/doctor-portal",
    dashboardLink: "/doctor-portal",
    profileLink: "/doctor-portal",
    sidebar: DoctorSidebar,
  },
  student: {
    title: "STUDENT PORTAL",
    backLink: "/student-portal",
    dashboardLink: "/student-portal",
    profileLink: "/student-portal",
    sidebar: null,
  },
};

const initialsFromName = (name) => {
  const value = (name || "").trim();
  if (!value) return "HP";
  return value.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("").slice(0, 2) || "HP";
};

const fmtDate = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const fmtRelative = (iso) => {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const roleClass = (role) => (role === "doctor" ? "dd-role-doctor" : role === "student" ? "dd-role-student" : "dd-role-patient");
const roleLabel = (role) => (role === "doctor" ? "Doctor" : role === "student" ? "Student" : "Patient");

const normalizeThread = (query) => {
  const patientName = query?.isAnonymous ? "Anonymous Patient" : query?.patient?.user?.name || "Patient";
  const responses = Array.isArray(query?.responses)
    ? query.responses.map((response) => ({
        id: response.id,
        authorName: response?.doctor?.user?.name || "Doctor",
        authorRole: "doctor",
        authorInitials: initialsFromName(response?.doctor?.user?.name || "Doctor"),
        body: response.responseText || "",
        postedAt: response.createdAt || response.created_at,
        verified: !!response?.doctor?.isVerified,
        specialty: response?.doctor?.specialty || "",
      }))
    : [];

  return {
    id: query.id,
    title: query.title || "Untitled question",
    body: query.symptomText || "",
    authorName: patientName,
    authorInitials: initialsFromName(patientName),
    authorRole: "patient",
    category: query?.triageDecision?.recommendedSpecialty || "General Health",
    postedAt: query.createdAt || query.created_at,
    views: Number(query.viewCount || query.view_count || 0),
    responses,
    isResolved: !!query.isResolved,
    isAnonymous: !!query.isAnonymous,
  };
};

const DiscussionDetail = ({ mode = "patient" }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, backendUrl, setToken, setUserData } = useContext(AppContext);

  const role = ROLE_META[mode] ? mode : "patient";
  const meta = ROLE_META[role];
  const Sidebar = meta.sidebar;

  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [posting, setPosting] = useState(false);

  const canRespond = role === "doctor";

  const loadThread = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await patientPortalApi.getForumQueryById(backendUrl, token, role, id);
      const query = data?.query || data?.data || data;
      setThread(normalizeThread(query));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load discussion");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendUrl, id, role, token]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(false);
    setUserData(false);
    navigate("/login");
  };

  const handleSubmitResponse = async () => {
    if (!canRespond || !replyText.trim()) return;

    setPosting(true);
    try {
      await patientPortalApi.createForumResponse(backendUrl, token, id, {
        responseText: replyText.trim(),
        isAccepted: false,
      });
      setReplyText("");
      toast.success("Response posted");
      await loadThread();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to post response");
    } finally {
      setPosting(false);
    }
  };

  const responseCount = useMemo(() => thread?.responses?.length || 0, [thread]);

  return (
    <div className="dd-page">


      <div className="dd-container">
        {Sidebar ? <Sidebar /> : null}

        <main className="dd-main-content">
          <Link to={`${meta.backLink}/health-queries`} className="dd-back-link"><ArrowLeftIcon style={{ width: 16, height: 16 }} /> Back to Forum</Link>

          {loading ? (
            <div className="dd-not-found"><p>Loading discussion...</p></div>
          ) : !thread ? (
            <div className="dd-not-found">
              <p style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "0.5rem" }}>Discussion not found</p>
              <p>This post may have been removed or does not exist.</p>
            </div>
          ) : (
            <div className="dd-content-grid">
              <div>
                <div className="dd-post-card">
                  <div className="dd-post-inner">
                    <div className="dd-post-votes" aria-hidden="true">
                      <div className="dd-vote-count">{responseCount}</div>
                      <div style={{ fontSize: "0.675rem", color: "var(--dd-text-muted)" }}>responses</div>
                    </div>

                    <div className="dd-post-body">
                      <div className="dd-post-meta-row">
                        <span className="dd-category-badge">{thread.category}</span>
                        <div className="dd-author-chip">
                          <div className="dd-author-avatar">{thread.authorInitials}</div>
                          <span className="dd-author-name">{thread.authorName}</span>
                          <span className={`dd-role-badge ${roleClass(thread.authorRole)}`}>{roleLabel(thread.authorRole)}</span>
                          {thread.isAnonymous && <span className="dd-doctor-verified">Anonymous</span>}
                        </div>
                        <span className="dd-post-date">{fmtDate(thread.postedAt)}</span>
                      </div>

                      <h1 className="dd-post-title">{thread.title}</h1>
                      <p className="dd-post-text">{thread.body}</p>

                      <div className="dd-post-actions">
                        <button className="dd-action-btn"><ChatBubbleLeftIcon style={{ width: 15, height: 15 }} /> {responseCount} Responses</button>
                        <button className="dd-action-btn"><EyeIcon style={{ width: 15, height: 15 }} /> {thread.views.toLocaleString()} Views</button>
                        <button className="dd-action-btn" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                          <ArrowUpIcon style={{ width: 15, height: 15 }} /> Jump to Top
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="dd-comments-header">
                  <div className="dd-comments-title">
                    {responseCount} Response{responseCount !== 1 ? "s" : ""}
                  </div>
                </div>

                {responseCount === 0 ? (
                  <div style={{ textAlign: "center", padding: "2.5rem", color: "var(--dd-text-muted)", background: "var(--dd-surface)", border: "1px solid var(--dd-border)", borderRadius: "0.5rem", fontSize: "0.875rem" }}>
                    No responses yet. {canRespond ? "Share the first doctor suggestion." : "Check back after a doctor replies."}
                  </div>
                ) : (
                  <div className="dd-comment-thread">
                    {thread.responses.map((response) => (
                      <div key={response.id} className="dd-comment">
                        <div className="dd-comment-inner">
                          <div className="dd-comment-votes" aria-hidden="true">
                            <div className="dd-cv-count">•</div>
                          </div>

                          <div className="dd-comment-body">
                            <div className="dd-comment-meta">
                              <div className="dd-author-avatar">{response.authorInitials}</div>
                              <span className="dd-comment-author">{response.authorName}</span>
                              <span className={`dd-role-badge ${roleClass(response.authorRole)}`}>{roleLabel(response.authorRole)}</span>
                              {response.verified && <span className="dd-doctor-verified"><CheckBadgeIcon style={{ width: 13, height: 13, display: "inline", verticalAlign: "middle" }} /> Verified Doctor</span>}
                              <span className="dd-comment-time">{fmtRelative(response.postedAt)}</span>
                            </div>
                            <p className="dd-comment-text">{response.body}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {canRespond && (
                  <div className="dd-comment-box">
                    <div className="dd-comment-box-title">Add a doctor response</div>
                    <textarea className="dd-comment-textarea" placeholder="Share your clinical suggestion or next-step advice..." value={replyText} onChange={(event) => setReplyText(event.target.value)} />
                    <div className="dd-comment-box-actions">
                      <button className="dd-btn dd-btn-primary" onClick={handleSubmitResponse} disabled={!replyText.trim() || posting}>
                        <PaperAirplaneIcon style={{ width: 15, height: 15 }} /> {posting ? "Posting..." : "Post Response"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

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

                  <div className="dd-panel-divider" />

                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--dd-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                    Status
                  </div>
                  <div className="dd-panel-tag-list">
                    <span className="dd-panel-tag">{thread.isResolved ? "Resolved" : "Open"}</span>
                    <span className="dd-panel-tag">{roleLabel(thread.authorRole)}</span>
                    {thread.responses.some((response) => response.authorRole === "doctor") && <span className="dd-panel-tag">Doctor Answered</span>}
                  </div>

                  <div className="dd-panel-divider" />

                  <Link to={`${meta.backLink}/health-queries`} style={{ textDecoration: "none" }}>
                    <button type="button" className="dd-btn dd-btn-secondary" style={{ width: "100%", justifyContent: "center" }}>
                      <ArrowLeftIcon style={{ width: 15, height: 15 }} /> Back to Forum
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default DiscussionDetail;
