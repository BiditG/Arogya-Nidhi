import { useContext, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import DoctorCard from "../components/DoctorCard";

const Doctors = () => {
  const { slug } = useParams();
  const { pathname } = useLocation();
  const [filterDoc, setFilterDoc] = useState([]);
  const [showFilter, setShowFilter] = useState(false);
  const navigate = useNavigate();

  const { doctors } = useContext(AppContext);

  // Manual doctor data
  const manualDoctors = [
    {
      _id: "doc1",
      name: "Dr. Sarah Johnson",
      speciality: "General physician",
      image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face",
      available: true,
      experience: "8 years",
      rating: 4.8,
      location: "New York, NY"
    },
    {
      _id: "doc2",
      name: "Dr. Michael Chen",
      speciality: "Gynecologist",
      image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face",
      available: true,
      experience: "12 years",
      rating: 4.9,
      location: "Los Angeles, CA"
    },
    {
      _id: "doc3",
      name: "Dr. Emily Rodriguez",
      speciality: "Dermatologist",
      image: "https://images.unsplash.com/photo-1594824804732-ca8db723f8fa?w=400&h=400&fit=crop&crop=face",
      available: false,
      experience: "6 years",
      rating: 4.7,
      location: "Miami, FL"
    },
    {
      _id: "doc4",
      name: "Dr. David Kim",
      speciality: "Pediatricians",
      image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop&crop=face",
      available: true,
      experience: "10 years",
      rating: 4.9,
      location: "Chicago, IL"
    },
    {
      _id: "doc5",
      name: "Dr. Lisa Thompson",
      speciality: "Neurologist",
      image: "https://images.unsplash.com/photo-1594824804732-ca8db723f8fa?w=400&h=400&fit=crop&crop=face",
      available: true,
      experience: "15 years",
      rating: 4.8,
      location: "Boston, MA"
    },
    {
      _id: "doc6",
      name: "Dr. Robert Martinez",
      speciality: "Gastroenterologist",
      image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face",
      available: false,
      experience: "11 years",
      rating: 4.6,
      location: "Houston, TX"
    },
    {
      _id: "doc7",
      name: "Dr. Jennifer Lee",
      speciality: "General physician",
      image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face",
      available: true,
      experience: "9 years",
      rating: 4.7,
      location: "Seattle, WA"
    },
    {
      _id: "doc8",
      name: "Dr. James Wilson",
      speciality: "Gynecologist",
      image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop&crop=face",
      available: true,
      experience: "7 years",
      rating: 4.8,
      location: "Denver, CO"
    },
    {
      _id: "doc9",
      name: "Dr. Maria Garcia",
      speciality: "Dermatologist",
      image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face",
      available: true,
      experience: "13 years",
      rating: 4.9,
      location: "Phoenix, AZ"
    },
    {
      _id: "doc10",
      name: "Dr. Thomas Brown",
      speciality: "Pediatricians",
      image: "https://images.unsplash.com/photo-1594824804732-ca8db723f8fa?w=400&h=400&fit=crop&crop=face",
      available: false,
      experience: "5 years",
      rating: 4.5,
      location: "Portland, OR"
    },
    {
      _id: "doc11",
      name: "Dr. Amanda White",
      speciality: "Neurologist",
      image: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face",
      available: true,
      experience: "14 years",
      rating: 4.9,
      location: "Austin, TX"
    },
    {
      _id: "doc12",
      name: "Dr. Christopher Davis",
      speciality: "Gastroenterologist",
      image: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop&crop=face",
      available: true,
      experience: "8 years",
      rating: 4.7,
      location: "Nashville, TN"
    }
  ];

  const specialityList = [
    { name: "General physician", slug: "general-physician", icon: "🏥" },
    { name: "Gynecologist", slug: "gynecologist", icon: "👩‍⚕️" },
    { name: "Dermatologist", slug: "dermatologist", icon: "🧴" },
    { name: "Pediatricians", slug: "pediatricians", icon: "👶" },
    { name: "Neurologist", slug: "neurologist", icon: "🧠" },
    { name: "Gastroenterologist", slug: "gastroenterologist", icon: "🫀" },
  ];

  const applyFilter = () => {
    const doctorsToFilter = manualDoctors.length > 0 ? manualDoctors : doctors;
    if (slug) {
      setFilterDoc(
        doctorsToFilter.filter(
          (doc) =>
            doc.speciality.toLowerCase().replace(/\s+/g, "-") ===
            slug.toLowerCase()
        )
      );
    } else {
      setFilterDoc(doctorsToFilter);
    }
  };

  useEffect(() => {
    applyFilter();
  }, [doctors, slug]);

  useEffect(() => {
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 10);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Find Your Perfect Doctor
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Browse through our extensive network of specialized healthcare professionals
              and book appointments with ease.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Toggle Button for Mobile */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold text-gray-800">
              {slug ? specialityList.find(s => s.slug === slug)?.name : "All Doctors"}
            </h2>
            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
              {filterDoc.length} {filterDoc.length === 1 ? 'Doctor' : 'Doctors'}
            </span>
          </div>

          <button
            className={`lg:hidden flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all duration-300 ${
              showFilter
                ? "bg-green-600 text-white border-green-600 shadow-lg"
                : "bg-white text-gray-700 border-gray-300 hover:border-green-400"
            }`}
            onClick={() => setShowFilter((prev) => !prev)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
            </svg>
            Filters
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filter Sidebar */}
          <div
            className={`${
              showFilter ? "block" : "hidden lg:block"
            } w-full lg:w-80 bg-white rounded-xl shadow-lg border border-gray-100 p-6 h-screen sticky top-0 overflow-y-auto`}
          >
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Specializations
            </h3>

            <div className="space-y-2">
              <button
                onClick={() => {
                  navigate("/doctors");
                  setShowFilter(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  !slug
                    ? "bg-green-600 text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-50 hover:shadow-sm"
                }`}
              >
                <span className="text-lg">👨‍⚕️</span>
                <span className="font-medium">All Doctors</span>
              </button>

              {specialityList.map((speciality) => (
                <button
                  key={speciality.slug}
                  onClick={() => {
                    slug === speciality.slug
                      ? navigate("/doctors")
                      : navigate(`/doctors/${speciality.slug}`);
                    setShowFilter(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    slug === speciality.slug
                      ? "bg-green-600 text-white shadow-md"
                      : "text-gray-700 hover:bg-gray-50 hover:shadow-sm"
                  }`}
                >
                  <span className="text-lg">{speciality.icon}</span>
                  <span className="font-medium">{speciality.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Doctors Grid */}
          <div className="flex-1">
            {filterDoc.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-.882-5.833-2.25" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No doctors found</h3>
                <p className="text-gray-600 mb-6">Try selecting a different specialization or check back later.</p>
                <button
                  onClick={() => navigate("/doctors")}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors duration-200"
                >
                  View All Doctors
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filterDoc.map((doctor, index) => (
                  <div
                    key={index}
                    className="transform hover:scale-105 transition-transform duration-300"
                  >
                    <DoctorCard doctor={doctor} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Doctors;
