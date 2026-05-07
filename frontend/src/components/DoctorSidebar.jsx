import { NavLink } from "react-router-dom";
import {
  HomeIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  SparklesIcon,
  BanknotesIcon,
  DocumentTextIcon,
  ChatBubbleOvalLeftEllipsisIcon,
} from "@heroicons/react/24/outline";
import "./PatientSidebar.css";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/doctor-portal", end: true, Icon: HomeIcon },
  { label: "Appointments", to: "/doctor-portal/appointments", Icon: CalendarDaysIcon },
  { label: "Consultations", to: "/doctor-portal/consultations", Icon: ChatBubbleLeftRightIcon },
  { label: "Patient History", to: "/doctor-portal/patient-history", Icon: ClipboardDocumentListIcon },
  { label: "Health Queries", to: "/doctor-portal/health-queries", Icon: ChatBubbleOvalLeftEllipsisIcon },
  { label: "AI Summaries", to: "/doctor-portal/ai-summaries", Icon: SparklesIcon },
  { label: "Earnings", to: "/doctor-portal/earnings", Icon: BanknotesIcon },
  { label: "Reports", to: "/doctor-portal/reports", Icon: DocumentTextIcon },
];

const DoctorSidebar = () => (
  <aside className="ps-sidebar">
    <ul className="ps-menu-list">
      {NAV_ITEMS.map(({ label, to, end, Icon }) => (
        <li key={to} className="ps-menu-item">
          <NavLink to={to} end={end} className={({ isActive }) => `ps-menu-link${isActive ? " active" : ""}`}>
            <Icon className="ps-menu-icon" />
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  </aside>
);

export default DoctorSidebar;
