import {
  UsersIcon,
  UserGroupIcon,
  HeartIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  ClockIcon,
  CreditCardIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  DocumentChartBarIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import "../../styles/AdminPortal.css";

const UserGrowthChart = () => {
  const data = [120, 180, 150, 220, 280, 240, 320, 380, 350, 420, 480, 520];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const W = 420, H = 160;
  const pad = { top: 20, right: 20, bottom: 30, left: 40 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;
  const max = Math.max(...data), min = Math.min(...data);

  const pts = data.map((v, i) => ({
    x: pad.left + (i / (data.length - 1)) * cW,
    y: pad.top + cH - ((v - min) / (max - min)) * cH,
  }));

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${line} L ${pts[pts.length - 1].x} ${pad.top + cH} L ${pts[0].x} ${pad.top + cH} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      <defs>
        <linearGradient id="ugGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5f6fff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#5f6fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const y = pad.top + t * cH;
        return (
          <g key={i}>
            <line x1={pad.left} y1={y} x2={pad.left + cW} y2={y} stroke="#e2e8f0" strokeWidth="1" />
            <text x={pad.left - 6} y={y + 4} fontSize="9" textAnchor="end" fill="#94a3b8">
              {Math.round(max - t * (max - min))}
            </text>
          </g>
        );
      })}
      <path d={area} fill="url(#ugGrad)" />
      <path d={line} fill="none" stroke="#5f6fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#5f6fff" />
      ))}
      {pts.map((p, i) =>
        i % 2 === 0 ? (
          <text key={i} x={p.x} y={H - 6} fontSize="9" textAnchor="middle" fill="#94a3b8">
            {months[i]}
          </text>
        ) : null
      )}
    </svg>
  );
};

