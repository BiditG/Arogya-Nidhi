import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChatBubbleLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
  GlobeAltIcon,
  FireIcon,
  SparklesIcon,
  ClockIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";
import { AppContext } from "../context/AppContext";
import { patientPortalApi } from "../utils/patientPortalApi";
import { toast } from "react-toastify";
import "./HealthQueries.css";

const SORT_TABS = [
  { key: "Hot", icon: FireIcon, label: "Hot" },
  { key: "New", icon: ClockIcon, label: "New" },
  { key: "Top", icon: TrophyIcon, label: "Top" },
  { key: "Trending", icon: SparklesIcon, label: "Trending" },
];
const POSTS_PER_PAGE = 8;

const initialsFromName = (name) => {
  const value = (name || "").trim();
  if (!value) return "HP";
  return (
    value
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() || "")
      .join("")
      .slice(0, 2) || "HP"
  );
};

const fmtTime = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const normalizeQuery = (q) => {
  const patientName = q?.isAnonymous
    ? "Anonymous Patient"
    : q?.patient?.user?.name || "Patient";
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
    postedAt: q.createdAt || q.created_at,
    views: Number(q.viewCount || q.view_count || 0),
    responses,
    comments: responses.length,
    isResolved: !!q.isResolved,
    isAnonymous: !!q.isAnonymous,
  };
};

const urgencyColor = (u) => {
  if (u === "high") return "#ef4444";
  if (u === "moderate") return "#f59e0b";
  return "#22c55e";
};

const HERO_STATS = [
  { label: "Questions Asked", value: null, key: "total" },
  { label: "Doctor Responses", value: null, key: "responses" },
  { label: "Specialties Covered", value: null, key: "specialties" },
];

