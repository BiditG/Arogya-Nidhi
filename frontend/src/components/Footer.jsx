import { assets } from "../assets/assets_frontend/assets";

const Footer = () => {
  return (
    <footer className="relative px-4 pb-6 pt-10 sm:px-10">
      <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white px-6 py-10 shadow-[0_12px_35px_-24px_rgba(15,23,42,0.22)] sm:px-10 sm:py-12">

        <div className="flex flex-col gap-12 text-sm sm:grid grid-cols-[3fr_1fr_1fr] sm:gap-14">
          <div>
            <img className="mb-5 w-40 drop-shadow-sm" src={assets.logo} alt="ArogyaNidhi logo" />
            <p className="w-full leading-7 text-slate-600 md:w-2/3">
              ArogyaNidhi — Health is Wealth. A Kathmandu-based platform
              connecting patients and healthcare providers to make booking and
              care management easier.
            </p>
            <div className="mt-5 inline-flex items-center rounded-full border border-sky-200 bg-white/80 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.2em] text-sky-700 shadow-sm">
              Trusted care, simplified booking
            </div>
            <p className="mt-4 w-full md:w-2/3 text-sm leading-6 text-slate-500">
              <em>आरोग्यनिधि — स्वास्थ्य नै धन हो। काठमाडौं स्थित सेवा।</em>
            </p>
          </div>

          <div>
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.22em] text-slate-900">
              Company
            </p>
            <ul className="flex flex-col gap-3 text-slate-600">
              <li className="transition-colors duration-200 hover:text-primary">Home</li>
              <li className="transition-colors duration-200 hover:text-primary">About us</li>
              <li className="transition-colors duration-200 hover:text-primary">Contact us</li>
              <li className="transition-colors duration-200 hover:text-primary">Privacy Policy</li>
            </ul>
          </div>

          <div>
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.22em] text-slate-900">
              Get in touch
            </p>
            <ul className="flex flex-col gap-3 text-slate-600">
              <li>Phone: +977 9803526374</li>
              <li>Kathmandu, Nepal</li>
              <li>info@arogyanidhi.com</li>
              <li className="text-sm italic text-slate-500">फोन: +977 9803526374</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200/80 pt-5">
          <p className="text-center text-sm text-slate-600">
            Copyright © {new Date().getFullYear()} {" "}
            <a className="font-semibold text-slate-900 transition-colors duration-200 hover:text-primary" href="#">
              ArogyaNidhi
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
