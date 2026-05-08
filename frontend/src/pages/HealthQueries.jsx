import { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeftIcon, ChatBubbleLeftIcon, EyeIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import DoctorSidebar from "../components/DoctorSidebar";
import PatientSidebar from "../components/PatientSidebar";
import PageChanger from "../components/PageChanger";
import { AppContext } from "../context/AppContext";
import { patientPortalApi } from "../utils/patientPortalApi";
import { toast } from "react-toastify";
import "./HealthQueries.css";

const SORT_TABS = ["Hot", "New", "Top", "Trending"];
const POSTS_PER_PAGE = 5;

const ROLE_META = {
  patient: {
    title: "PATIENT PORTAL",
    backLink: "/patient-portal",
    dashboardLink: "/patient-portal",
    profileLink: "/patient-portal/profile",
    sidebar: PatientSidebar,
    label: "Patient",
  },
  doctor: {
    title: "DOCTOR PORTAL",
    backLink: "/doctor-portal",
    dashboardLink: "/doctor-portal",
    profileLink: "/doctor-portal",
    sidebar: DoctorSidebar,
    label: "Doctor",
  },
  student: {
    title: "STUDENT PORTAL",
    backLink: "/student-portal",
    dashboardLink: "/student-portal",
    profileLink: "/student-portal",
    sidebar: null,
    label: "Student",
  },
};

const initialsFromName = (name) => {
  const value = (name || "").trim();
  if (!value) return "HP";
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 2) || "HP";
};

