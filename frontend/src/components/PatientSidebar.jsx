import { NavLink } from "react-router-dom";
import {
  HomeIcon,
  SparklesIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  SignalIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import "./PatientSidebar.css";

const NAV_ITEMS = [
  { label: "Dashboard",       to: "/patient-portal",                     end: true, Icon: HomeIcon },
  { label: "AI Assistant",    to: "/patient-portal/ai-assistant",                   Icon: SparklesIcon },
  { label: "Appointments",    to: "/patient-portal/book-appointment",               Icon: CalendarDaysIcon },
  { label: "Medical History", to: "/patient-portal/medical-history",                Icon: ClipboardDocumentListIcon },
  { label: "IoT Devices",     to: "/iot",                                end: true, Icon: SignalIcon },
  { label: "Health Queries",  to: "/patient-portal/health-queries",                Icon: ChatBubbleLeftRightIcon  },
  {label: "Prescriptions",  to: "/patient-portal/prescriptions",                Icon: ClipboardDocumentListIcon  },
];

const PatientSidebar = () => (
  <aside className="ps-sidebar">
    <ul className="ps-menu-list">
      {NAV_ITEMS.map(({ label, to, end, Icon }) => (
        <li key={to} className="ps-menu-item">
          <NavLink
            to={to}
            end={end}
            className={({ isActive }) => `ps-menu-link${isActive ? " active" : ""}`}
          >
            <Icon className="ps-menu-icon" />
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  </aside>
);

export default PatientSidebar;
