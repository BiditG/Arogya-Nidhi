import { useContext, useEffect } from "react";
import {
  UsersIcon,
  UserGroupIcon,
  AcademicCapIcon,
  HeartIcon,
  CalendarDaysIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import { AdminContext } from "../../context/AdminContext";
import "../../styles/AdminPortal.css";

const formatCurrency = (value) => `Rs ${Number(value || 0).toLocaleString()}`;

const formatValue = (value) => (value ?? value === 0 ? value : "—");

const Dashboard = () => {
  const { dashData, getDashData, users, getAllUsers } = useContext(AdminContext);

  useEffect(() => {
    getDashData();
    getAllUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overviewStats = [
    { label: "Total Users", value: formatValue(dashData?.totalUsers), Icon: UsersIcon },
    { label: "Total Doctors", value: formatValue(dashData?.totalDoctors), Icon: UserGroupIcon },
    { label: "Total Students", value: formatValue(dashData?.totalStudents), Icon: AcademicCapIcon },
    { label: "Total Patients", value: formatValue(dashData?.totalPatients), Icon: HeartIcon },
    { label: "Total Earnings", value: formatCurrency(dashData?.totalEarnings), Icon: BanknotesIcon },
  ];

  const systemStats = [
    { label: "Appointments", value: formatValue(dashData?.totalAppointments), Icon: CalendarDaysIcon },
    { label: "Paid Bookings", value: formatValue(dashData?.paidBookingCount), Icon: BanknotesIcon },
    { label: "This Month", value: formatCurrency(dashData?.thisMonthEarnings), Icon: BanknotesIcon },
    { label: "Doctors", value: formatValue(dashData?.totalDoctors), Icon: UserGroupIcon },
    { label: "Patients", value: formatValue(dashData?.totalPatients), Icon: HeartIcon },
  ];

  const recentUsers = (users || []).slice(0, 6);

  return (
    <div style={{ fontFamily: "Outfit, sans-serif" }}>
      <div style={{ marginBottom: "2rem" }}>
        <p
          style={{
            margin: "0 0 0.25rem",
            fontSize: "0.8125rem",
            color: "var(--ap-text-muted)",
            fontWeight: "500",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
          {overviewStats.map((stat) => (
            <div className="ap-stat-card" key={stat.label}>
              <div className="ap-stat-icon">
                <stat.Icon style={{ width: "22px", height: "22px", strokeWidth: 1.75 }} />
              </div>
              <div className="ap-stat-content">
                <p
                  style={{
                    margin: "0 0 0.2rem",
                    fontSize: "0.6875rem",
                    fontWeight: "700",
                    color: "var(--ap-text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {stat.label}
                </p>
                <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: "700", color: "var(--ap-primary)", lineHeight: 1 }}>
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="ap-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 className="ap-section-title" style={{ margin: 0 }}>
            System Statistics
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
          {systemStats.map((stat) => (
            <div className="ap-card" key={stat.label}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.875rem" }}>
                <div className="ap-stat-icon">
                  <stat.Icon style={{ width: "22px", height: "22px", strokeWidth: 1.75 }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: "700", fontSize: "0.9375rem", color: "var(--ap-text-primary)" }}>
                    {stat.label}
                  </p>
                  <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--ap-text-secondary)" }}>
                    Live count
                  </p>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: "1.75rem", fontWeight: "700", color: "var(--ap-primary)" }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="ap-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 className="ap-section-title" style={{ margin: 0 }}>
            User Management
          </h2>
          <Link to="/admin-portal/admin/manage-users" className="ap-btn ap-btn-primary ap-btn-sm">
            Manage Users
          </Link>
        </div>
        <div className="ap-table">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.length ? (
                recentUsers.map((user) => (
                  <tr key={user.id}>
                    <td style={{ fontWeight: 600 }}>{user.name || user.full_name || "Unnamed user"}</td>
                    <td style={{ color: "var(--ap-text-secondary)" }}>{user.email || "—"}</td>
                    <td>{user.role || user.user_role || "—"}</td>
                    <td>
                      <span className="ap-badge ap-badge-verified">
                        {user.is_active === false ? "Inactive" : "Active"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ color: "var(--ap-text-secondary)" }}>
                    No users loaded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ap-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 className="ap-section-title" style={{ margin: 0 }}>
            Quick Links
          </h2>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          <Link to="/admin-portal/admin/verify-doctors" className="ap-btn ap-btn-secondary ap-btn-sm">
            Verify Doctors
          </Link>
          <Link to="/admin-portal/admin/manage-users" className="ap-btn ap-btn-secondary ap-btn-sm">
            Manage Users
          </Link>
          <Link to="/admin-portal/admin/all-appointments" className="ap-btn ap-btn-secondary ap-btn-sm">
            All Appointments
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