const fmtTime = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const normalizeQuery = (query) => {
  const isAnonymous = !!(query?.isAnonymous ?? query?.is_anonymous);
  const patientName = isAnonymous ? "Anonymous Patient" : query?.patient?.user?.name || "Patient";
  const responses = Array.isArray(query?.responses)
    ? query.responses.map((response) => ({
        id: response.id,
        authorName: response?.doctor?.user?.name || "Doctor",
        authorRole: "doctor",
        authorInitials: initialsFromName(response?.doctor?.user?.name || "Doctor"),
        body: response.responseText || "",
        postedAt: response.createdAt || response.created_at,
        specialty: response?.doctor?.specialty || "",
        verified: !!response?.doctor?.isVerified,
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
    comments: responses.length,
    isResolved: !!(query.isResolved ?? query.is_resolved),
    isAnonymous,
    triageDecision: query.triageDecision || null,
  };
};

const roleClass = (role) => (role === "doctor" ? "hq-role-doctor" : role === "student" ? "hq-role-student" : "hq-role-patient");
const roleLabel = (role) => (role === "doctor" ? "Doctor" : role === "student" ? "Student" : "Patient");

const HealthQueries = ({ mode = "patient" }) => {
  const { token, backendUrl } = useContext(AppContext);
  const navigate = useNavigate();

  const role = ROLE_META[mode] ? mode : "patient";
  const meta = ROLE_META[role];
  const Sidebar = meta.sidebar;

  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortTab, setSortTab] = useState("Hot");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", excerpt: "", isAnonymous: false });

  useEffect(() => {
    if (!token) return;

    const loadQueries = async () => {
      setLoading(true);
      try {
        const data = role === "patient"
          ? await patientPortalApi.getQueries(backendUrl, token, { page: 1, limit: 100 })
          : await patientPortalApi.getForumQueries(backendUrl, token, role, { page: 1, limit: 100 });
        const items = Array.isArray(data?.queries) ? data.queries : Array.isArray(data) ? data : [];
        setQueries(items.map(normalizeQuery));
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load health queries");
      } finally {
        setLoading(false);
      }
    };

    loadQueries();
  }, [backendUrl, role, token]);


  const handleCreatePost = async () => {
    if (!newPost.title.trim() || !newPost.excerpt.trim()) return;

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
      toast.success("Discussion posted");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create discussion");
    }
  };

  const categories = useMemo(() => {
    const unique = Array.from(new Set(queries.map((query) => query.category).filter(Boolean)));
    return ["All", ...unique];
  }, [queries]);

  const filtered = queries.filter((query) => {
    if (categoryFilter !== "All" && query.category !== categoryFilter) return false;
    if (activeSearch) {
      const needle = activeSearch.toLowerCase();
      if (!query.title.toLowerCase().includes(needle) && !query.body.toLowerCase().includes(needle)) {
        return false;
      }
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

  return (
    <div className={`hq-page hq-theme-portal hq-mode-${role}`}>
      <div className="hq-container">
        {Sidebar ? <Sidebar /> : null}

        <main className={`hq-main-content${Sidebar ? "" : " hq-main-content-full"}`}>
          <Link to={meta.backLink} className="hq-back-link"><ArrowLeftIcon style={{ width: 16, height: 16 }} /> Back</Link>

          <div className="hq-page-header">
            <h1 className="hq-page-title">Health Discussion Forum</h1>
            {role === "patient" && (
              <button type="button" className="hq-btn hq-btn-primary" onClick={() => setShowModal(true)}>
                <PlusIcon style={{ width: 16, height: 16 }} /> Create New Post
              </button>
            )}
          </div>

          <div className="hq-search-container">
            <input
              type="text"
              className="hq-search-input"
              placeholder="Search discussions..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  setActiveSearch(search);
                  setCurrentPage(1);
                }
              }}
            />
            <select
              className="hq-filter-select"
              value={categoryFilter}
              onChange={(event) => {
                setCategoryFilter(event.target.value);
                setCurrentPage(1);
              }}
            >
              {categories.map((category) => <option key={category}>{category}</option>)}
            </select>
            <button type="button" className="hq-btn hq-btn-primary" onClick={() => { setActiveSearch(search); setCurrentPage(1); }}>Search</button>
            {activeSearch && (
              <button type="button" className="hq-btn hq-btn-secondary" onClick={() => { setSearch(""); setActiveSearch(""); setCurrentPage(1); }}>
                Clear
              </button>
            )}
          </div>

          <div className="hq-category-list">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`hq-category-tag ${categoryFilter === category ? "hq-category-tag-active" : ""}`}
                onClick={() => { setCategoryFilter(category); setCurrentPage(1); }}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="hq-sort-section">
            <div className="hq-sort-tabs">
              {SORT_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`hq-sort-tab ${sortTab === tab ? "hq-sort-tab-active" : ""}`}
                  onClick={() => { setSortTab(tab); setCurrentPage(1); }}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="hq-discussion-count">{sorted.length.toLocaleString()} Discussions</div>
          </div>

          {loading ? (
            <div className="hq-empty-state">Loading discussions...</div>
          ) : (
            <div className="hq-discussion-list">
              {paginated.length === 0 ? (
                <div className="hq-empty-state">No discussions found. Be the first to post!</div>
              ) : (
                paginated.map((query) => (
                  <div key={query.id} className="hq-discussion-card">
                    <div className="hq-discussion-content" style={{ width: "100%" }}>
                      <div className="hq-discussion-header">
                        <div className="hq-author-avatar">{query.authorInitials}</div>
                        <div className="hq-author-info">
                          <span className="hq-author-name">{query.authorName}</span>
                          <span className={`hq-author-role ${roleClass(query.authorRole)}`}>{roleLabel(query.authorRole)}</span>
                          {query.postedAt && <span className="hq-post-time">{fmtTime(query.postedAt)}</span>}
                        </div>
                      </div>

                      <h3 className="hq-discussion-title hq-clickable-title" onClick={() => navigate(`${meta.backLink}/health-queries/${query.id}`)}>
                        {query.title}
                      </h3>
                      <p className="hq-discussion-excerpt">{query.body.slice(0, 220)}{query.body.length > 220 ? "…" : ""}</p>

                      <div className="hq-discussion-meta">
                        <span className="hq-category-badge">{query.category}</span>
                        <span className="hq-meta-item"><ChatBubbleLeftIcon style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle" }} /> {query.comments} Responses</span>
                        <span className="hq-meta-item"><EyeIcon style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle" }} /> {query.views.toLocaleString()} Views</span>
                        <button type="button" className="hq-btn hq-btn-secondary hq-btn-sm hq-view-btn" onClick={() => navigate(`${meta.backLink}/health-queries/${query.id}`)}>
                          View Discussion
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <PageChanger currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </main>
      </div>

      {showModal && role === "patient" && (
        <div className="hq-modal-overlay" onClick={(event) => event.target === event.currentTarget && setShowModal(false)}>
          <div className="hq-modal">
            <div className="hq-modal-header">
              <div className="hq-modal-title">Create New Discussion</div>
              <button type="button" className="hq-modal-close" onClick={() => setShowModal(false)}><XMarkIcon style={{ width: 18, height: 18 }} /></button>
            </div>
            <div className="hq-form-group">
              <label className="hq-form-label">Title</label>
              <input type="text" className="hq-form-input" placeholder="Ask a question about your health..." value={newPost.title} onChange={(event) => setNewPost((previous) => ({ ...previous, title: event.target.value }))} />
            </div>
            <div className="hq-form-group">
              <label className="hq-form-label">Description</label>
              <textarea className="hq-form-textarea" placeholder="Describe your difficulty in detail..." value={newPost.excerpt} onChange={(event) => setNewPost((previous) => ({ ...previous, excerpt: event.target.value }))} />
            </div>
            <label className="hq-form-group" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input type="checkbox" checked={newPost.isAnonymous} onChange={(event) => setNewPost((previous) => ({ ...previous, isAnonymous: event.target.checked }))} />
              <span className="hq-form-label" style={{ marginBottom: 0 }}>Post anonymously</span>
            </label>
            <div className="hq-modal-actions">
              <button type="button" className="hq-btn hq-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="button" className="hq-btn hq-btn-primary" onClick={handleCreatePost} disabled={!newPost.title.trim() || !newPost.excerpt.trim()}>Post Discussion</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthQueries;
