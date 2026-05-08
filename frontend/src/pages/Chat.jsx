import { useEffect, useMemo, useState } from "react";
import DiscussionCard from "../components/DiscussionCard";
import PageChanger from "../components/PageChanger";

const STORAGE_KEY = "arogyanidhi_chat_posts";

const sampleData = [
  {
    id: "p1",
    title: "How can I reduce fever at home?",
    body: "I've had a fever for 2 days. What can I try at home before visiting?",
    author: "patient",
    category: "General Health",
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    votes: 12,
    views: 240,
    replies: [
      {
        id: "r1",
        body: "Stay hydrated, take paracetamol as per dose. If fever > 39°C or persists >3 days, visit a doctor.",
        author: "doctor",
        createdAt: Date.now() - 1000 * 60 * 60 * 23,
      },
    ],
  },
  {
    id: "p2",
    title: "Skin rash after using cream",
    body: "I developed a rash after applying an OTC cream, what should I do?",
    author: "patient",
    category: "Dermatology",
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    votes: 3,
    views: 86,
    replies: [],
  },
  {
    id: "p3",
    title: "Best diet for high cholesterol?",
    body: "Looking for dietary changes to reduce cholesterol levels",
    author: "student",
    category: "Nutrition",
    createdAt: Date.now() - 1000 * 60 * 60 * 72,
    votes: 6,
    views: 140,
    replies: [{ id: "r2", body: "Focus on fiber and healthy fats.", author: "doctor", createdAt: Date.now() }],
  },
];

const categories = [
  "All",
  "Cardiology",
  "Neurology",
  "Dermatology",
  "Orthopedics",
  "General Health",
  "Nutrition",
  "Mental Health",
];

const Chat = () => {
  const [posts, setPosts] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : sampleData;
    } catch (e) {
      return sampleData;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  }, [posts]);

  // Filters / search state
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("new");
  const [chip, setChip] = useState("All");
  const [subFilter, setSubFilter] = useState("Hot");

  // pagination
  const [page, setPage] = useState(1);
  const perPage = 5;

  const filtered = useMemo(() => {
    let list = posts.slice();
    if (category && category !== "All") list = list.filter((p) => p.category === category);
    if (chip && chip !== "All") list = list.filter((p) => p.category === chip || p.category?.includes(chip));
    if (query) list = list.filter((p) => (p.title + p.body).toLowerCase().includes(query.toLowerCase()));

    if (subFilter === "Hot") list = list.sort((a, b) => (b.votes || 0) - (a.votes || 0));
    else if (subFilter === "New") list = list.sort((a, b) => b.createdAt - a.createdAt);
    else if (subFilter === "Top") list = list.sort((a, b) => (b.replies?.length || 0) - (a.replies?.length || 0));
    else if (subFilter === "Trending") list = list.sort((a, b) => (b.views || 0) - (a.views || 0));

    if (sort === "old") list = list.reverse();

    return list;
  }, [posts, category, chip, query, sort, subFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);

  const addPost = (title, body) => {
    const newPost = {
      id: `p${Date.now()}`,
      title,
      body,
      author: "patient",
      category: category === "All" ? "General Health" : category,
      createdAt: Date.now(),
      replies: [],
      votes: 0,
      views: 0,
    };
    setPosts([newPost, ...posts]);
    setPage(1);
  };

  const handleView = (post) => {
    // simple view action: increment views and open thread modal area
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, views: (p.views || 0) + 1 } : p)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleVote = (id, delta) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, votes: (p.votes || 0) + delta } : p)));
  };

  const gotoPage = (n) => {
    setPage(Math.max(1, Math.min(totalPages, n)));
  };

  return (
    <div className="my-8 md:mx-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-sm text-gray-500">Section header</div>
          <h1 className="text-3xl font-semibold">Health Discussion Forum</h1>
        </div>
        <div>
          <button className="px-4 py-2 bg-primary text-white rounded shadow-sm">+ Create New Post</button>
        </div>
      </div>

      {/* Search / filter bar */}
      <div className="border rounded-lg p-4 mb-4 bg-white shadow-sm">
        <div className="flex flex-col md:flex-row gap-3 items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search discussions"
            className="flex-1 border border-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />

          <select value={category} onChange={(e) => setCategory(e.target.value)} className="border px-3 py-2 rounded border-gray-200 bg-white">
            <option>All</option>
            {categories.filter((c) => c !== 'All').map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>

          <select value={sort} onChange={(e) => setSort(e.target.value)} className="border px-3 py-2 rounded border-gray-200 bg-white">
            <option value="new">Sort: New</option>
            <option value="old">Sort: Old</option>
          </select>

          <button onClick={() => setPage(1)} className="px-4 py-2 bg-primary text-white rounded shadow-sm">Search</button>
        </div>

        {/* category chips */}
        <div className="flex gap-2 flex-wrap mt-4">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => { setChip(c); setCategory('All'); setPage(1); }}
              className={`px-3 py-1 rounded-full text-sm ${chip === c ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* sub-filter row and list label */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {['Hot','New','Top','Trending'].map(s => (
            <button key={s} onClick={() => { setSubFilter(s); setPage(1); }} className={`px-3 py-1 rounded text-sm ${subFilter===s ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="text-sm text-gray-600">List Discussions</div>
      </div>

      {/* Discussion list */}
      <div className="space-y-3">
        {pageItems.length === 0 && <div className="p-6 border rounded text-center text-gray-500">No discussions found.</div>}
        {pageItems.map((p) => (
          <DiscussionCard key={p.id} post={p} onView={handleView} onVote={handleVote} />
        ))}
      </div>

      <PageChanger currentPage={page} totalPages={totalPages} onPageChange={gotoPage} className="mt-6" />
    </div>
  );
};

export default Chat;
