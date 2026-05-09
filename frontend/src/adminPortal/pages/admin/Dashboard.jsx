import { useContext, useEffect } from "react";
import { UsersIcon, UserGroupIcon, AcademicCapIcon, HeartIcon } from "@heroicons/react/24/outline";
import "../../styles/AdminPortal.css";
import { AdminContext } from "../../context/AdminContext";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const { dashData, getDashData, users, getAllUsers } = useContext(AdminContext);

  useEffect(() => {
    getDashData();
    getAllUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = [
    { label: "Total Users", value: dashData?.totalUsers ?? "—", Icon: UsersIcon },
    { label: "Total Doctors", value: dashData?.totalDoctors ?? "—", Icon: UserGroupIcon },
    { label: "Total Students", value: dashData?.totalStudents ?? "—", Icon: AcademicCapIcon },
    { label: "Total Patients", value: dashData?.totalPatients ?? "—", Icon: HeartIcon },
  ];

  return (
    <div style={{ fontFamily: "Outfit, sans-serif" }}>
      <div style={{ marginBottom: "2rem" }}>
        <p style={{ margin: "0 0 0.25rem", fontSize: "0.8125rem", color: "var(--ap-text-muted)", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Admin Portal
        </p>
        <h1 style={{ margin: "0 0 0.375rem", fontSize: "1.875rem", fontWeight: "700", color: "var(--ap-text-primary)" }}>
          Dashboard
        </h1>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--ap-text-secondary)" }}>
          System overview
        </p>
      </div>

      <section className="ap-section">
        <h2 className="ap-section-title">System Overview</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
          {stats.map((s, i) => (
            <div className="ap-stat-card" key={i}>
              <div className="ap-stat-icon">
                <s.Icon style={{ width: "22px", height: "22px", strokeWidth: 1.75 }} />
              </div>
              <div className="ap-stat-content">
                <p style={{ margin: "0 0 0.2rem", fontSize: "0.6875rem", fontWeight: "700", color: "var(--ap-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {s.label}
                </p>
                <p style={{ margin: "0 0 0.3rem", fontSize: "1.5rem", fontWeight: "700", color: "var(--ap-primary)", lineHeight: 1 }}>
                  {s.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pending Doctor Verifications (kept) */}
      <section className="ap-section">
        <h2 className="ap-section-title">Pending Doctor Verifications</h2>
        <div className="ap-list">
          <p style={{ color: "var(--ap-text-secondary)", margin: 0 }}>Open the <Link to="/admin-portal/admin/verify-doctors">Verify Doctors</Link> page to review pending verifications.</p>
        </div>
      </section>

      {/* User Management (dynamic) */}
      <section className="ap-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 className="ap-section-title" style={{ margin: 0 }}>User Management</h2>
          <div className="ap-button-group">
            <Link to="/admin-portal/admin/manage-users" className="ap-btn ap-btn-primary ap-btn-sm">Manage Users</Link>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
          <div className="ap-card" style={{ cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.875rem" }}>
              <div className="ap-stat-icon"><UsersIcon style={{ width: 22, height: 22 }} /></div>
              <div>
                <p style={{ margin: 0, fontWeight: "700", fontSize: "0.9375rem", color: "var(--ap-text-primary)" }}>All Users</p>
                <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--ap-text-secondary)" }}>Latest users</p>
              </div>
            </div>
            <p style={{ margin: "0 0 1rem", fontSize: "1.75rem", fontWeight: "700", color: "var(--ap-primary)" }}>{users?.length ?? "—"}</p>
            <Link to="/admin-portal/admin/manage-users" className="ap-btn ap-btn-secondary ap-btn-full ap-btn-sm">View All</Link>
          </div>

          <div className="ap-card" style={{ cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.875rem" }}>
              <div className="ap-stat-icon"><UserGroupIcon style={{ width: 22, height: 22 }} /></div>
              <div>
                <p style={{ margin: 0, fontWeight: "700", fontSize: "0.9375rem", color: "var(--ap-text-primary)" }}>Doctors</p>
                <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--ap-text-secondary)" }}>Verified & pending</p>
              </div>
            </div>
            <p style={{ margin: "0 0 1rem", fontSize: "1.75rem", fontWeight: "700", color: "var(--ap-primary)" }}>{dashData?.totalDoctors ?? "—"}</p>
            <Link to="/admin-portal/admin/verify-doctors" className="ap-btn ap-btn-secondary ap-btn-full ap-btn-sm">View Doctors</Link>
          </div>

          <div className="ap-card" style={{ cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.875rem" }}>
              <div className="ap-stat-icon"><AcademicCapIcon style={{ width: 22, height: 22 }} /></div>
              <div>
                <p style={{ margin: 0, fontWeight: "700", fontSize: "0.9375rem", color: "var(--ap-text-primary)" }}>Students</p>
                <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--ap-text-secondary)" }}>Enrolled students</p>
              </div>
            </div>
            <p style={{ margin: "0 0 1rem", fontSize: "1.75rem", fontWeight: "700", color: "var(--ap-primary)" }}>{dashData?.totalStudents ?? "—"}</p>
            <Link to="/admin-portal/admin/manage-users" className="ap-btn ap-btn-secondary ap-btn-full ap-btn-sm">View Students</Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
