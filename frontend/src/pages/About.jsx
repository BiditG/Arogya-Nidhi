import { assets } from "../assets/assets_frontend/assets";

const About = () => {
  return (
    <div className="pb-20">

      <div className="mt-10 mx-6 sm:mx-12 flex flex-col md:flex-row gap-10 items-stretch">

        {/* image side */}
        <div className="w-full md:w-[44%] flex-shrink-0 relative">
          <img
            src={assets.about_image}
            alt="About ArogyaNidhi"
            className="w-full h-full object-cover rounded-2xl shadow-md"
          />
          <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold text-gray-700">ArogyaNidhi</p>
            <p className="text-xs text-gray-400 italic mt-0.5">
              आरोग्यनिधि — स्वास्थ्य नै धन हो
            </p>
          </div>
        </div>

        {/* text side */}
        <div className="flex-1 flex flex-col justify-center gap-6">

          <div>
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-primary mb-2">
              Who We Are
            </p>
            <h2 className="text-2xl font-bold text-gray-800 leading-snug">
              Making Healthcare <br /> Accessible for Everyone
            </h2>
          </div>

          <p className="text-sm text-gray-500 leading-7">
            Welcome to <span className="font-semibold text-gray-700">ArogyaNidhi</span> — "Health is Wealth".
            We are a Nepal-based platform located in Kathmandu, committed to making healthcare access
            easier for everyone. We help you find doctors, schedule appointments, and manage health
            records with ease.
          </p>

          <p className="text-sm text-gray-500 leading-7">
            ArogyaNidhi is committed to excellence in healthcare technology.
            We continuously improve our platform to deliver a smooth,
            trustworthy experience for patients, doctors, and administrators.
          </p>

          <p className="text-xs text-gray-400 italic border-l-[3px] border-primary/40 pl-4 leading-relaxed">
            ArogyaNidhi भन्नाले स्वास्थ्य नै सम्पत्ती हो। हामी काठमाडौंमा आधारित सेवा हो,
            जसले चिकित्सक भेटघाट र स्वास्थ्य व्यवस्थापन सजिलो बनाउँछ।
          </p>

          <div className="border border-gray-100 rounded-2xl p-5 bg-gray-50/80">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 rounded-full bg-primary" />
              <p className="font-bold text-gray-800 text-sm">Our Vision</p>
            </div>
            <p className="text-sm text-gray-500 leading-7">
              Our vision is to create a seamless healthcare experience for every user.
              We aim to bridge the gap between patients and healthcare providers so
              you can access care when you need it.
            </p>
            <p className="text-xs text-gray-400 italic mt-3 leading-relaxed">
              हाम्रो लक्ष्य सबैका लागि सहज स्वास्थ्य सेवा उपलब्ध गराउनु हो —
              बिरामी र स्वास्थ्यकर्मीबीचको दूरी घटाउने।
            </p>
          </div>

        </div>
      </div>

      {/* ── Why Choose Us ───────────────────────────────────── */}
      <div className="mt-20 mx-6 sm:mx-12">

        {/* section label */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-10">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-primary mb-2">
              Our Strengths
            </p>
            <h2 className="text-2xl font-bold text-gray-800">
              Why Choose <span className="text-primary">Us</span>
            </h2>
          </div>
          <p className="text-sm text-gray-400 sm:max-w-xs sm:text-right">
            Everything we do is designed around your health and convenience.
          </p>
        </div>

        {/* cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

          {/* Card 1 */}
          <div className="group relative bg-white border border-gray-100 rounded-2xl p-8 flex flex-col gap-5 shadow-sm hover:shadow-lg hover:border-primary/20 hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer">
            <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
            <div className="relative z-10 w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-white/20 flex items-center justify-center transition-colors duration-300">
              <svg className="w-6 h-6 text-primary group-hover:text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div className="relative z-10">
              <p className="font-bold text-gray-800 group-hover:text-white text-base transition-colors duration-300">
                Efficiency
              </p>
              <div className="mt-2 w-8 h-0.5 rounded-full bg-primary group-hover:bg-white/40 transition-colors duration-300" />
            </div>
            <p className="relative z-10 text-sm text-gray-500 group-hover:text-white/80 leading-6 transition-colors duration-300">
              Streamlined appointment scheduling that fits into your busy lifestyle.
            </p>
            <p className="relative z-10 text-xs italic text-gray-400 group-hover:text-white/50 transition-colors duration-300">
              व्यस्त जीवनशैलीमा पनि सहज अपॉइन्टमेन्ट।
            </p>
          </div>

          {/* Card 2 */}
          <div className="group relative bg-white border border-gray-100 rounded-2xl p-8 flex flex-col gap-5 shadow-sm hover:shadow-lg hover:border-primary/20 hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer">
            <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
            <div className="relative z-10 w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-white/20 flex items-center justify-center transition-colors duration-300">
              <svg className="w-6 h-6 text-primary group-hover:text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
              </svg>
            </div>
            <div className="relative z-10">
              <p className="font-bold text-gray-800 group-hover:text-white text-base transition-colors duration-300">
                Convenience
              </p>
              <div className="mt-2 w-8 h-0.5 rounded-full bg-primary group-hover:bg-white/40 transition-colors duration-300" />
            </div>
            <p className="relative z-10 text-sm text-gray-500 group-hover:text-white/80 leading-6 transition-colors duration-300">
              Access to a network of trusted healthcare professionals in your area.
            </p>
            <p className="relative z-10 text-xs italic text-gray-400 group-hover:text-white/50 transition-colors duration-300">
              नजिकैका विश्वसनीय स्वास्थ्यकर्मीसँग सम्पर्क।
            </p>
          </div>

          {/* Card 3 */}
          <div className="group relative bg-white border border-gray-100 rounded-2xl p-8 flex flex-col gap-5 shadow-sm hover:shadow-lg hover:border-primary/20 hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer">
            <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
            <div className="relative z-10 w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-white/20 flex items-center justify-center transition-colors duration-300">
              <svg className="w-6 h-6 text-primary group-hover:text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
              </svg>
            </div>
            <div className="relative z-10">
              <p className="font-bold text-gray-800 group-hover:text-white text-base transition-colors duration-300">
                Personalization
              </p>
              <div className="mt-2 w-8 h-0.5 rounded-full bg-primary group-hover:bg-white/40 transition-colors duration-300" />
            </div>
            <p className="relative z-10 text-sm text-gray-500 group-hover:text-white/80 leading-6 transition-colors duration-300">
              Tailored recommendations and reminders to help you stay on top of your health.
            </p>
            <p className="relative z-10 text-xs italic text-gray-400 group-hover:text-white/50 transition-colors duration-300">
              तपाईंको स्वास्थ्यका लागि व्यक्तिगत सुझाव।
            </p>
          </div>

        </div>
      </div>

    </div>
  );
};

export default About;
