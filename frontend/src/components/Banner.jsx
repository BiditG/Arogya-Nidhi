import { useNavigate } from "react-router-dom";
import { assets } from "../assets/assets_frontend/assets";
import { useContext } from "react";
import { AppContext } from "../context/AppContext";

const Banner = () => {
  const navigate = useNavigate();
  const { token } = useContext(AppContext);

  return (
    <div className="mx-6 sm:mx-12 flex bg-[#3b82f6] rounded-2xl px-6 sm:px-10 md:px-14 lg:px-12 my-20">
      {/* ---------- Left Side ---------- */}
      <div className="flex-1 py-8 sm:py-10 md:py-16 lg:py-24 lg:pl-5">
        <div className="text-xl sm:text-2xl md:text-3xl lg:text-5xl font-semibold text-white">
          <p>Book Appointment</p>
          <p className="mt-4">With 100+ Trusted Doctors</p>
          <p className="text-sm text-white mt-2 italic">अपॉइन्टमेन्ट बुक गर्नुहोस् — १००+ विश्वासिलो चिकित्सक</p>
        </div>
        {!token && (
          <button
            onClick={() => {
              navigate("/login");
              scrollTo(0, 0);
            }}
            className="bg-white text-sm sm:text-base text-gray-600 px-8 py-3 rounded-full mt-6 hover:scale-105 transition-all"
          >
            Create Account
            <div className="text-xs text-gray-500">(खाता बनाउनुहोस्)</div>
          </button>
        )}
      </div>

      {/* ---------- Right Side ---------- */}
      <div className="hidden md:block md:w-1/2 lg:w-[370px] relative">
        <img
          className="w-full absolute bottom-0 right-0 max-w-md"
          src={assets.appointment_img}
          alt=""
        />
      </div>
    </div>
  );
};

export default Banner;
