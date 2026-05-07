import { useContext, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import DoctorCard from "../components/DoctorCard";
import { useLanguage } from "../utils/language";
import { getDoctorNameForLanguage } from "../utils/nepaliNames";

const Doctors = () => {
  const { slug } = useParams();
  const { pathname } = useLocation();
  const [filterDoc, setFilterDoc] = useState([]);
  const [showFilter, setShowFilter] = useState(false);
  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [minFee, setMinFee] = useState(0);
  const [maxFee, setMaxFee] = useState(1000);
  const [ratingMin, setRatingMin] = useState(0);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("relevance");
  const navigate = useNavigate();

  const { doctors } = useContext(AppContext);
  const [language] = useLanguage();

  const manualDoctors = [
    { _id: "doc1", name: "Dr. Sarah Johnson", speciality: "General physician", image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face", available: true, experience: "8 years", rating: 4.8, fee: 40, location: "New York, NY" },
    { _id: "doc2", name: "Dr. Michael Chen", speciality: "Gynecologist", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face", available: true, experience: "12 years", rating: 4.9, fee: 60, location: "Los Angeles, CA" },
    { _id: "doc3", name: "Dr. Emily Rodriguez", speciality: "Dermatologist", image: "https://images.unsplash.com/photo-1594824804732-ca8db723f8fa?w=400&h=400&fit=crop&crop=face", available: false, experience: "6 years", rating: 4.7, fee: 55, location: "Miami, FL" },
    { _id: "doc4", name: "Dr. David Kim", speciality: "Pediatricians", image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop&crop=face", available: true, experience: "10 years", rating: 4.9, fee: 45, location: "Chicago, IL" },
    { _id: "doc5", name: "Dr. Lisa Thompson", speciality: "Neurologist", image: "https://images.unsplash.com/photo-1594824804732-ca8db723f8fa?w=400&h=400&fit=crop&crop=face", available: true, experience: "15 years", rating: 4.8, fee: 120, location: "Boston, MA" },
    { _id: "doc6", name: "Dr. Robert Martinez", speciality: "Gastroenterologist", image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face", available: false, experience: "11 years", rating: 4.6, fee: 80, location: "Houston, TX" },
    { _id: "doc7", name: "Dr. Jennifer Lee", speciality: "General physician", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face", available: true, experience: "9 years", rating: 4.7, fee: 35, location: "Seattle, WA" },
    { _id: "doc8", name: "Dr. James Wilson", speciality: "Gynecologist", image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop&crop=face", available: true, experience: "7 years", rating: 4.8, fee: 65, location: "Denver, CO" },
    { _id: "doc9", name: "Dr. Maria Garcia", speciality: "Dermatologist", image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face", available: true, experience: "13 years", rating: 4.9, fee: 70, location: "Phoenix, AZ" },
    { _id: "doc10", name: "Dr. Thomas Brown", speciality: "Pediatricians", image: "https://images.unsplash.com/photo-1594824804732-ca8db723f8fa?w=400&h=400&fit=crop&crop=face", available: false, experience: "5 years", rating: 4.5, fee: 30, location: "Portland, OR" },
    { _id: "doc11", name: "Dr. Amanda White", speciality: "Neurologist", image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face", available: true, experience: "14 years", rating: 4.9, fee: 110, location: "Austin, TX" },
    { _id: "doc12", name: "Dr. Christopher Davis", speciality: "Gastroenterologist", image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop&crop=face", available: true, experience: "8 years", rating: 4.7, fee: 75, location: "Nashville, TN" },
  ];

  const specialityList = [
    { name: "General physician", slug: "general-physician" },
    { name: "Gynecologist", slug: "gynecologist" },
    { name: "Dermatologist", slug: "dermatologist" },
    { name: "Pediatricians", slug: "pediatricians" },
    { name: "Neurologist", slug: "neurologist" },
    { name: "Gastroenterologist", slug: "gastroenterologist" },
  ];

  const applyFilter = () => {
    const doctorsToFilter = (doctors && doctors.length > 0) ? doctors : manualDoctors;
    if (slug) {
      setFilterDoc(doctorsToFilter.filter((doc) => doc.speciality.toLowerCase().replace(/\s+/g, "-") === slug.toLowerCase()));
    } else {
      setFilterDoc(doctorsToFilter);
    }
  };

  useEffect(() => { applyFilter(); }, [doctors, slug]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const filteredList = (filterDoc || []).filter((d) => {
    if (search) {
      const q = search.toLowerCase();
      const localizedName = getDoctorNameForLanguage(d, language);
      if (!(
        d.name?.toLowerCase().includes(q) ||
        localizedName?.toLowerCase().includes(q) ||
        d.speciality?.toLowerCase().includes(q) ||
        d.location?.toLowerCase().includes(q)
      )) return false;
    }
    const fee = d.fee || d.consultation_fee || d.consultationFee || 0;
    if (fee < minFee || fee > maxFee) return false;
    if ((d.rating || 0) < ratingMin) return false;
    return true;
  });

  const pageSize = 9;
  const totalPages = Math.max(1, Math.ceil(filteredList.length / pageSize));

  const sorted = [...filteredList].sort((a, b) => {
    if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
    if (sortBy === "fee-asc") return (a.fee || 0) - (b.fee || 0);
    if (sortBy === "fee-desc") return (b.fee || 0) - (a.fee || 0);
    if (sortBy === "experience") {
      const ea = Number(String(a.experience || "").match(/\d+/)?.[0] || 0);
      const eb = Number(String(b.experience || "").match(/\d+/)?.[0] || 0);
      return eb - ea;
    }
    return 0;
  });

  const pageItems = sorted.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setTimeout(() => window.scrollTo(0, 0), 10);
  }, [pathname]);

  const clearFilters = () => {
    setSearchTerm(""); setSearch(""); setMinFee(0); setMaxFee(1000); setRatingMin(0); setSortBy("relevance"); setPage(1);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Header — matches system's Hero.jsx pattern */}
      <div className="mx-4 sm:mx-10 mt-4">
        <div className="bg-primary rounded-2xl px-8 md:px-14 py-14 flex flex-col items-center text-center">
          <p className="text-3xl md:text-4xl text-white font-semibold leading-tight">
            Find Your Perfect Doctor
          </p>
          <p className="text-white/75 text-sm mt-3 max-w-lg">
            Browse our vetted network of specialists and book appointments hassle-free.
          </p>

          {/* Search bar */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full max-w-2xl">
            <div className="flex-1 relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
              </svg>
              <input
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                placeholder="Search doctors, speciality, or city…"
                className="w-full pl-11 pr-4 py-3 rounded-full bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/60 shadow-sm"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="px-5 py-3 rounded-full bg-white text-sm text-gray-700 focus:outline-none shadow-sm"
            >
              <option value="relevance">Relevance</option>
              <option value="rating">Top Rated</option>
              <option value="fee-asc">Fee: Low → High</option>
              <option value="fee-desc">Fee: High → Low</option>
              <option value="experience">Most Experienced</option>
            </select>
          </div>


        </div>
      </div>

      {/* Body */}
      <div className="px-4 sm:px-10 py-8">
        {/* Mobile filter toggle + section title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {slug ? specialityList.find((s) => s.slug === slug)?.name ?? "Doctors" : "All Doctors"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{filteredList.length} results</p>
          </div>

          <button
            className={`lg:hidden flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-medium transition-all duration-200 ${
              showFilter ? "bg-primary text-white border-primary shadow" : "bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary"
            }`}
            onClick={() => setShowFilter((prev) => !prev)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 010 2H4a1 1 0 01-1-1zm3 6a1 1 0 011-1h10a1 1 0 010 2H7a1 1 0 01-1-1zm4 6a1 1 0 011-1h2a1 1 0 010 2h-2a1 1 0 01-1-1z" />
            </svg>
            Filters
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className={`${showFilter ? "block" : "hidden lg:block"} w-full lg:w-72 flex-shrink-0`}>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-[88px] max-h-[calc(100vh-100px)] overflow-y-auto space-y-6">

              {/* Specializations */}
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wide">Specialization</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => { navigate("/doctors"); setPage(1); }}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                      !slug ? "bg-primary text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-primary/10 hover:text-primary"
                    }`}
                  >
                    All
                  </button>
                  {specialityList.map((s) => (
                    <button
                      key={s.slug}
                      onClick={() => { slug === s.slug ? navigate("/doctors") : navigate(`/doctors/${s.slug}`); setPage(1); }}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                        slug === s.slug ? "bg-primary text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-primary/10 hover:text-primary"
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Fee range */}
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wide">Fee Range ($)</h4>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={minFee}
                    onChange={(e) => { setMinFee(Number(e.target.value)); setPage(1); }}
                    placeholder="Min"
                    className="w-1/2 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <span className="text-gray-400 text-sm">—</span>
                  <input
                    type="number"
                    value={maxFee}
                    onChange={(e) => { setMaxFee(Number(e.target.value)); setPage(1); }}
                    placeholder="Max"
                    className="w-1/2 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Rating filter */}
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-3 uppercase tracking-wide">Minimum Rating</h4>
                <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-primary rounded"
                    checked={ratingMin >= 4}
                    onChange={(e) => { setRatingMin(e.target.checked ? 4 : 0); setPage(1); }}
                  />
                  <span>4+ stars only</span>
                  <span className="text-yellow-500 text-base">★★★★</span>
                </label>
              </div>

              <hr className="border-gray-100" />

              <button
                onClick={clearFilters}
                className="w-full py-2.5 rounded-full border-2 border-gray-200 text-sm font-medium text-gray-600 hover:border-primary hover:text-primary transition-all duration-200"
              >
                Clear Filters
              </button>
            </div>
          </aside>

          {/* Doctors list */}
          <main className="flex-1 min-w-0">
            {pageItems.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-.882-5.833-2.25" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">No doctors found</h3>
                <p className="text-gray-500 text-sm mb-6">Try a different specialization or adjust your filters.</p>
                <button
                  onClick={() => navigate("/doctors")}
                  className="bg-primary text-white px-8 py-3 rounded-full font-light hover:opacity-90 transition-opacity"
                >
                  View All Doctors
                </button>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-1 gap-5">
                  {pageItems.map((doctor, index) => (
                    <DoctorCard
                      key={doctor._id || index}
                      doctor={{
                        ...doctor,
                        name: getDoctorNameForLanguage(doctor, language),
                        englishName: getDoctorNameForLanguage(doctor, "en"),
                      }}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className={`px-5 py-2 rounded-full text-sm font-medium border-2 transition-all duration-200 ${
                        page <= 1
                          ? "opacity-40 cursor-not-allowed border-gray-200 text-gray-400"
                          : "border-gray-300 text-gray-600 hover:border-primary hover:text-primary"
                      }`}
                    >
                      ← Prev
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-9 h-9 rounded-full text-sm font-medium transition-all duration-200 ${
                            p === page
                              ? "bg-primary text-white shadow-sm"
                              : "text-gray-500 hover:bg-primary/10 hover:text-primary"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>

                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className={`px-5 py-2 rounded-full text-sm font-medium border-2 transition-all duration-200 ${
                        page >= totalPages
                          ? "opacity-40 cursor-not-allowed border-gray-200 text-gray-400"
                          : "border-gray-300 text-gray-600 hover:border-primary hover:text-primary"
                      }`}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Doctors;
