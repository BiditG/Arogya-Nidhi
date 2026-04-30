import { Routes, Route, NavLink } from "react-router-dom";
import { useContext } from "react";
import { AdminContext } from "../context/AdminContext";
import { ArrowRightStartOnRectangleIcon } from "@heroicons/react/24/outline";
import Sidebar from "../components/Sidebar";
import Dashboard from "../pages/admin/Dashboard";
import AllAppointments from "../pages/admin/AllAppointments";
import AddDoctor from "../pages/admin/AddDoctor";
import DoctorsList from "../pages/admin/DoctorsList";
import ManageUsers from "../pages/admin/ManageUsers";
import DoctorVerification from "../pages/admin/DoctorVerification";
import SystemReports from "../pages/admin/SystemReports";
import SubscriptionManagement from "../pages/admin/SubscriptionManagement";
import RevenueManagement from "../pages/admin/RevenueManagement";
import AITriageSystem from "../pages/admin/AITriageSystem";
import NotAuthorized from "../pages/auth/NotAuthorized";
import "../styles/AdminPortal.css";

const AdminTopbar = () => {
  const { setAToken } = useContext(AdminContext);
  const handleLogout = () => {
    setAToken("");
    localStorage.removeItem("aToken");
  };
  return (
    <header className="ap-header">
      <span className="ap-logo">Admin Portal</span>
      <nav>
        <ul className="ap-nav-top">
          <li><NavLink to="/admin/dashboard">Dashboard</NavLink></li>
          <li><NavLink to="/admin/system-reports">Reports</NavLink></li>
          <li>
            <button className="ap-link-button" onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <ArrowRightStartOnRectangleIcon style={{ width: "16px", height: "16px", strokeWidth: 2 }} />
              Logout
            </button>
          </li>
        </ul>
      </nav>
    </header>
  );
};

const AdminLayout = () => (
  <div className="ap-page" style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
    <AdminTopbar />
    <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
      <Sidebar />
      <main className="ap-main-content" style={{ marginLeft: "280px", flex: 1, marginTop: 0, minHeight: 0, height: "100%" }}>
        <Routes>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="all-appointments" element={<AllAppointments />} />
          <Route path="add-doctor" element={<AddDoctor />} />
          <Route path="doctors-list" element={<DoctorsList />} />
          <Route path="manage-users" element={<ManageUsers />} />
          <Route path="verify-doctors" element={<DoctorVerification />} />
          <Route path="system-reports" element={<SystemReports />} />
          <Route path="subscriptions" element={<SubscriptionManagement />} />
          <Route path="revenue" element={<RevenueManagement />} />
          <Route path="ai-triage" element={<AITriageSystem />} />

          <Route path="*" element={<NotAuthorized />} />
        </Routes>
      </main>
    </div>
  </div>
);

export default AdminLayout;
