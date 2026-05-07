import React from "react";
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { assets as adminAssets } from "../assets/assets_admin/assets";

const DoctorCard = ({ doctor }) => {
  const navigate = useNavigate();
  const { currencySymbol } = useContext(AppContext);
  const doctorId = doctor?._id || doctor?.id || doctor?.doctorId || doctor?.doctor_id || null;
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

  const handleBook = (e) => {
    e?.stopPropagation();
    if (!doctorId || doctorId === "undefined") return;
    navigate(`/patient-portal/book-appointment?doctorId=${doctorId}`);
    try { scrollTo(0,0); } catch(_){}
  };

  const stars = () => {
    const n = Math.round(doctor.rating || 0);
    return Array.from({ length: n }).map((_, i) => (
      <span key={i} className="text-yellow-500">★</span>
    ));
  };

  return (
    <article
      onClick={handleBook}
      className={`min-h-[260px] h-full flex flex-col border border-gray-200 rounded-lg bg-white cursor-pointer hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-200 overflow-hidden ${doctor.available ? "" : "opacity-60"}`}
    >
      <div className="flex items-start md:items-center gap-5 p-6">
        <img
          className={`w-28 h-28 rounded-full ring-2 ring-primary/20 flex-shrink-0 ${imageSrc === adminAssets.doctor_icon ? "bg-gray-100 p-4 object-contain" : "object-cover"}`}
          src={imageSrc}
          alt={doctor.name || "Doctor"}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = adminAssets.doctor_icon;
            e.currentTarget.classList.remove("object-cover");
            e.currentTarget.classList.add("object-contain", "bg-gray-100", "p-4");
          }}
        />

        <div className="flex-1 min-w-0">
          <h3 className="text-gray-900 text-xl font-semibold truncate" title={doctor.name}>{doctor.name}</h3>
          <div className="flex items-center gap-2">
            <p className="text-base text-gray-600 truncate" title={doctor.specialty || doctor.sub_specialty || doctor.speciality}>{doctor.specialty || doctor.sub_speciality || doctor.speciality}</p>
            {doctor.is_verified ? <span className="ml-2 px-2 py-0.5 text-sm bg-green-50 text-green-700 rounded">Verified</span> : null}
          </div>
          {doctor.experience && <p className="text-sm text-gray-500 mt-1">{doctor.experience}{!String(doctor.experience).toLowerCase().includes('year') && ' years'}</p>}

          {doctor.qualifications && <p className="text-sm text-gray-700 mt-2 truncate" title={doctor.qualifications}>{doctor.qualifications}</p>}
          {doctor.license_no && <p className="text-xs text-gray-400 mt-1">License: {doctor.license_no}</p>}

          <div className="flex items-center gap-2 mt-2">
            <div className="text-sm" aria-hidden>
              {stars()}
            </div>
            <div className="text-sm text-gray-500">{(doctor.rating || 0).toFixed(1)}</div>
          </div>

          {doctor.location && <p className="text-sm text-gray-400 mt-2 truncate">{doctor.location}</p>}
        </div>
      </div>

      <div className="px-6 pb-6 mt-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <span aria-hidden className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${doctor.available ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-500'}`}>
              <span className={`w-2.5 h-2.5 rounded-full mr-2 ${doctor.available ? 'bg-green-500' : 'bg-gray-400'}`}></span>
              {doctor.available ? 'Available' : 'Not Available'}
            </span>
            <div className="text-base text-gray-700 font-semibold truncate">{currencySymbol} {doctor.fee ?? doctor.consultation_fee ?? '—'}</div>
          </div>

          <div className="flex-none mt-3 sm:mt-0">
            <button
              onClick={handleBook}
              aria-label={`Book appointment with ${doctor.name}`}
              className="bg-primary text-white px-5 py-2 rounded-full text-sm w-full sm:w-auto shadow-md hover:shadow-lg transition-shadow"
              disabled={!doctorId || doctorId === "undefined"}
            >
              <span className="inline sm:hidden">Book</span>
              <span className="hidden sm:inline">Book Appointment</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

export default DoctorCard;
