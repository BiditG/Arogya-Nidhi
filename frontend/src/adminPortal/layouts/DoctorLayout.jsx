import { Routes, Route } from "react-router-dom";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import DoctorDashboard from "../pages/doctor/DoctorDashboard";
import DoctorAppointments from "../pages/doctor/DoctorAppointments";
import DoctorProfile from "../pages/doctor/DoctorProfile";
import NotAuthorized from "../pages/auth/NotAuthorized";
import "../styles/AdminPortal.css";

const DoctorLayout = () => (
  <div className="ap-page" style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
    <Navbar />
    <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
      <Sidebar />
      <main className="ap-main-content" style={{ marginLeft: "280px", flex: 1, minHeight: 0, height: "100%" }}>
        <Routes>
          <Route path="dashboard" element={<DoctorDashboard />} />
          <Route path="appointments" element={<DoctorAppointments />} />
          <Route path="profile" element={<DoctorProfile />} />
          <Route path="*" element={<NotAuthorized />} />
        </Routes>
      </main>
    </div>
  </div>
);

export default DoctorLayout;