const RevenueChart = () => {
  const data = [18, 25, 22, 30, 28, 35, 32, 40, 38, 45, 42, 50];
  const months = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
  const W = 400, H = 160;
  const pad = { top: 20, right: 15, bottom: 30, left: 40 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;
  const max = Math.max(...data);
  const slot = cW / data.length;
  const bW = slot * 0.55;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const y = pad.top + t * cH;
        return (
          <g key={i}>
            <line x1={pad.left} y1={y} x2={pad.left + cW} y2={y} stroke="#e2e8f0" strokeWidth="1" />
            <text x={pad.left - 5} y={y + 4} fontSize="9" textAnchor="end" fill="#94a3b8">
              {Math.round(max * (1 - t))}k
            </text>
          </g>
        );
      })}
      {data.map((v, i) => {
        const bH = (v / max) * cH;
        const x = pad.left + i * slot + (slot - bW) / 2;
        const y = pad.top + cH - bH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bW} height={bH} rx="3" fill="#5f6fff" opacity="0.82" />
            <text x={x + bW / 2} y={H - 6} fontSize="9" textAnchor="middle" fill="#94a3b8">
              {months[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const statCards = [
  { label: "Total Users", value: "12,847", Icon: UsersIcon, trend: "+8.2%", up: true },
  { label: "Active Doctors", value: "284", Icon: UserGroupIcon, trend: "+3.1%", up: true },
  { label: "Active Patients", value: "9,421", Icon: HeartIcon, trend: "+12.5%", up: true },
  { label: "Students Enrolled", value: "2,318", Icon: AcademicCapIcon, trend: "+5.7%", up: true },
  { label: "Appointments Today", value: "147", Icon: CalendarDaysIcon, trend: "-2.3%", up: false },
  { label: "Pending Verifications", value: "23", Icon: ClockIcon, trend: "+4 new", up: false },
  { label: "Active Subscriptions", value: "3,891", Icon: CreditCardIcon, trend: "+6.8%", up: true },
  { label: "Monthly Revenue", value: "₹4.2L", Icon: BanknotesIcon, trend: "+15.3%", up: true },
];

const pendingDoctors = [
  { name: "Dr. Ananya Verma", specialty: "Cardiologist", exp: "8 years", date: "2026-04-26" },
  { name: "Dr. Rahul Mehta", specialty: "Neurologist", exp: "5 years", date: "2026-04-25" },
  { name: "Dr. Sunita Patel", specialty: "Pediatrician", exp: "12 years", date: "2026-04-24" },
];

const userCategories = [
  { title: "Manage Patients", count: "9,421", sub: "8,932 active", Icon: HeartIcon },
  { title: "Manage Doctors", count: "284", sub: "261 verified", Icon: UserGroupIcon },
  { title: "Manage Students", count: "2,318", sub: "2,115 active", Icon: AcademicCapIcon },
];

const triageRows = [
  { patient: "Arjun Sharma", symptoms: "Chest pain, shortness of breath", recommendation: "Emergency Cardiology", priority: "Critical", status: "Escalated" },
  { patient: "Meera Iyer", symptoms: "Persistent headache, dizziness", recommendation: "Neurology Consult", priority: "Medium", status: "In Progress" },
  { patient: "Vikram Nair", symptoms: "High fever, body aches", recommendation: "General Physician", priority: "Low", status: "Resolved" },
  { patient: "Priya Desai", symptoms: "Abdominal pain, nausea", recommendation: "Gastroenterology", priority: "Medium", status: "Pending" },
  { patient: "Rohan Gupta", symptoms: "Joint pain, swelling", recommendation: "Orthopedics", priority: "Low", status: "In Progress" },
];

const reports = [
  {
    title: "Appointment Reports",
    items: ["Total appointments: 4,281", "Completed: 3,842 (89.7%)", "Cancelled: 239 (5.6%)", "No-shows: 200 (4.7%)"],
  },
  {
    title: "Consultation Reports",
    items: ["Total consultations: 3,842", "Avg. duration: 18 mins", "Patient satisfaction: 4.7 / 5", "AI-assisted: 1,204 (31.3%)"],
  },
];

const subscriptions = [
  { user: "Raj Kumar", plan: "Premium", start: "2026-01-15", end: "2027-01-15" },
  { user: "Meena Singh", plan: "Basic", start: "2026-02-10", end: "2027-02-10" },
  { user: "Anil Joshi", plan: "Student", start: "2026-03-05", end: "2027-03-05" },
  { user: "Kavya Reddy", plan: "Premium", start: "2025-12-01", end: "2026-12-01" },
];

const priorityClass = { Critical: "ap-badge ap-badge-critical", Medium: "ap-badge ap-badge-medium", Low: "ap-badge ap-badge-low" };
const statusClass = {
  Escalated: "ap-badge ap-badge-rejected",
  "In Progress": "ap-badge ap-badge-in-progress",
  Resolved: "ap-badge ap-badge-verified",
  Pending: "ap-badge ap-badge-pending",
};

const Dashboard = () => (
  <div style={{ fontFamily: "Outfit, sans-serif" }}>
    {/* Page Header */}
    <div style={{ marginBottom: "2rem" }}>
      <p style={{ margin: "0 0 0.25rem", fontSize: "0.8125rem", color: "var(--ap-text-muted)", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Admin Portal
      </p>
      <h1 style={{ margin: "0 0 0.375rem", fontSize: "1.875rem", fontWeight: "700", color: "var(--ap-text-primary)" }}>
        Dashboard
      </h1>
      <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--ap-text-secondary)" }}>
        System overview — Monday, 28 April 2026
      </p>
    </div>

    {/* ── System Overview ─────────────────────────────────── */}
    <section className="ap-section">
      <h2 className="ap-section-title">System Overview</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
        {statCards.map((card, i) => (
          <div className="ap-stat-card" key={i}>
            <div className="ap-stat-icon">
              <card.Icon style={{ width: "22px", height: "22px", strokeWidth: 1.75 }} />
            </div>
            <div className="ap-stat-content">
              <p style={{ margin: "0 0 0.2rem", fontSize: "0.6875rem", fontWeight: "700", color: "var(--ap-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {card.label}
              </p>
              <p style={{ margin: "0 0 0.3rem", fontSize: "1.5rem", fontWeight: "700", color: "var(--ap-primary)", lineHeight: 1 }}>
                {card.value}
              </p>
              <span style={{ fontSize: "0.75rem", fontWeight: "600", color: card.up ? "var(--ap-success)" : "var(--ap-danger)" }}>
                {card.up ? "▲" : "▼"} {card.trend}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>

    {/* ── System Statistics ────────────────────────────────── */}
    <section className="ap-section">
      <h2 className="ap-section-title">System Statistics</h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div className="ap-card">
          <div className="ap-card-header">
            <div>
              <p className="ap-card-title">User Growth</p>
              <p className="ap-card-subtitle">Monthly active users — 2026</p>
            </div>
            <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--ap-success)" }}>▲ 8.2% vs last year</span>
          </div>
          <UserGrowthChart />
        </div>
        <div className="ap-card">
          <div className="ap-card-header">
            <div>
              <p className="ap-card-title">Revenue Overview</p>
              <p className="ap-card-subtitle">Monthly revenue (₹ thousands) — 2026</p>
            </div>
            <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--ap-success)" }}>▲ 15.3% vs last year</span>
          </div>
          <RevenueChart />
        </div>
      </div>
    </section>

    {/* ── Pending Doctor Verifications ─────────────────────── */}
    <section className="ap-section">
      <h2 className="ap-section-title">Pending Doctor Verifications</h2>
      <div className="ap-list">
        {pendingDoctors.map((doc, i) => (
          <div className="ap-list-item" key={i}>
            <div className="ap-list-icon">{doc.name[4]}</div>
            <div className="ap-list-content">
              <p className="ap-list-title">{doc.name}</p>
              <p className="ap-list-meta">
                {doc.specialty} &nbsp;·&nbsp; {doc.exp} experience &nbsp;·&nbsp; Submitted {doc.date}
              </p>
            </div>
            <div className="ap-list-actions">
              <button className="ap-btn ap-btn-secondary ap-btn-sm">Review</button>
              <button className="ap-btn ap-btn-success ap-btn-sm">Approve</button>
              <button className="ap-btn ap-btn-danger ap-btn-sm">Reject</button>
            </div>
          </div>
        ))}
      </div>
    </section>

    {/* ── User Management ──────────────────────────────────── */}
    <section className="ap-section">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 className="ap-section-title" style={{ margin: 0 }}>User Management</h2>
        <div className="ap-button-group">
          <button className="ap-btn ap-btn-primary ap-btn-sm">Add User</button>
          <button className="ap-btn ap-btn-secondary ap-btn-sm">Export Data</button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
        {userCategories.map((cat, i) => (
          <div className="ap-card" key={i} style={{ cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.875rem" }}>
              <div className="ap-stat-icon">
                <cat.Icon style={{ width: "22px", height: "22px", strokeWidth: 1.75 }} />
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: "700", fontSize: "0.9375rem", color: "var(--ap-text-primary)" }}>{cat.title}</p>
                <p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--ap-text-secondary)" }}>{cat.sub}</p>
              </div>
            </div>
            <p style={{ margin: "0 0 1rem", fontSize: "1.75rem", fontWeight: "700", color: "var(--ap-primary)" }}>
              {cat.count}
            </p>
            <button className="ap-btn ap-btn-secondary ap-btn-full ap-btn-sm">View All</button>
          </div>
        ))}
      </div>
    </section>

    {/* ── AI Triage Decisions ──────────────────────────────── */}
    <section className="ap-section">
      <h2 className="ap-section-title">AI Triage Decisions</h2>
      <div className="ap-table">
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Symptoms</th>
              <th>AI Recommendation</th>
              <th>Priority</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {triageRows.map((row, i) => (
              <tr key={i}>
                <td style={{ fontWeight: "500" }}>{row.patient}</td>
                <td style={{ color: "var(--ap-text-secondary)" }}>{row.symptoms}</td>
                <td>{row.recommendation}</td>
                <td><span className={priorityClass[row.priority]}>{row.priority}</span></td>
                <td><span className={statusClass[row.status]}>{row.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>

    {/* ── System Reports ───────────────────────────────────── */}
    <section className="ap-section">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 className="ap-section-title" style={{ margin: 0 }}>System Reports</h2>
        <button className="ap-btn ap-btn-secondary ap-btn-sm">View All Reports</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        {reports.map((rpt, i) => (
          <div className="ap-card" key={i}>
            <div className="ap-card-header">
              <p className="ap-card-title">{rpt.title}</p>
            </div>
            <ul style={{ margin: "0 0 1rem", padding: "0 0 0 1.125rem" }}>
              {rpt.items.map((item, j) => (
                <li key={j} style={{ fontSize: "0.875rem", color: "var(--ap-text-secondary)", marginBottom: "0.375rem" }}>
                  {item}
                </li>
              ))}
            </ul>
            <button className="ap-btn ap-btn-secondary ap-btn-full ap-btn-sm">Generate Report</button>
          </div>
        ))}
      </div>
    </section>

    {/* ── Subscription Management ──────────────────────────── */}
    <section className="ap-section">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 className="ap-section-title" style={{ margin: 0 }}>Subscription Management</h2>
        <button className="ap-btn ap-btn-primary ap-btn-sm">Configure Plans</button>
      </div>
      <div style={{ marginBottom: "0.75rem" }}>
        <span style={{ fontSize: "0.8125rem", color: "var(--ap-text-secondary)", fontWeight: "500" }}>
          Active Subscriptions &nbsp;—&nbsp;
          <span style={{ color: "var(--ap-primary)", fontWeight: "700" }}>3,891</span>
        </span>
      </div>
      <div className="ap-table">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Plan</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((sub, i) => (
              <tr key={i}>
                <td style={{ fontWeight: "500" }}>{sub.user}</td>
                <td>
                  <span className="ap-badge ap-badge-active">{sub.plan}</span>
                </td>
                <td style={{ color: "var(--ap-text-secondary)" }}>{sub.start}</td>
                <td style={{ color: "var(--ap-text-secondary)" }}>{sub.end}</td>
                <td>
                  <div className="ap-button-group">
                    <button className="ap-btn ap-btn-secondary ap-btn-sm">Edit</button>
                    <button className="ap-btn ap-btn-danger ap-btn-sm">Cancel</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  </div>
);

export default Dashboard;
