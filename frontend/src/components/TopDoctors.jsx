import { useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { assets as adminAssets } from "../assets/assets_admin/assets";
import { useLanguage } from "../utils/language";
import { getDoctorNameForLanguage } from "../utils/nepaliNames";

const TOP_DOCTORS_LIMIT = 10;

const DoctorSpotlightCard = ({ doctor }) => {
  const imageSrc =
    doctor?.image ||
    doctor?.avatar_url ||
    doctor?.avatarUrl ||
    doctor?.profile_image ||
    doctor?.user?.avatar_url ||
    doctor?.user?.avatarUrl ||
    doctor?.users?.avatar_url ||
    doctor?.fallbackImage ||
    adminAssets.doctor_icon;
  const specialty = doctor.specialty || doctor.sub_speciality || doctor.sub_specialty || doctor.speciality || "General";
  const rating = Number(doctor.rating || 0).toFixed(1);
  const available = doctor.available ?? doctor.is_available ?? doctor.isAvailable ?? false;

  return (
    <article className="top-doctor-spotlight shrink-0">
      <div className="top-doctor-avatar-wrap">
        <img
          className={`top-doctor-avatar ${imageSrc === adminAssets.doctor_icon ? "bg-gray-100 object-contain p-4" : "object-cover"}`}
          src={imageSrc}
          alt={doctor.name || "Doctor"}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = adminAssets.doctor_icon;
            e.currentTarget.classList.remove("object-cover");
            e.currentTarget.classList.add("object-contain", "bg-gray-100", "p-4");
          }}
        />
      </div>

      <div className="mt-4 min-w-0 text-center">
        <h3 className="truncate text-xl font-semibold text-gray-950" title={doctor.name}>
          {doctor.name}
        </h3>
        <p className="mt-1 truncate text-sm text-gray-600" title={specialty}>
          {specialty}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${available ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-500"}`}>
          <span className={`h-2 w-2 rounded-full ${available ? "bg-green-500" : "bg-gray-400"}`} />
          {available ? "Available" : "Unavailable"}
        </span>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-600">Rating {rating}</span>
      </div>

      {doctor.qualifications ? (
        <p className="mx-auto mt-4 line-clamp-2 max-w-[16rem] text-center text-sm leading-6 text-gray-500" title={doctor.qualifications}>
          {doctor.qualifications}
        </p>
      ) : (
        <p className="mx-auto mt-4 line-clamp-2 max-w-[16rem] text-center text-sm leading-6 text-gray-500">
          Trusted specialist for everyday healthcare needs.
        </p>
      )}
    </article>
  );
};

const TopDoctors = () => {
  const navigate = useNavigate();
  const { doctors } = useContext(AppContext);
  const [language] = useLanguage();

  const topDoctors = useMemo(
    () =>
      doctors.slice(0, TOP_DOCTORS_LIMIT).map((doctor) => ({
        ...doctor,
        name: getDoctorNameForLanguage(doctor, language),
        englishName: getDoctorNameForLanguage(doctor, "en"),
      })),
    [doctors, language]
  );

  // Duplicate only the top 10 doctors so the marquee can loop seamlessly.
  const marqueeDoctors = topDoctors.length ? [...topDoctors, ...topDoctors] : [];

  const goToDoctors = () => {
    navigate("/doctors");
    setTimeout(() => {
      scrollTo(0, 0);
    }, 50);
  };

  if (!topDoctors.length) return null;

  return (
    <section className="my-16 text-gray-900">
      <div className="mx-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm sm:mx-10">
        <div className="flex flex-col items-center gap-3 px-6 pt-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Trusted care network</p>
          <h1 className="text-3xl font-medium">Top Doctors to Book</h1>
          <p className="max-w-xl text-sm text-gray-600">
            Meet trusted doctors from our care network.
          </p>
          <p className="text-sm text-gray-500 italic">शीर्ष चिकित्सकहरू — बुक गर्न सजिलो</p>
        </div>

        <div className="relative py-8">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent" />

          <div className="top-doctors-marquee">
            <div className="top-doctors-marquee-track">
              {marqueeDoctors.map((doctor, index) => (
                <DoctorSpotlightCard key={`${doctor._id || doctor.id || doctor.name}-${index}`} doctor={doctor} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-center px-6 pb-8">
          <button
            onClick={goToDoctors}
            className="rounded-full border border-primary bg-primary px-6 py-2 text-white shadow-sm transition hover:opacity-95"
            aria-label="View all doctors"
          >
            View All Doctors
            <span className="ml-2 text-sm text-white/80">(थप)</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default TopDoctors;
