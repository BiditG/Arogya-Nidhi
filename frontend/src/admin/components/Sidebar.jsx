import { useContext } from "react";
import { AdminContext } from "../context/AdminContext";
import { NavLink } from "react-router-dom";
import { DoctorContext } from "../context/DoctorContext";
import {
  Squares2X2Icon,
  UsersIcon,
  ShieldCheckIcon,
  DocumentChartBarIcon,
  CreditCardIcon,
  BanknotesIcon,
  CpuChipIcon,
  CalendarDaysIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import "../styles/AdminPortal.css";

const adminNavLinks = [
  { to: "/admin-portal/admin/dashboard", Icon: Squares2X2Icon, label: "Dashboard" },
  { to: "/admin-portal/admin/manage-users", Icon: UsersIcon, label: "Manage Users" },
  { to: "/admin-portal/admin/verify-doctors", Icon: ShieldCheckIcon, label: "Verify Doctors" },
  { to: "/admin-portal/admin/system-reports", Icon: DocumentChartBarIcon, label: "System Reports" },
  { to: "/admin-portal/admin/subscriptions", Icon: CreditCardIcon, label: "Subscriptions" },
  { to: "/admin-portal/admin/revenue", Icon: BanknotesIcon, label: "Revenue" },
  { to: "/admin-portal/admin/ai-triage", Icon: CpuChipIcon, label: "AI Triage" },
];

const doctorNavLinks = [
  { to: "/admin-portal/doctor/dashboard", Icon: Squares2X2Icon, label: "Dashboard" },
  { to: "/admin-portal/doctor/appointments", Icon: CalendarDaysIcon, label: "My Appointments" },
  { to: "/admin-portal/doctor/profile", Icon: UserCircleIcon, label: "Profile" },
];

const Sidebar = () => {
  const { aToken } = useContext(AdminContext);
  const { dToken } = useContext(DoctorContext);

  const navLinks = aToken ? adminNavLinks : doctorNavLinks;
  return (
    <aside className="ap-sidebar" style={sidebarStyle}>
      {(aToken || dToken) && (
        <nav className="ap-sidebar-nav">
          <ul style={navListStyle}>
            {navLinks.map(({ to, Icon, label }) => (
              <li key={to} style={navItemStyle}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `ap-nav-link ${isActive ? "ap-nav-link-active" : ""}`
                  }
                  style={({ isActive }) => ({
                    ...navLinkStyle,
                    backgroundColor: isActive ? "var(--ap-primary-lighter)" : "transparent",
                    color: isActive ? "var(--ap-primary)" : "var(--ap-text-secondary)",
                    borderLeftColor: isActive ? "var(--ap-primary)" : "transparent",
                    fontWeight: isActive ? "600" : "500",
                  })}
                >
                  <Icon style={{ width: "18px", height: "18px", flexShrink: 0, strokeWidth: 1.75 }} />
                  <span style={navLabelStyle}>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </aside>
  );
};

const sidebarStyle = {
  minHeight: "100vh",
  width: "280px",
  backgroundColor: "var(--ap-surface)",
  borderRight: "1px solid var(--ap-border)",
  display: "flex",
  flexDirection: "column",
  position: "fixed",
  left: 0,
  top: "65px",
  height: "calc(100vh - 65px)",
  overflowY: "auto",
  zIndex: 40,
};

const navListStyle = {
  listStyle: "none",
  margin: 0,
  padding: "1rem 0.75rem",
};

const navItemStyle = {
  marginBottom: "0.25rem",
};

const navLinkStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.875rem",
  padding: "0.75rem 1rem",
  borderRadius: "0.5rem",
  cursor: "pointer",
  textDecoration: "none",
  fontSize: "0.875rem",
  transition: "all 0.2s",
  borderLeft: "3px solid transparent",
};

const navLabelStyle = {
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

export default Sidebar;
