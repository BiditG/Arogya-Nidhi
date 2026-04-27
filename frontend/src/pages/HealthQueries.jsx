import { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PatientSidebar from "../components/PatientSidebar";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  ChatBubbleLeftIcon,
  EyeIcon,
  PlusIcon,
  ArrowLeftIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { AppContext } from "../context/AppContext";
import { patientPortalApi } from "../utils/patientPortalApi";
import { usePosts } from "../context/PostsContext";
import "./HealthQueries.css";

const CATEGORIES = ["All", "Cardiology", "Neurology", "Dermatology", "Orthopedics", "General Health", "Nutrition", "Mental Health"];
const SORT_TABS = ["Hot", "New", "Top", "Trending"];
const POSTS_PER_PAGE = 5;

const HealthQueries = () => {
  const { setToken } = useContext(AppContext);
  const { posts, addPost, votePost } = usePosts();
  const { backendUrl, token, userData } = useContext(AppContext);
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortTab, setSortTab] = useState("Hot");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", category: "General Health", excerpt: "" });

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(false);
  };

  const handleCreatePost = () => {
    if (!newPost.title.trim() || !newPost.excerpt.trim()) return;
    if (newPost.title.trim().length < 3) {
      // Client-side guard to match backend validation
      console.error('Title must be at least 3 characters');
      return;
    }
    // Create via API when logged in as patient
    if (token) {
      patientPortalApi.createQuery(backendUrl, token, {
        title: newPost.title.trim(),
        symptomText: newPost.excerpt.trim(),
        isAnonymous: false,
      }).then((created) => {
        // Refresh list
        loadQueries();
      }).catch((err) => {
        console.error('Create query failed', err);
      });
    } else {
      addPost({
        id: Date.now(),
        authorInitials: "Me",
        authorName: "You",
        authorRole: "patient",
        title: newPost.title.trim(),
        body: newPost.excerpt.trim(),
        excerpt: newPost.excerpt.trim(),
        category: newPost.category,
        comments: 0,
        views: "0",
        votes: 1,
        userVote: "up",
        postedAt: new Date().toISOString(),
        comments_data: [],
      });
    }
    setNewPost({ title: "", category: "General Health", excerpt: "" });
    setShowModal(false);
    setSortTab("New");
    setCurrentPage(1);
  };

  const [queries, setQueries] = useState([]);

  const loadQueries = async () => {
    if (!token) return;
    try {
      const res = await patientPortalApi.getQueries(backendUrl, token, { page: 1, limit: 50 });
      setQueries(res.queries || []);
    } catch (err) {
      console.error('Failed to load queries', err);
    }
  };

  useEffect(() => {
    loadQueries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const mapApiToPost = (q) => {
    const author = q.patient?.user || { name: 'Anonymous' };
    return {
      id: q.id,
      authorInitials: (author.name || '').split(' ').map(s => s[0]).slice(0,2).join('') || 'P',
      authorName: q.isAnonymous ? 'Anonymous' : (author.name || 'Patient'),
      authorRole: 'patient',
      title: q.title,
      body: q.symptomText || '',
      excerpt: (q.symptomText || '').slice(0,200),
      category: 'Health',
      comments: (q.responses || []).length,
      views: q.view_count || 0,
      votes: 0,
      userVote: null,
      postedAt: q.created_at,
      comments_data: (q.responses || []).map((r) => ({
        id: r.id,
        authorInitials: (r.doctor?.user?.name || 'Dr').split(' ').map(s=>s[0]).slice(0,2).join(''),
        authorName: r.doctor?.user?.name || 'Doctor',
        authorRole: 'doctor',
        body: r.responseText || '',
        votes: r.isAccepted ? 1 : 0,
        userVote: null,
        postedAt: r.createdAt,
        replies: [],
      })),
    };
  };

  const source = token ? queries.map(mapApiToPost) : posts;

  const filtered = source.filter((p) => {
    if (categoryFilter !== "All" && p.category !== categoryFilter) return false;
    if (activeSearch) {
      const q = activeSearch.toLowerCase();
      const body = p.body || p.excerpt || "";
      if (!p.title.toLowerCase().includes(q) && !body.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortTab === "Hot")      return (b.votes + b.comments) - (a.votes + a.comments);
    if (sortTab === "New")      return b.id - a.id;
    if (sortTab === "Top")      return b.votes - a.votes;
    if (sortTab === "Trending") return b.comments - a.comments;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / POSTS_PER_PAGE));
  const paginated = sorted.slice((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE);

  const roleClass = (r) => r === "doctor" ? "hq-role-doctor" : r === "student" ? "hq-role-student" : "hq-role-patient";
  const roleLabel = (r) => r === "doctor" ? "Doctor" : r === "student" ? "Student" : "Patient";

  const fmtTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="hq-page">
      <header className="hq-header">
        <Link to="/patient-portal" className="hq-logo">PATIENT PORTAL</Link>
        <nav>
          <ul className="hq-nav-top">
            <li><Link to="/patient-portal">Dashboard</Link></li>
            <li><Link to="/patient-portal/profile">Profile</Link></li>
            <li><a href="#">Settings</a></li>
            <li><button type="button" className="hq-link-button" onClick={handleLogout}>Logout</button></li>
          </ul>
        </nav>
      </header>

      <div className="hq-container">
        <PatientSidebar />

        <main className="hq-main-content">
          <Link to="/patient-portal" className="hq-back-link"><ArrowLeftIcon style={{ width: 16, height: 16 }} /> Back to Dashboard</Link>

          <div className="hq-page-header">
            <h1 className="hq-page-title">Health Discussion Forum</h1>
            <button type="button" className="hq-btn hq-btn-primary" onClick={() => setShowModal(true)}>
              <PlusIcon style={{ width: 16, height: 16 }} /> Create New Post
            </button>
          </div>

          <div className="hq-search-container">
            <input
              type="text"
              className="hq-search-input"
              placeholder="Search discussions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setActiveSearch(search); setCurrentPage(1); } }}
            />
            <select className="hq-filter-select" value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <button type="button" className="hq-btn hq-btn-primary" onClick={() => { setActiveSearch(search); setCurrentPage(1); }}>
              Search
            </button>
            {activeSearch && (
              <button type="button" className="hq-btn hq-btn-secondary" onClick={() => { setSearch(""); setActiveSearch(""); setCurrentPage(1); }}>
                Clear
              </button>
            )}
          </div>

          <div className="hq-category-list">
            {CATEGORIES.map((c) => (
              <button key={c} type="button"
                className={`hq-category-tag ${categoryFilter === c ? "hq-category-tag-active" : ""}`}
                onClick={() => { setCategoryFilter(c); setCurrentPage(1); }}>
                {c}
              </button>
            ))}
          </div>

          <div className="hq-sort-section">
            <div className="hq-sort-tabs">
              {SORT_TABS.map((t) => (
                <button key={t} type="button"
                  className={`hq-sort-tab ${sortTab === t ? "hq-sort-tab-active" : ""}`}
                  onClick={() => { setSortTab(t); setCurrentPage(1); }}>
                  {t}
                </button>
              ))}
            </div>
            <div className="hq-discussion-count">{sorted.length.toLocaleString()} Discussions</div>
          </div>

          <div className="hq-discussion-list">
            {paginated.length === 0 ? (
              <div className="hq-empty-state">No discussions found. Be the first to post!</div>
            ) : (
              paginated.map((post) => (
                <div key={post.id} className="hq-discussion-card">
                  <div className="hq-vote-section">
                    <button type="button" className={`hq-vote-btn ${post.userVote === "up" ? "hq-vote-btn-up-active" : ""}`} onClick={() => votePost(post.id, "up")}><ChevronUpIcon style={{ width: 16, height: 16 }} /></button>
                    <div className="hq-vote-count">{post.votes}</div>
                    <button type="button" className={`hq-vote-btn ${post.userVote === "down" ? "hq-vote-btn-down-active" : ""}`} onClick={() => votePost(post.id, "down")}><ChevronDownIcon style={{ width: 16, height: 16 }} /></button>
                  </div>

                  <div className="hq-discussion-content">
                    <div className="hq-discussion-header">
                      <div className="hq-author-avatar">{post.authorInitials}</div>
                      <div className="hq-author-info">
                        <span className="hq-author-name">{post.authorName}</span>
                        <span className={`hq-author-role ${roleClass(post.authorRole)}`}>{roleLabel(post.authorRole)}</span>
                        {post.postedAt && <span className="hq-post-time">{fmtTime(post.postedAt)}</span>}
                      </div>
                    </div>

                    <h3
                      className="hq-discussion-title hq-clickable-title"
                      onClick={() => navigate(`/patient-portal/health-queries/${post.id}`)}
                    >
                      {post.title}
                    </h3>
                    <p className="hq-discussion-excerpt">{post.body ? post.body.slice(0, 200) + (post.body.length > 200 ? "…" : "") : ""}</p>

                    <div className="hq-discussion-meta">
                      <span className="hq-category-badge">{post.category}</span>
                      <span className="hq-meta-item"><ChatBubbleLeftIcon style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle" }} /> {post.comments} Comments</span>
                      <span className="hq-meta-item"><EyeIcon style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle" }} /> {post.views} Views</span>
                      <button
                        type="button"
                        className="hq-btn hq-btn-secondary hq-btn-sm hq-view-btn"
                        onClick={() => navigate(`/patient-portal/health-queries/${post.id}`)}
                      >
                        View Discussion
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <div className="hq-pagination">
              <button type="button" className="hq-page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}><ChevronLeftIcon style={{ width: 14, height: 14 }} /> Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" className={`hq-page-btn ${currentPage === n ? "hq-page-btn-active" : ""}`} onClick={() => setCurrentPage(n)}>{n}</button>
              ))}
              <button type="button" className="hq-page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>Next <ChevronRightIcon style={{ width: 14, height: 14 }} /></button>
            </div>
          )}
        </main>
      </div>

      {showModal && (
        <div className="hq-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="hq-modal">
            <div className="hq-modal-header">
              <div className="hq-modal-title">Create New Discussion</div>
              <button type="button" className="hq-modal-close" onClick={() => setShowModal(false)}><XMarkIcon style={{ width: 18, height: 18 }} /></button>
            </div>
            <div className="hq-form-group">
              <label className="hq-form-label">Title</label>
              <input type="text" className="hq-form-input" placeholder="Ask a question or start a discussion..." value={newPost.title} onChange={(e) => setNewPost((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="hq-form-group">
              <label className="hq-form-label">Category</label>
              <select className="hq-form-select" value={newPost.category} onChange={(e) => setNewPost((p) => ({ ...p, category: e.target.value }))}>
                {CATEGORIES.filter((c) => c !== "All").map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="hq-form-group">
              <label className="hq-form-label">Description</label>
              <textarea className="hq-form-textarea" placeholder="Describe your question in detail..." value={newPost.excerpt} onChange={(e) => setNewPost((p) => ({ ...p, excerpt: e.target.value }))} />
            </div>
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
