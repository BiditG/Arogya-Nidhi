import { assets } from "../assets/assets_frontend/assets";

const Hero = () => {
  return (
    <div className="mx-6 sm:mx-12 flex flex-col md:flex-row flex-wrap bg-primary rounded-2xl px-6 md:px-10 lg:px-20">
      {/* ---------- left side ---------- */}
      <div className="md:w-1/2 flex flex-col items-start justify-center gap-4 py-10 m-auto md:py-[10vw] md:mb-[-30px]">
        <p className="text-3xl md:text-4xl lg:text-5xl text-white font-semibold leading-tight md:leading-tight lg:leading-tight">
          Book Appointment <br /> With Trusted Doctors
        </p>
        <p className="text-sm text-white mt-2 italic">अपॉइन्टमेन्ट बुक गर्नुहोस् — विश्वसनीय चिकित्सकहरूसँग</p>
        <div className="flex flex-col md:flex-row items-center gap-3 text-white text-sm font-light">
          <img className="w-28" src={assets.group_profiles} alt="" />
          <p>
            Simply browse through our extensive list of trusted doctors,
            <br className="hidden sm:block" /> schedule your appointment
            hassle-free.
          </p>
          <p className="text-sm text-white">हाम्रो विश्वसनीय चिकित्सकहरूको सूचीबाट छनोट गरी सहजै अपॉइन्टमेन्ट राख्नुहोस्।</p>
        </div>
        <a
          href="#speciality"
          className="group flex items-center gap-2 bg-white px-8 py-3 rounded-full text-gray-600 text-sm m-auto md:m-0 hover:scale-105 transition-all duration-300"
        >
          Book Appointment
          <img
            className="w-3 transition-transform duration-300 group-hover:translate-x-2"
            src={assets.arrow_icon}
            alt=""
          />
          <span className="sr-only">अपॉइन्टमेन्ट बुक गर्नुहोस्</span>
        </a>
      </div>

      {/* ---------- right side ---------- */}
      <div className="md:w-1/2 relative">
        <img
          className="w-full md:absolute bottom-0 h-auto rounded-lg"
          src={assets.header_img}
          alt=""
        />
      </div>
    </div>
  );
};

export default Hero;
