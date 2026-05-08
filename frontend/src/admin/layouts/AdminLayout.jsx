import { Routes, Route } from "react-router-dom";
import Navbar from "../components/Navbar";
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

const AdminLayout = () => (
  <div className="ap-page" style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
    <Navbar />
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