export default function PublicChat() {
  const { backendUrl, token, userData } = useContext(AppContext);
  const navigate = useNavigate();

  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortTab, setSortTab] = useState("Hot");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", excerpt: "", isAnonymous: false });
  const [posting, setPosting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await patientPortalApi.getPublicQueries(backendUrl, { page: 1, limit: 200 });
      const items = Array.isArray(res?.queries) ? res.queries : Array.isArray(res) ? res : [];
      setQueries(items.map(normalizeQuery));
    } catch (err) {
      console.error("Failed to load public queries", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [backendUrl]);

  const handleCreatePost = async () => {
    if (!newPost.title.trim() || !newPost.excerpt.trim()) return;
    if (!token) {
      toast.info("Please log in to post a question");
      navigate("/login");
      return;
    }
    setPosting(true);
    try {
      const created = await patientPortalApi.createForumQuery(backendUrl, token, {
        title: newPost.title.trim(),
        symptomText: newPost.excerpt.trim(),
        isAnonymous: !!newPost.isAnonymous,
      });
      setQueries((prev) => [normalizeQuery(created), ...prev]);
      setNewPost({ title: "", excerpt: "", isAnonymous: false });
      setShowModal(false);
      setCurrentPage(1);
      setSortTab("New");
      toast.success("Your question has been posted!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to post question");
    } finally {
      setPosting(false);
    }
  };

  const categories = useMemo(() => {
    const unique = Array.from(new Set(queries.map((q) => q.category).filter(Boolean)));
    return ["All", ...unique];
  }, [queries]);

  const filtered = queries.filter((q) => {
    if (categoryFilter !== "All" && q.category !== categoryFilter) return false;
    if (activeSearch) {
      const needle = activeSearch.toLowerCase();
      if (!q.title.toLowerCase().includes(needle) && !q.body.toLowerCase().includes(needle)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortTab === "Hot") return b.views + b.comments - (a.views + a.comments);
    if (sortTab === "New") return new Date(b.postedAt || 0) - new Date(a.postedAt || 0);
    if (sortTab === "Top") return b.comments - a.comments;
    if (sortTab === "Trending") return b.views - a.views;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / POSTS_PER_PAGE));
  const paginated = sorted.slice((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE);

  const totalResponses = queries.reduce((acc, q) => acc + q.comments, 0);
  const uniqueSpecialties = new Set(queries.map((q) => q.category).filter((c) => c !== "General Health")).size;

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Hero Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)",
          padding: "2rem 1rem 1.5rem",
          color: "#fff",
          textAlign: "center",
          maxWidth: 900,
          margin: "1.5rem auto 0",
          borderRadius: "1rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", gap: 8, alignItems: "center", marginBottom: "0.5rem" }}>
          <GlobeAltIcon style={{ width: 20, height: 20, opacity: 0.9 }} />
          <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", opacity: 0.85 }}>
            Public Health Forum
          </span>
        </div>
        <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 800, marginBottom: "0.5rem", lineHeight: 1.2 }}>
          Community Health Discussions
        </h1>
        <p style={{ fontSize: "0.9rem", opacity: 0.85, maxWidth: 600, margin: "0 auto 1.5rem" }}>
          Open to everyone. Ask health questions, read verified doctor responses, and help others in the community.
        </p>

        {/* Search bar inside hero */}
        <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", gap: 10, position: "relative" }}>
          <MagnifyingGlassIcon
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 18, height: 18, color: "#94a3b8", pointerEvents: "none" }}
          />
          <input
            type="text"
            placeholder="Search discussions, symptoms, conditions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { setActiveSearch(search); setCurrentPage(1); }
            }}
            style={{
              flex: 1,
              padding: "0.75rem 1rem 0.75rem 2.75rem",
              borderRadius: "0.625rem",
              border: "none",
              fontSize: "0.95rem",
              outline: "none",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            }}
          />
          <button
            type="button"
            onClick={() => { setActiveSearch(search); setCurrentPage(1); }}
            style={{
              background: "#fff",
              color: "#1e40af",
              fontWeight: 700,
              border: "none",
              borderRadius: "0.625rem",
              padding: "0.75rem 1.25rem",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            Search
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.5rem" }}>
        {/* Top bar: categories + new post button */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: "1.25rem", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`hq-category-tag ${categoryFilter === cat ? "hq-category-tag-active" : ""}`}
                onClick={() => { setCategoryFilter(cat); setCurrentPage(1); }}
              >
                {cat}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="hq-btn hq-btn-primary"
            onClick={() => {
              if (!token) { toast.info("Log in to post a question"); navigate("/login"); return; }
              setShowModal(true);
            }}
          >
            <PlusIcon style={{ width: 15, height: 15 }} />
            Ask a Question
          </button>
        </div>

        {/* Sort + count */}
        <div className="hq-sort-section" style={{ marginBottom: "1.25rem" }}>
          <div className="hq-sort-tabs">
            {SORT_TABS.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                type="button"
                className={`hq-sort-tab ${sortTab === key ? "hq-sort-tab-active" : ""}`}
                onClick={() => { setSortTab(key); setCurrentPage(1); }}
                style={{ display: "flex", alignItems: "center", gap: 5 }}
              >
                <Icon style={{ width: 13, height: 13 }} />
                {label}
              </button>
            ))}
          </div>
          <div className="hq-discussion-count">
            {activeSearch && (
              <button
                type="button"
                className="hq-btn hq-btn-secondary"
                style={{ fontSize: "0.78rem", padding: "3px 10px", marginRight: 8 }}
                onClick={() => { setSearch(""); setActiveSearch(""); setCurrentPage(1); }}
              >
                <XMarkIcon style={{ width: 12, height: 12 }} /> Clear
              </button>
            )}
            {sorted.length.toLocaleString()} Discussions
          </div>
        </div>

        {/* Discussion list */}
        {loading ? (
          <div className="hq-empty-state" style={{ padding: "3rem" }}>Loading discussions...</div>
        ) : paginated.length === 0 ? (
          <div className="hq-empty-state" style={{ padding: "3rem" }}>
            No discussions found.{" "}
            <button
              type="button"
              style={{ color: "#2563eb", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
              onClick={() => { if (!token) navigate("/login"); else setShowModal(true); }}
            >
              Be the first to ask!
            </button>
          </div>
        ) : (
          <div className="hq-discussion-list">
            {paginated.map((q) => (
              <div
                key={q.id}
                className="hq-discussion-card"
                style={{ cursor: "pointer" }}
                onClick={() => navigate(`/public-queries/${q.id}`)}
              >
                <div className="hq-discussion-content" style={{ width: "100%" }}>
                  <div className="hq-discussion-header">
                    <div className="hq-author-avatar">{q.authorInitials}</div>
                    <div className="hq-author-info">
                      <span className="hq-author-name">{q.authorName}</span>
                      <span className="hq-author-role hq-role-patient">Patient</span>
                      {q.postedAt && <span className="hq-post-time">{fmtTime(q.postedAt)}</span>}
                    </div>
                    {q.isResolved && (
                      <span
                        style={{
                          marginLeft: "auto",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          color: "#16a34a",
                          background: "#dcfce7",
                          border: "1px solid #86efac",
                          borderRadius: 999,
                          padding: "2px 10px",
                          letterSpacing: "0.03em",
                        }}
                      >
                        ✓ Resolved
                      </span>
                    )}
                  </div>

                  <h3 className="hq-discussion-title" style={{ marginTop: "0.5rem" }}>
                    {q.title}
                  </h3>
                  <p className="hq-discussion-excerpt">
                    {q.body.slice(0, 200)}{q.body.length > 200 ? "…" : ""}
                  </p>

                  <div className="hq-discussion-meta">
                    <span className="hq-category-badge">{q.category}</span>
                    {q.urgency && (
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: urgencyColor(q.urgency) + "20",
                          color: urgencyColor(q.urgency),
                          border: `1px solid ${urgencyColor(q.urgency)}40`,
                          textTransform: "capitalize",
                        }}
                      >
                        {q.urgency} urgency
                      </span>
                    )}
                    <span className="hq-meta-item">
                      <ChatBubbleLeftIcon style={{ width: 13, height: 13, display: "inline", verticalAlign: "middle" }} />{" "}
                      {q.comments} {q.comments === 1 ? "Response" : "Responses"}
                    </span>
                    <span className="hq-meta-item">
                      <EyeIcon style={{ width: 13, height: 13, display: "inline", verticalAlign: "middle" }} />{" "}
                      {q.views.toLocaleString()} Views
                    </span>
                    <button
                      type="button"
                      className="hq-btn hq-btn-secondary hq-btn-sm hq-view-btn"
                      onClick={(e) => { e.stopPropagation(); navigate(`/public-queries/${q.id}`); }}
                    >
                      View Discussion
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="hq-pagination" style={{ marginTop: "1.5rem" }}>
            <button
              type="button"
              className="hq-page-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              <ChevronLeftIcon style={{ width: 14, height: 14 }} /> Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                className={`hq-page-btn ${currentPage === n ? "hq-page-btn-active" : ""}`}
                onClick={() => setCurrentPage(n)}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              className="hq-page-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Next <ChevronRightIcon style={{ width: 14, height: 14 }} />
            </button>
          </div>
        )}

        {/* Not logged in CTA */}
        {!token && (
          <div
            style={{
              marginTop: "2.5rem",
              padding: "1.75rem",
              background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
              borderRadius: "1rem",
              border: "1px solid #bfdbfe",
              textAlign: "center",
            }}
          >
            <h3 style={{ color: "#1e40af", fontWeight: 700, marginBottom: "0.5rem" }}>
              Have a health question?
            </h3>
            <p style={{ color: "#3b82f6", fontSize: "0.9rem", marginBottom: "1rem" }}>
              Sign in to post your question and get responses from verified doctors.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              <button
                type="button"
                className="hq-btn hq-btn-primary"
                onClick={() => navigate("/login")}
              >
                Sign In
              </button>
              <button
                type="button"
                className="hq-btn hq-btn-secondary"
                onClick={() => navigate("/login")}
              >
                Create Account
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Post Modal */}
      {showModal && (
        <div
          className="hq-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="hq-modal">
            <div className="hq-modal-header">
              <div className="hq-modal-title">Ask a Health Question</div>
              <button type="button" className="hq-modal-close" onClick={() => setShowModal(false)}>
                <XMarkIcon style={{ width: 18, height: 18 }} />
              </button>
            </div>
            <div className="hq-form-group">
              <label className="hq-form-label">Title</label>
              <input
                type="text"
                className="hq-form-input"
                placeholder="Ask a question about your health..."
                value={newPost.title}
                onChange={(e) => setNewPost((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="hq-form-group">
              <label className="hq-form-label">Description</label>
              <textarea
                className="hq-form-textarea"
                placeholder="Describe your symptoms or concern in detail..."
                value={newPost.excerpt}
                onChange={(e) => setNewPost((p) => ({ ...p, excerpt: e.target.value }))}
              />
            </div>
            <label className="hq-form-group" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={newPost.isAnonymous}
                onChange={(e) => setNewPost((p) => ({ ...p, isAnonymous: e.target.checked }))}
              />
              <span className="hq-form-label" style={{ marginBottom: 0 }}>Post anonymously</span>
            </label>
            <div className="hq-modal-actions">
              <button type="button" className="hq-btn hq-btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="hq-btn hq-btn-primary"
                onClick={handleCreatePost}
                disabled={!newPost.title.trim() || !newPost.excerpt.trim() || posting}
              >
                {posting ? "Posting..." : "Post Question"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
