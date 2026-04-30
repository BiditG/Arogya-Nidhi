import { useContext, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PatientSidebar from "../components/PatientSidebar";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  CheckBadgeIcon,
  ChatBubbleLeftIcon,
  ShareIcon,
  BookmarkIcon,
  BookmarkSlashIcon,
  FlagIcon,
  MinusIcon,
  PlusIcon,
  EllipsisHorizontalIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
} from "@heroicons/react/24/outline";
import { AppContext } from "../context/AppContext";
import { usePosts } from "../context/PostsContext";
import { patientPortalApi } from "../utils/patientPortalApi";
import "./DiscussionDetail.css";

const SORT_OPTIONS = ["Best", "Top", "New", "Controversial"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const roleClass  = (r) => r === "doctor" ? "dd-role-doctor"  : r === "student" ? "dd-role-student"  : "dd-role-patient";
const roleLabel  = (r) => r === "doctor" ? "Doctor"          : r === "student" ? "Student"          : "Patient";

function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtRelative(iso) {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Reply Component ──────────────────────────────────────────────────────────

const Reply = ({ reply, postId, commentId, onVoteReply }) => (
  <div className="dd-reply">
    <div className="dd-reply-votes">
      <button className={`dd-rv-btn ${reply.userVote === "up" ? "dd-rv-btn-up-active" : ""}`} onClick={() => onVoteReply(reply.id, "up")}><ChevronUpIcon style={{ width: 12, height: 12 }} /></button>
      <div className="dd-rv-count">{reply.votes}</div>
      <button className={`dd-rv-btn dd-rv-btn-down ${reply.userVote === "down" ? "dd-rv-btn-down-active" : ""}`} onClick={() => onVoteReply(reply.id, "down")}><ChevronDownIcon style={{ width: 12, height: 12 }} /></button>
    </div>
    <div className="dd-reply-body">
      <div className="dd-comment-meta">
        <div className="dd-author-avatar" style={{ width: 24, height: 24, fontSize: "0.6rem" }}>{reply.authorInitials}</div>
        <span className="dd-comment-author">{reply.authorName}</span>
        <span className={`dd-role-badge ${roleClass(reply.authorRole)}`}>{roleLabel(reply.authorRole)}</span>
        {reply.authorRole === "doctor" && <span className="dd-doctor-verified"><CheckBadgeIcon style={{ width: 13, height: 13, display: "inline", verticalAlign: "middle" }} /> Verified</span>}
        <span className="dd-comment-time">{fmtRelative(reply.postedAt)}</span>
      </div>
      <p className="dd-comment-text">{reply.body}</p>
    </div>
  </div>
);

// ─── Comment Component ────────────────────────────────────────────────────────

const Comment = ({ comment, postId, onVoteComment, onVoteReply, onAddReply }) => {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText]  = useState("");
  const [collapsed, setCollapsed]  = useState(false);

  const submitReply = () => {
    if (!replyText.trim()) return;
    onAddReply(comment.id, replyText.trim());
    setReplyText("");
    setShowReply(false);
  };

  return (
    <div className="dd-comment">
      <div className="dd-comment-inner">
        {/* Vote strip */}
        <div className="dd-comment-votes">
          <button
            className={`dd-cv-btn ${comment.userVote === "up" ? "dd-cv-btn-up-active" : ""}`}
            onClick={() => onVoteComment(comment.id, "up")}
          ><ChevronUpIcon style={{ width: 14, height: 14 }} /></button>
          <div className="dd-cv-count">{comment.votes}</div>
          <button
            className={`dd-cv-btn dd-cv-btn-down ${comment.userVote === "down" ? "dd-cv-btn-down-active" : ""}`}
            onClick={() => onVoteComment(comment.id, "down")}
          ><ChevronDownIcon style={{ width: 14, height: 14 }} /></button>
        </div>

        {/* Body */}
        <div className="dd-comment-body">
          <div className="dd-comment-meta">
            <div className="dd-author-avatar">{comment.authorInitials}</div>
            <span className="dd-comment-author">{comment.authorName}</span>
            <span className={`dd-role-badge ${roleClass(comment.authorRole)}`}>{roleLabel(comment.authorRole)}</span>
            {comment.authorRole === "doctor" && <span className="dd-doctor-verified"><CheckBadgeIcon style={{ width: 13, height: 13, display: "inline", verticalAlign: "middle" }} /> Verified Doctor</span>}
            <span className="dd-comment-time">{fmtRelative(comment.postedAt)}</span>
          </div>

          {!collapsed && (
            <>
              <p className="dd-comment-text">{comment.body}</p>
              <div className="dd-comment-actions">
                <button className="dd-ca-btn" onClick={() => onVoteComment(comment.id, "up")}>
                  <ChevronUpIcon style={{ width: 13, height: 13 }} /> Upvote
                </button>
                <button className={`dd-ca-btn ${showReply ? "dd-ca-btn-active" : ""}`} onClick={() => setShowReply((s) => !s)}>
                  <ChatBubbleLeftIcon style={{ width: 13, height: 13 }} /> Reply
                </button>
                <button className="dd-ca-btn" onClick={() => setCollapsed(true)}>
                  <MinusIcon style={{ width: 13, height: 13 }} /> Collapse
                </button>
                <button className="dd-ca-btn"><ShareIcon style={{ width: 13, height: 13 }} /> Share</button>
                <button className="dd-ca-btn"><EllipsisHorizontalIcon style={{ width: 13, height: 13 }} /> More</button>
              </div>
            </>
          )}

          {collapsed && (
            <button className="dd-ca-btn" onClick={() => setCollapsed(false)}><PlusIcon style={{ width: 13, height: 13 }} /> Expand</button>
          )}
        </div>
      </div>

      {/* Reply textarea */}
      {showReply && !collapsed && (
        <div className="dd-reply-box">
          <textarea
            className="dd-reply-textarea"
            placeholder={`Reply to ${comment.authorName}…`}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            autoFocus
          />
          <div className="dd-reply-actions">
            <button className="dd-btn dd-btn-secondary dd-btn-sm" onClick={() => { setShowReply(false); setReplyText(""); }}>Cancel</button>
            <button className="dd-btn dd-btn-primary dd-btn-sm" onClick={submitReply} disabled={!replyText.trim()}>Post Reply</button>
          </div>
        </div>
      )}

      {/* Replies */}
      {!collapsed && comment.replies.length > 0 && (
        <div className="dd-replies">
          {comment.replies.map((reply) => (
            <Reply
              key={reply.id}
              reply={reply}
              postId={postId}
              commentId={comment.id}
              onVoteReply={(rId, dir) => onVoteReply(comment.id, rId, dir)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const DiscussionDetail = () => {
  const { id } = useParams();
  const { backendUrl, token } = useContext(AppContext);
  const { posts, votePost, voteComment, voteReply, addComment, addReply } = usePosts();

  const [apiPost, setApiPost] = useState(null);

  useEffect(() => {
    if (!token) return;
    patientPortalApi.getQueryById(backendUrl, token, id)
      .then((q) => setApiPost(q))
      .catch((err) => console.error('Failed to load query', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  const mapApiToPost = (q) => {
    if (!q) return null;
    const author = q.patient?.user || { name: 'Anonymous', avatarUrl: null };
    return {
      id: q.id,
      authorInitials: (author.name || '').split(' ').map(s => s[0]).slice(0,2).join('') || 'P',
      authorName: q.isAnonymous ? 'Anonymous' : (author.name || 'Patient'),
      authorRole: 'patient',
      title: q.title,
      body: q.symptomText || '',
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

  const post = token && apiPost ? mapApiToPost(apiPost) : posts.find((p) => p.id === Number(id));

  const [commentText, setCommentText] = useState("");
  const [sortComments, setSortComments] = useState("Best");
  const [saved, setSaved]   = useState(false);

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    addComment(post.id, commentText.trim());
    setCommentText("");
  };

  const sortedComments = post
    ? [...post.comments_data].sort((a, b) => {
        if (sortComments === "Best")          return (b.votes + b.replies.length) - (a.votes + a.replies.length);
        if (sortComments === "Top")           return b.votes - a.votes;
        if (sortComments === "New")           return new Date(b.postedAt) - new Date(a.postedAt);
        if (sortComments === "Controversial") return a.votes - b.votes;
        return 0;
      })
    : [];

  const totalReplies = post ? post.comments_data.reduce((s, c) => s + c.replies.length, 0) : 0;

  return (
    <div className="dd-page">
      <div className="dd-container">
        <PatientSidebar />

        <main className="dd-main-content">
          <Link to="/patient-portal/health-queries" className="dd-back-link"><ArrowLeftIcon style={{ width: 16, height: 16 }} /> Back to Forum</Link>

          {!post ? (
            <div className="dd-not-found">
              <p style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "0.5rem" }}>Discussion not found</p>
              <p>This post may have been removed or doesn't exist.</p>
            </div>
          ) : (
            <div className="dd-content-grid">
              {/* ── Left: post + comments ── */}
              <div>
                {/* Post */}
                <div className="dd-post-card">
                  <div className="dd-post-inner">
                    <div className="dd-post-votes">
                      <button
                        className={`dd-vote-btn ${post.userVote === "up" ? "dd-vote-btn-up-active" : ""}`}
                        onClick={() => votePost(post.id, "up")}
                        title="Upvote"
                      ><ChevronUpIcon style={{ width: 16, height: 16 }} /></button>
                      <div className="dd-vote-count">{post.votes}</div>
                      <button
                        className={`dd-vote-btn dd-vote-btn-down ${post.userVote === "down" ? "dd-vote-btn-down-active" : ""}`}
                        onClick={() => votePost(post.id, "down")}
                        title="Downvote"
                      ><ChevronDownIcon style={{ width: 16, height: 16 }} /></button>
                    </div>

                    <div className="dd-post-body">
                      <div className="dd-post-meta-row">
                        <span className="dd-category-badge">{post.category}</span>
                        <div className="dd-author-chip">
                          <div className="dd-author-avatar">{post.authorInitials}</div>
                          <span className="dd-author-name">{post.authorName}</span>
                          <span className={`dd-role-badge ${roleClass(post.authorRole)}`}>{roleLabel(post.authorRole)}</span>
                          {post.authorRole === "doctor" && <span className="dd-doctor-verified">✓ Verified</span>}
                        </div>
                        <span className="dd-post-date">{fmtDate(post.postedAt)}</span>
                      </div>

                      <h1 className="dd-post-title">{post.title}</h1>
                      <p className="dd-post-text">{post.body}</p>

                      <div className="dd-post-actions">
                        <button className="dd-action-btn"><ChatBubbleLeftIcon style={{ width: 15, height: 15 }} /> {post.comments_data.length} Comments</button>
                        <button className="dd-action-btn"><ShareIcon style={{ width: 15, height: 15 }} /> Share</button>
                        <button
                          className={`dd-action-btn ${saved ? "dd-ca-btn-active" : ""}`}
                          onClick={() => setSaved((s) => !s)}
                          style={saved ? { color: "var(--dd-primary)" } : {}}
                        >
                          {saved ? <><BookmarkSlashIcon style={{ width: 15, height: 15 }} /> Saved</> : <><BookmarkIcon style={{ width: 15, height: 15 }} /> Save</>}
                        </button>
                        <button className="dd-action-btn"><FlagIcon style={{ width: 15, height: 15 }} /> Report</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comment box */}
                <div className="dd-comment-box">
                  <div className="dd-comment-box-title">Add a comment</div>
                  <textarea
                    className="dd-comment-textarea"
                    placeholder="Share your thoughts, experience, or advice…"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <div className="dd-comment-box-actions">
                    <button className="dd-btn dd-btn-primary" onClick={handleAddComment} disabled={!commentText.trim()}>
                      Post Comment
                    </button>
                  </div>
                </div>

                {/* Comments */}
                <div className="dd-comments-header">
                  <div className="dd-comments-title">
                    {post.comments_data.length} Comment{post.comments_data.length !== 1 ? "s" : ""}
                    {totalReplies > 0 && ` · ${totalReplies} Repl${totalReplies !== 1 ? "ies" : "y"}`}
                  </div>
                  <select
                    className="dd-sort-select"
                    value={sortComments}
                    onChange={(e) => setSortComments(e.target.value)}
                  >
                    {SORT_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>

                {sortedComments.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2.5rem", color: "var(--dd-text-muted)", background: "var(--dd-surface)", border: "1px solid var(--dd-border)", borderRadius: "0.5rem", fontSize: "0.875rem" }}>
                    No comments yet. Be the first to respond!
                  </div>
                ) : (
                  <div className="dd-comment-thread">
                    {sortedComments.map((comment) => (
                      <Comment
                        key={comment.id}
                        comment={comment}
                        postId={post.id}
                        onVoteComment={(cId, dir) => voteComment(post.id, cId, dir)}
                        onVoteReply={(cId, rId, dir) => voteReply(post.id, cId, rId, dir)}
                        onAddReply={(cId, text) => addReply(post.id, cId, text)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* ── Right: info panel ── */}
              <div className="dd-info-panel">
                <div className="dd-panel-header">About this Discussion</div>
                <div className="dd-panel-body">
                  <div className="dd-stat-row">
                    <span className="dd-stat-label">Posted by</span>
                    <span className="dd-stat-value">{post.authorName}</span>
                  </div>
                  <div className="dd-stat-row">
                    <span className="dd-stat-label">Date</span>
                    <span className="dd-stat-value">{fmtDate(post.postedAt)}</span>
                  </div>
                  <div className="dd-stat-row">
                    <span className="dd-stat-label">Votes</span>
                    <span className="dd-stat-value">{post.votes}</span>
                  </div>
                  <div className="dd-stat-row">
                    <span className="dd-stat-label">Comments</span>
                    <span className="dd-stat-value">{post.comments_data.length}</span>
                  </div>
                  <div className="dd-stat-row">
                    <span className="dd-stat-label">Views</span>
                    <span className="dd-stat-value">{post.views}</span>
                  </div>
                  <div className="dd-stat-row">
                    <span className="dd-stat-label">Category</span>
                    <span className="dd-stat-value">{post.category}</span>
                  </div>

                  <div className="dd-panel-divider" />

                  <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--dd-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                    Tags
                  </div>
                  <div className="dd-panel-tag-list">
                    <span className="dd-panel-tag">{post.category}</span>
                    <span className="dd-panel-tag">{roleLabel(post.authorRole)}</span>
                    {post.comments_data.some((c) => c.authorRole === "doctor") && (
                      <span className="dd-panel-tag">Doctor Answered</span>
                    )}
                  </div>

                  <div className="dd-panel-divider" />

                  <Link to="/patient-portal/health-queries" style={{ textDecoration: "none" }}>
                    <button type="button" className="dd-btn dd-btn-secondary" style={{ width: "100%", justifyContent: "center" }}>
                      <ArrowLeftIcon style={{ width: 15, height: 15 }} /> Back to Forum
                    </button>
                  </Link>

                  <div style={{ marginTop: "0.75rem" }}>
                    <button
                      type="button"
                      className="dd-btn dd-btn-primary"
                      style={{ width: "100%", justifyContent: "center" }}
                      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                    >
                      <ArrowUpIcon style={{ width: 15, height: 15 }} /> Jump to Top
                    </button>
                  </div>
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
