import { assets } from "../assets/assets_frontend/assets";
const Footer = () => {
  return (
    <div className="px-4 sm:px-10">
      <div className="flex flex-col sm:grid grid-cols-[3fr_1fr_1fr] gap-14 my-10 mt-40 text-sm">
        {/* ---------- Section 01 ---------- */}
        <div>
          <img className="mb-5 w-40" src={assets.logo} alt="" />
          <p className="w-full md:w-2/3 text-gray-600 leading-6">
            ArogyaNidhi — Health is Wealth. A Kathmandu-based platform
            connecting patients and healthcare providers to make booking and
            care management easier.
          </p>
          <p className="w-full md:w-2/3 text-gray-500 leading-6 mt-2 text-sm">
            <em>अारोग्यनिधि — स्वास्थ्य नै धन हो। काठमाडौं स्थित सेवा।</em>
          </p>
        </div>

        {/* ---------- Section 02 ---------- */}
        <div>
          <p className="text-xl font-medium mb-5">COMPANY</p>
          <ul className="flex flex-col gap-2 text-gray-600">
            <li>Home</li>
            <li>About us</li>
            <li>Contact us</li>
            <li>Privacy Policy</li>
          </ul>
        </div>

        {/* ---------- Section 03 ---------- */}
        <div>
          <p className="text-xl font-medium mb-5">GET IN TOUCH</p>
          <ul className="flex flex-col gap-2 text-gray-600">
            <li>Phone: +977 9803526374</li>
            <li>Kathmandu, Nepal</li>
            <li>info@arogyanidhi.com</li>
            <li className="text-sm text-gray-500 italic">फोन: +977 9803526374</li>
          </ul>
        </div>
      </div>
      {/* ---------- Copyright Section ---------- */}
      <div>
        <hr />
        <p className="py-5 text-sm text-center ">
          Copyright © {new Date().getFullYear()}{" "}
          <a className="hover:text-primary font-bold" href="#">AarogyaNidhi</a>.
        </p>
      </div>
    </div>
  );
};

export default Footer;
