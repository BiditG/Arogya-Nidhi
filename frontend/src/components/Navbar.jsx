import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { assets } from "../assets/assets_frontend/assets";
import { assets as adminAssets } from "../assets/assets_admin/assets";
import { useEffect, useRef, useState } from "react";
import { useContext } from "react";
import { AppContext } from "../context/AppContext";
import { LANGUAGE_OPTIONS, useLanguage } from "../utils/language";

const navLinks = [
  { title: "Home", path: "/" },
  { title: "All Doctors", path: "/doctors" },
  { title: "Chat", path: "/public-queries" },
  { title: "About", path: "/about" },
  { title: "Contact", path: "/contact" },
];

const PORTAL_ROUTES = ["/patient-portal", "/doctor-portal", "/student-portal", "/admin-portal", "/iot"];

const Avatar = ({ userData }) => {
  const img = userData?.image || userData?.user?.avatarUrl || userData?.user?.avatar_url || null;
  const role = userData?.role || userData?.user?.role || null;
  const displayName = userData?.name || userData?.user?.name || userData?.email || userData?.user?.email || "";
  const initials = displayName.split(" ").filter(Boolean).map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  if (img)
    return <img style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} src={img} alt="profile" />;
  if (role === "doctor")
    return (
      <img
        style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", background: "#f1f5f9", padding: 4 }}
        src={adminAssets.doctor_icon}
        alt="doctor"
      />
    );
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: "#dbeafe",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        fontWeight: 700,
        color: "#1e40af",
      }}
    >
      {initials || "U"}
    </div>
  );
};

