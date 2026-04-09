import React from "react";

const DiscussionCard = ({ post, onView, onVote }) => {
  const votes = post.votes ?? 0;
  const comments = post.replies?.length ?? 0;
  const views = post.views ?? Math.floor(Math.random() * 500) + 20;

  return (
    <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="flex flex-col items-center gap-2 px-3 py-2 bg-gray-50">
        <button
          onClick={() => onVote?.(post.id, 1)}
          className="text-gray-500 hover:text-green-600"
          aria-label="upvote"
        >
          ▲
        </button>
        <div className="text-sm font-medium">{votes}</div>
        <button
          onClick={() => onVote?.(post.id, -1)}
          className="text-gray-500 hover:text-red-600"
          aria-label="downvote"
        >
          ▼
        </button>
      </div>

      <div className="flex-1 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{post.title}</h3>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{post.body}</p>

        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-primary/90">{post.category || 'General'}</span>
          <span className="flex items-center gap-1">💬 <span className="text-gray-600">{comments}</span></span>
          <span className="flex items-center gap-1">👁️ <span className="text-gray-600">{views}</span></span>
          <span className="ml-2 px-2 py-0.5 border border-gray-200 rounded text-xs bg-gray-50">{post.author === 'doctor' ? 'Doctor' : 'Student'}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">Posted {new Date(post.createdAt).toLocaleDateString()}</div>
          <button
            onClick={() => onView?.(post)}
            className="px-3 py-1 text-sm bg-primary text-white rounded shadow-sm hover:opacity-95"
          >
            View Discussion
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiscussionCard;
