import { assets } from "../assets/assets_frontend/assets";

const Contact = () => {
  return (
    <div className="pb-20">
      <div className="mt-10 mx-6 sm:mx-12 flex flex-col md:flex-row gap-10 items-stretch mb-10">

        {/* image side */}
        <div className="w-full md:w-[44%] flex-shrink-0 relative">
          <img
            src={assets.contact_image}
            alt="Contact ArogyaNidhi"
            className="w-full h-full object-cover rounded-2xl shadow-md"
          />
          <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold text-gray-700">ArogyaNidhi</p>
            <p className="text-xs text-gray-400 italic mt-0.5">
              काठमाडौं, नेपाल — हामी यहाँ छौं
            </p>
          </div>
        </div>

        {/* info side */}
        <div className="flex-1 flex flex-col justify-center gap-7">

          {/* Our Office */}
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-primary mb-2">
              Our Office
            </p>
            <h2 className="text-2xl font-bold text-gray-800 leading-snug mb-5">
              Find Us <span className="text-primary">Here</span>
            </h2>

            <div className="flex flex-col gap-4">

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Address</p>
                  <p className="text-sm text-gray-700 font-medium mt-0.5">Kathmandu, Nepal</p>
                  <p className="text-xs text-gray-400 italic mt-0.5">काठमाडौं, नेपाल</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</p>
                  <p className="text-sm text-gray-700 font-medium mt-0.5">+977 9803526374</p>
                  <p className="text-xs text-gray-400 italic mt-0.5">फोन: +977 9803526374</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</p>
                  <p className="text-sm text-gray-700 font-medium mt-0.5">mahmudalam.official@gmail.com</p>
                </div>
              </div>

            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100" />

          {/* Careers */}
          <div className="border border-gray-100 rounded-2xl p-5 bg-gray-50/80 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full bg-primary" />
              <p className="font-bold text-gray-800 text-sm uppercase tracking-wide">Careers at ArogyaNidhi</p>
            </div>
            <p className="text-sm text-gray-500 leading-6">
              Learn more about our teams and job openings. Join us in building Nepal's most trusted healthcare platform.
            </p>
            <button className="self-start mt-1 border border-primary text-primary text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-primary hover:text-white transition-all duration-300">
              Explore Jobs
            </button>
          </div>

        </div>
      </div>

    </div>
  );
};

export default Contact;