const LanguageSwitcher = () => {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useLanguage();
  const ref = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const currentLanguage = LANGUAGE_OPTIONS.find((option) => option.value === language) || LANGUAGE_OPTIONS[0];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: open ? "#eff6ff" : "transparent",
          border: "1px solid #e2e8f0",
          borderRadius: "9999px",
          padding: "0.5rem 0.8rem",
          cursor: "pointer",
          color: "#334155",
          fontSize: "0.875rem",
          fontWeight: 600,
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.background = "#f8fafc"; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.background = "transparent"; }}
      >
        <span>{currentLanguage.label}</span>
        <svg
          style={{ width: 12, height: 12, color: "#94a3b8", transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "0.75rem",
            boxShadow: "0 12px 30px -18px rgb(15 23 42 / 0.45)",
            minWidth: 160,
            zIndex: 200,
            overflow: "hidden",
          }}
        >
          {LANGUAGE_OPTIONS.map((option) => {
            const active = option.value === language;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setLanguage(option.value);
                  setOpen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "0.7rem 1rem",
                  background: active ? "#eff6ff" : "transparent",
                  border: "none",
                  fontSize: "0.875rem",
                  fontWeight: active ? 700 : 500,
                  color: active ? "#1d4ed8" : "#374151",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#f8fafc"; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ── Portal Navbar ─────────────────────────────────────────── */
const PortalNavbar = ({ token, userData, logout }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const logoutFunc = async () => { await logout(); navigate("/"); };

  const role = userData?.role || userData?.user?.role;
  const goToDashboard = () => {
    if (role === "doctor") navigate("/doctor-portal");
    else if (role === "admin") navigate("/admin-portal");
    else if (role === "student") navigate("/student-portal");
    else navigate("/patient-portal");
  };

  return (
    <div
      style={{
        background: "#ffffff",
        borderBottom: "1px solid #e2e8f0",
        padding: "0 2rem",
        height: 65,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      }}
    >
      <Link to="/" onClick={goToDashboard} style={{ lineHeight: 0 }}>
        <img style={{ width: 140, cursor: "pointer" }} src={assets.logo} alt="ArogyaNidhi" />
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <LanguageSwitcher />

        <Link
          to="/public-queries"
          style={{
            textDecoration: "none",
            color: "#64748b",
            fontSize: "0.875rem",
            fontWeight: 500,
            padding: "0.5rem 0.875rem",
            borderRadius: "0.375rem",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.color = "#1e40af"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#64748b"; }}
        >
          All Chat
        </Link>

        {token ? (
          userData ? (
            <div ref={ref} style={{ position: "relative" }}>
              <button
                onClick={() => setOpen((v) => !v)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: open ? "#eff6ff" : "transparent",
                  border: "none",
                  borderRadius: "0.5rem",
                  padding: "5px 10px 5px 6px",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <Avatar userData={userData} />
                <svg
                  style={{ width: 12, height: 12, color: "#94a3b8", transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {open && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "0.5rem",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    minWidth: 160,
                    zIndex: 200,
                    overflow: "hidden",
                  }}
                >
                  {[
                    {
                      label: "My Profile",
                      action: () => {
                        const r = userData?.role || userData?.user?.role;
                        if (r === "doctor") navigate("/doctor-portal/profile");
                        else navigate("/profile");
                        setOpen(false);
                      },
                    },
                    { label: "Logout", action: () => { logoutFunc(); setOpen(false); }, danger: true },
                  ].map(({ label, action, danger }) => (
                    <button
                      key={label}
                      onClick={action}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "0.625rem 1rem",
                        background: "transparent",
                        border: "none",
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        color: danger ? "#dc2626" : "#374151",
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = danger ? "#fef2f2" : "#f8fafc"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* token exists but userData still loading — show placeholder so Login never flashes */
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "#e2e8f0",
                animation: "sp-pulse 1.5s ease-in-out infinite",
              }}
            />
          )
        ) : (
          <button
            onClick={() => navigate("/login")}
            style={{
              background: "#1e40af",
              color: "#fff",
              border: "none",
              borderRadius: "0.375rem",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Login
          </button>
        )}
      </div>
    </div>
  );
};

/* ── Main Navbar ───────────────────────────────────────────── */
const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, setToken, userData, logout } = useContext(AppContext);
  const [showMenu, setShowMenu] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(false);

  const isPortal = PORTAL_ROUTES.some((r) => location.pathname.startsWith(r));

  if (isPortal) {
    return <PortalNavbar token={token} userData={userData} logout={logout} />;
  }

  const logoutFunc = async () => { await logout(); navigate("/"); };

  return (
    <div className="flex items-center justify-between text-sm py-4 px-4 sm:px-10 mb-5 border-b border-b-gray-400 bg-white sticky top-0 z-50">
      <Link to="/">
        <img className="w-44 cursor-pointer" src={assets.logo} alt="" />
      </Link>
      <ul className="hidden md:flex items-start gap-5 font-medium uppercase">
        {navLinks.map((nav, index) => (
          <NavLink key={index} to={nav.path}>
            <li className="py-1">{nav.title}</li>
            <hr className="hidden border-none outline-none h-0.5 bg-primary w-3/5 m-auto" />
          </NavLink>
        ))}
      </ul>

      <div className="flex items-center gap-4">
        <LanguageSwitcher />

        {token && userData ? (
          <div
            className="flex items-center gap-2 cursor-pointer group relative"
            onClick={() => setOpenDropdown(!openDropdown)}
          >
            {(() => {
              const img = userData.image || userData?.user?.avatarUrl || userData?.user?.avatar_url || null;
              const role = userData?.role || userData?.user?.role || null;
              const displayName = userData?.name || userData?.user?.name || userData?.email || userData?.user?.email || "";
              const initials = displayName.split(" ").filter(Boolean).map((s) => s[0]).slice(0, 2).join("").toUpperCase();
              if (img) return <img className="w-8 h-8 rounded-full object-cover" src={img} alt="user profile pic" />;
              if (role === "doctor")
                return <img className="w-8 h-8 rounded-full object-cover bg-gray-100 p-1" src={adminAssets.doctor_icon} alt="doctor icon" />;
              return (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700">
                  {initials || "U"}
                </div>
              );
            })()}
            <img className="w-2.5" src={assets.dropdown_icon} alt="" />
            <div className={`${openDropdown ? "block" : "hidden"} absolute top-0 right-0 pt-14 text-base font-medium text-gray-600 z-20`}>
              <div className="min-w-48 bg-stone-100 rounded flex flex-col gap-4 p-4">
                {(() => {
                  const role = userData?.role || userData?.user?.role;
                  const goToDashboard = () => {
                    if (role === "doctor") navigate("/doctor-portal");
                    else if (role === "admin") navigate("/admin-portal");
                    else if (role === "student") navigate("/student-portal");
                    else navigate("/patient-portal");
                  };
                  return <p onClick={goToDashboard} className="hover:text-black cursor-pointer">Dashboard</p>;
                })()}
                <p onClick={() => navigate("/profile")} className="hover:text-black cursor-pointer">My Profile</p>
                <p onClick={() => navigate("/my-appointments")} className="hover:text-black cursor-pointer">My Appointments</p>
                <p onClick={logoutFunc} className="hover:text-black cursor-pointer">Logout</p>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="bg-primary text-white px-8 py-3 rounded-full font-light hidden md:block"
          >
            Login
          </button>
        )}

        <img onClick={() => setShowMenu(true)} className="w-6 cursor-pointer md:hidden" src={assets.menu_icon} alt="menu icon" />
        <div className={`${showMenu ? "fixed w-full" : "h-0 w-0"} md:hidden right-0 top-0 bottom-0 z-20 overflow-hidden bg-white transition-all duration-300`}>
          <div className="flex items-center justify-between px-5 py-6">
            <Link onClick={() => setShowMenu(false)} to="/"><img className="w-36" src={assets.logo} /></Link>
            <img className="w-7 cursor-pointer" onClick={() => setShowMenu(false)} src={assets.cross_icon} alt="cross icon" />
          </div>
          <ul className="flex flex-col items-center gap-2 mt-5 px-5 text-lg font-medium">
            {navLinks.map((nav, index) => (
              <NavLink onClick={() => setShowMenu(false)} key={index} to={nav.path}>
                <p className="px-4 py-2 rounded inline-block">{nav.title}</p>
              </NavLink>
            ))}
            <li className="w-full px-4 pt-3">
              <div className="flex justify-center">
                <LanguageSwitcher />
              </div>
            </li>
            {!token && (
              <li>
                <button
                  onClick={() => { setShowMenu(false); navigate("/login"); }}
                  className={`px-6 py-2 rounded ${location.pathname === "/login" ? "bg-primary text-white" : "bg-transparent text-black"}`}
                >
                  Login
                </button>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
