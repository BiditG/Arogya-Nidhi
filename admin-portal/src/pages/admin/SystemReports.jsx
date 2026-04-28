import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ChartBarIcon,
  CheckCircleIcon,
  BoltIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  StarIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  TableCellsIcon,
  EnvelopeIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import "../../styles/AdminPortal.css";

// ─── Reusable SVG Charts ──────────────────────────────────────────────────────

const BarChart = ({ data, labels, color = "#5f6fff", height = 180, w = 500 }) => {
  const W = w, H = height;
  const pad = { top: 16, right: 16, bottom: 28, left: 36 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;
  const max = Math.max(...data);
  const slot = cW / data.length;
  const bW = slot * 0.52;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const y = pad.top + t * cH;
        return (
          <g key={i}>
            <line x1={pad.left} y1={y} x2={pad.left + cW} y2={y} stroke="#e2e8f0" strokeWidth="1" />
            <text x={pad.left - 6} y={y + 4} fontSize="9" textAnchor="end" fill="#94a3b8">
              {Math.round(max * (1 - t))}
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
            <rect x={x} y={y} width={bW} height={bH} rx="3" fill={color} opacity="0.85" />
            {labels && (
              <text x={x + bW / 2} y={H - 6} fontSize="9" textAnchor="middle" fill="#94a3b8">
                {labels[i]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

const LineChart = ({ datasets, height = 180, w = 500 }) => {
  const W = w, H = height;
  const pad = { top: 16, right: 16, bottom: 28, left: 40 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;
  const allVals = datasets.flatMap(d => d.values);
  const max = Math.max(...allVals), min = Math.min(...allVals);
  const range = max - min || 1;

  const getPoints = (values) =>
    values.map((v, i) => ({
      x: pad.left + (i / (values.length - 1)) * cW,
      y: pad.top + cH - ((v - min) / range) * cH,
    }));

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
      <defs>
        {datasets.map((d, di) => (
          <linearGradient key={di} id={`lg${di}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={d.color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={d.color} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const y = pad.top + t * cH;
        return (
          <g key={i}>
            <line x1={pad.left} y1={y} x2={pad.left + cW} y2={y} stroke="#e2e8f0" strokeWidth="1" />
            <text x={pad.left - 6} y={y + 4} fontSize="9" textAnchor="end" fill="#94a3b8">
              {Math.round(max - t * range)}
            </text>
          </g>
        );
      })}
      {datasets.map((d, di) => {
        const pts = getPoints(d.values);
        const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
        const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${pad.top + cH} L ${pts[0].x} ${pad.top + cH} Z`;
        return (
          <g key={di}>
            {datasets.length === 1 && <path d={areaPath} fill={`url(#lg${di})`} />}
            <path d={linePath} fill="none" stroke={d.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={d.color} />
            ))}
          </g>
        );
      })}
      {datasets[0]?.labels?.map((lbl, i) => {
        const pts = getPoints(datasets[0].values);
        return (
          <text key={i} x={pts[i].x} y={H - 6} fontSize="9" textAnchor="middle" fill="#94a3b8">
            {lbl}
          </text>
        );
      })}
    </svg>
  );
};

const HorizontalBar = ({ label, value, max, color = "#5f6fff" }) => {
  const pct = Math.round((value / max) * 100);
  return (
    <div style={{ marginBottom: "1.125rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
        <span style={{ fontSize: "0.8125rem", fontWeight: "500", color: "var(--ap-text-primary)" }}>{label}</span>
        <span style={{ fontSize: "0.8125rem", fontWeight: "700", color }}>
          {value.toLocaleString()} &nbsp;<span style={{ color: "var(--ap-text-muted)", fontWeight: "400" }}>({pct}%)</span>
        </span>
      </div>
      <div style={{ height: "8px", background: "var(--ap-border-light)", borderRadius: "999px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "999px", transition: "width 0.4s ease" }} />
      </div>
    </div>
  );
};

// ─── Static Data ──────────────────────────────────────────────────────────────

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const triageDecisions = [
  { date: "2026-04-28", patient: "Priya Kumar", symptoms: "Fever, Cough", decision: "Respiratory Infection", outcome: "Verified" },
  { date: "2026-04-27", patient: "Rajesh Singh", symptoms: "Headache, Dizziness", decision: "Migraine", outcome: "Verified" },
  { date: "2026-04-26", patient: "Anjali Patel", symptoms: "Chest Pain", decision: "Cardiac Evaluation", outcome: "Pending" },
  { date: "2026-04-25", patient: "Vikram Desai", symptoms: "Joint Pain", decision: "Arthritis", outcome: "Verified" },
  { date: "2026-04-24", patient: "Sneha Iyer", symptoms: "Shortness of breath", decision: "Pulmonology Referral", outcome: "Verified" },
  { date: "2026-04-23", patient: "Arjun Nair", symptoms: "Skin rash, itching", decision: "Dermatitis", outcome: "Pending" },
];

const appointmentTableRows = [
  { date: "2026-04-28", doctor: "Dr. Sharma", patient: "John Doe", status: "Completed", type: "Consultation" },
  { date: "2026-04-28", doctor: "Dr. Patel", patient: "Jane Smith", status: "In Progress", type: "Follow-up" },
  { date: "2026-04-27", doctor: "Dr. Mehta", patient: "Ravi Kumar", status: "Cancelled", type: "Consultation" },
  { date: "2026-04-27", doctor: "Dr. Verma", patient: "Anita Roy", status: "Completed", type: "Checkup" },
  { date: "2026-04-26", doctor: "Dr. Joshi", patient: "Mohan Lal", status: "No-Show", type: "Follow-up" },
];

const consultationRows = [
  { date: "2026-04-28", doctor: "Dr. Kumar", patient: "Alice Johnson", duration: "32 min", type: "Video Call" },
  { date: "2026-04-27", doctor: "Dr. Singh", patient: "Bob Wilson", duration: "25 min", type: "In-Person" },
  { date: "2026-04-26", doctor: "Dr. Reddy", patient: "Clara Mendes", duration: "18 min", type: "Video Call" },
  { date: "2026-04-25", doctor: "Dr. Gupta", patient: "David Park", duration: "40 min", type: "In-Person" },
];

const userActivityRows = [
  { type: "Patients", total: "9,421", active: "8,932", newMonth: "412", rate: "94.8%", rateClass: "ap-badge-verified" },
  { type: "Doctors", total: "284", active: "261", newMonth: "18", rate: "91.9%", rateClass: "ap-badge-verified" },
  { type: "Students", total: "2,318", active: "2,115", newMonth: "85", rate: "91.2%", rateClass: "ap-badge-verified" },
  { type: "Admin", total: "12", active: "12", newMonth: "0", rate: "100%", rateClass: "ap-badge-verified" },
];

const apptStatusBadge = (s) => {
  const m = { Completed: "ap-badge-verified", "In Progress": "ap-badge-in-progress", Cancelled: "ap-badge-rejected", "No-Show": "ap-badge-pending" };
  return m[s] || "ap-badge-pending";
};

// ─── Tab Content Sections ─────────────────────────────────────────────────────

const AITriageTab = () => (
  <div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
      {[
        { label: "Total Decisions", value: "2,847", Icon: ChartBarIcon },
        { label: "Accuracy Rate", value: "94.2%", Icon: CheckCircleIcon },
        { label: "Avg Response Time", value: "2.3s", Icon: BoltIcon },
      ].map(({ label, value, Icon }, i) => (
        <div className="ap-stat-card" key={i}>
          <div className="ap-stat-icon"><Icon style={{ width: "22px", height: "22px", strokeWidth: 1.75 }} /></div>
          <div className="ap-stat-content">
            <p style={{ margin: "0 0 0.2rem", fontSize: "0.6875rem", fontWeight: "700", color: "var(--ap-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
            <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: "700", color: "var(--ap-primary)", lineHeight: 1 }}>{value}</p>
          </div>
        </div>
      ))}
    </div>

    <div className="ap-card" style={{ marginBottom: "1.5rem" }}>
      <div className="ap-card-header">
        <p className="ap-card-title">Weekly AI Triage Volume</p>
        <span style={{ fontSize: "0.75rem", color: "var(--ap-text-muted)" }}>Apr 22 – Apr 28, 2026</span>
      </div>
      <BarChart data={[145, 198, 167, 223, 189, 112, 91]} labels={weekdays} w={900} height={155} />
    </div>

    <div className="ap-table">
      <table>
        <thead>
          <tr><th>Date</th><th>Patient</th><th>Symptoms</th><th>AI Decision</th><th>Outcome</th></tr>
        </thead>
        <tbody>
          {triageDecisions.map((r, i) => (
            <tr key={i}>
              <td style={{ color: "var(--ap-text-secondary)" }}>{r.date}</td>
              <td style={{ fontWeight: "500" }}>{r.patient}</td>
              <td style={{ color: "var(--ap-text-secondary)" }}>{r.symptoms}</td>
              <td>{r.decision}</td>
              <td><span className={`ap-badge ${r.outcome === "Verified" ? "ap-badge-verified" : "ap-badge-pending"}`}>{r.outcome}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const AppointmentTab = () => (
  <div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.5rem" }}>
      <div className="ap-card">
        <div className="ap-card-header">
          <p className="ap-card-title">Appointments by Status</p>
          <span style={{ fontSize: "0.75rem", color: "var(--ap-text-muted)" }}>Last 7 days</span>
        </div>
        <BarChart data={[110, 38, 24, 19, 98, 42, 87]} labels={weekdays} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--ap-border-light)" }}>
          {[
            { label: "Completed", value: "3,842", color: "#10b981" },
            { label: "Pending", value: "239", color: "#f59e0b" },
            { label: "Cancelled", value: "200", color: "#ef4444" },
            { label: "No-Show", value: "145", color: "#94a3b8" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: item.color, flexShrink: 0 }} />
              <span style={{ fontSize: "0.8125rem", color: "var(--ap-text-secondary)" }}>{item.label}</span>
              <span style={{ fontSize: "0.8125rem", fontWeight: "700", color: "var(--ap-text-primary)", marginLeft: "auto" }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="ap-card">
        <div className="ap-card-header">
          <p className="ap-card-title">Appointments by Specialty</p>
          <span style={{ fontSize: "0.75rem", color: "var(--ap-text-muted)" }}>Monthly trend</span>
        </div>
        <LineChart
          datasets={[
            { label: "Cardiology", color: "#5f6fff", values: [42, 55, 48, 63, 58, 71, 67, 80, 75, 88, 82, 94], labels: months },
            { label: "Neurology", color: "#10b981", values: [28, 35, 31, 42, 38, 48, 44, 55, 50, 61, 57, 68] },
            { label: "General", color: "#f59e0b", values: [85, 92, 88, 98, 94, 105, 101, 112, 108, 118, 114, 125] },
            { label: "Ortho", color: "#ef4444", values: [20, 26, 22, 31, 28, 36, 33, 40, 37, 45, 42, 51] },
          ]}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.875rem", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--ap-border-light)" }}>
          {[
            { label: "Cardiology", color: "#5f6fff" },
            { label: "Neurology", color: "#10b981" },
            { label: "General", color: "#f59e0b" },
            { label: "Ortho", color: "#ef4444" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ width: "24px", height: "3px", borderRadius: "2px", background: item.color }} />
              <span style={{ fontSize: "0.8125rem", color: "var(--ap-text-secondary)" }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="ap-table">
      <table>
        <thead>
          <tr><th>Date</th><th>Doctor</th><th>Patient</th><th>Status</th><th>Type</th></tr>
        </thead>
        <tbody>
          {appointmentTableRows.map((r, i) => (
            <tr key={i}>
              <td style={{ color: "var(--ap-text-secondary)" }}>{r.date}</td>
              <td>{r.doctor}</td>
              <td style={{ fontWeight: "500" }}>{r.patient}</td>
              <td><span className={`ap-badge ${apptStatusBadge(r.status)}`}>{r.status}</span></td>
              <td style={{ color: "var(--ap-text-secondary)" }}>{r.type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const ConsultationTab = () => (
  <div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
      {[
        { label: "Total Consultations", value: "3,842", Icon: ChatBubbleLeftRightIcon },
        { label: "Avg Duration", value: "18 min", Icon: ClockIcon },
        { label: "Satisfaction Rate", value: "4.7 / 5", Icon: StarIcon },
        { label: "Revenue Generated", value: "₹2.1L", Icon: BanknotesIcon },
      ].map(({ label, value, Icon }, i) => (
        <div className="ap-stat-card" key={i}>
          <div className="ap-stat-icon"><Icon style={{ width: "22px", height: "22px", strokeWidth: 1.75 }} /></div>
          <div className="ap-stat-content">
            <p style={{ margin: "0 0 0.2rem", fontSize: "0.6875rem", fontWeight: "700", color: "var(--ap-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
            <p style={{ margin: 0, fontSize: "1.375rem", fontWeight: "700", color: "var(--ap-primary)", lineHeight: 1 }}>{value}</p>
          </div>
        </div>
      ))}
    </div>

    <div className="ap-card" style={{ marginBottom: "1.5rem" }}>
      <div className="ap-card-header">
        <p className="ap-card-title">Monthly Consultation Trend</p>
        <span style={{ fontSize: "0.75rem", color: "var(--ap-success)", fontWeight: "600" }}>▲ 11.4% vs last year</span>
      </div>
      <LineChart
        datasets={[{
          color: "#5f6fff",
          values: [280, 310, 295, 340, 320, 365, 350, 390, 375, 415, 400, 438],
          labels: months,
        }]}
        height={150}
        w={900}
      />
    </div>

    <div className="ap-table">
      <table>
        <thead>
          <tr><th>Date</th><th>Doctor</th><th>Patient</th><th>Duration</th><th>Type</th></tr>
        </thead>
        <tbody>
          {consultationRows.map((r, i) => (
            <tr key={i}>
              <td style={{ color: "var(--ap-text-secondary)" }}>{r.date}</td>
              <td>{r.doctor}</td>
              <td style={{ fontWeight: "500" }}>{r.patient}</td>
              <td>{r.duration}</td>
              <td style={{ color: "var(--ap-text-secondary)" }}>{r.type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const SubscriptionTab = () => (
  <div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
      <div className="ap-card">
        <div className="ap-card-header">
          <p className="ap-card-title">Subscription Distribution</p>
          <span style={{ fontSize: "0.75rem", color: "var(--ap-text-muted)" }}>3,891 total active</span>
        </div>
        <div style={{ marginTop: "0.5rem" }}>
          <HorizontalBar label="Basic Plan" value={1480} max={3891} color="#94a3b8" />
          <HorizontalBar label="Premium Plan" value={1920} max={3891} color="#5f6fff" />
          <HorizontalBar label="Enterprise Plan" value={491} max={3891} color="#10b981" />
        </div>
        <div style={{ marginTop: "1.25rem", padding: "1rem", background: "var(--ap-background)", borderRadius: "0.5rem" }}>
          {[
            { label: "Basic Plan", color: "#94a3b8", pct: "38%" },
            { label: "Premium Plan", color: "#5f6fff", pct: "49%" },
            { label: "Enterprise Plan", color: "#10b981", pct: "13%" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: i < 2 ? "0.5rem" : 0 }}>
              <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: item.color }} />
              <span style={{ fontSize: "0.8125rem", color: "var(--ap-text-secondary)", flex: 1 }}>{item.label}</span>
              <span style={{ fontSize: "0.8125rem", fontWeight: "700", color: "var(--ap-text-primary)" }}>{item.pct}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="ap-card">
        <div className="ap-card-header">
          <p className="ap-card-title">Revenue by Plan</p>
          <span style={{ fontSize: "0.75rem", color: "var(--ap-text-muted)" }}>Monthly — 2026</span>
        </div>
        <BarChart
          data={[18, 28, 22, 35, 29, 40, 33, 44, 38, 48, 43, 52]}
          labels={months}
          color="#5f6fff"
        />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--ap-border-light)" }}>
          {[
            { label: "Basic", value: "₹18.2L", color: "#94a3b8" },
            { label: "Premium", value: "₹31.5L", color: "#5f6fff" },
            { label: "Enterprise", value: "₹8.1L", color: "#10b981" },
          ].map((item, i) => (
            <div key={i} style={{ textAlign: "center", padding: "0.625rem", background: "var(--ap-background)", borderRadius: "0.375rem" }}>
              <p style={{ margin: "0 0 0.25rem", fontSize: "0.75rem", color: "var(--ap-text-muted)" }}>{item.label}</p>
              <p style={{ margin: 0, fontSize: "1rem", fontWeight: "700", color: item.color }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const RevenueTab = () => (
  <div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
      {[
        { label: "Total Revenue", value: "₹42.8L", Icon: BanknotesIcon, trend: "+15.3%", up: true },
        { label: "This Month", value: "₹4.2L", Icon: CalendarDaysIcon, trend: "+8.7%", up: true },
        { label: "Growth Rate", value: "+23.1%", Icon: ArrowTrendingUpIcon, trend: "vs last year", up: true },
      ].map(({ label, value, Icon, trend, up }, i) => (
        <div className="ap-stat-card" key={i}>
          <div className="ap-stat-icon"><Icon style={{ width: "22px", height: "22px", strokeWidth: 1.75 }} /></div>
          <div className="ap-stat-content">
            <p style={{ margin: "0 0 0.2rem", fontSize: "0.6875rem", fontWeight: "700", color: "var(--ap-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
            <p style={{ margin: "0 0 0.3rem", fontSize: "1.5rem", fontWeight: "700", color: "var(--ap-primary)", lineHeight: 1 }}>{value}</p>
            <span style={{ fontSize: "0.75rem", fontWeight: "600", color: up ? "var(--ap-success)" : "var(--ap-danger)" }}>
              {up ? "▲" : "▼"} {trend}
            </span>
          </div>
        </div>
      ))}
    </div>

    <div className="ap-card" style={{ marginBottom: "1.5rem" }}>
      <div className="ap-card-header">
        <p className="ap-card-title">Monthly Revenue Trend</p>
        <span style={{ fontSize: "0.75rem", color: "var(--ap-success)", fontWeight: "600" }}>▲ 23.1% vs last year</span>
      </div>
      <LineChart
        datasets={[{
          color: "#5f6fff",
          values: [28, 32, 29, 36, 34, 41, 38, 44, 40, 47, 45, 52],
          labels: months,
        }]}
        height={150}
        w={900}
      />
    </div>

    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
      <button className="ap-btn ap-btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <DocumentArrowDownIcon style={{ width: "16px", height: "16px", strokeWidth: 2 }} />
        Download PDF
      </button>
      <button className="ap-btn ap-btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <TableCellsIcon style={{ width: "16px", height: "16px", strokeWidth: 2 }} />
        Export CSV
      </button>
      <button className="ap-btn ap-btn-primary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <EnvelopeIcon style={{ width: "16px", height: "16px", strokeWidth: 2 }} />
        Email Report
      </button>
    </div>
  </div>
);

const UserActivityTab = () => (
  <div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
      {[
        { label: "Total Users", value: "12,035", Icon: UsersIcon },
        { label: "Active Users", value: "11,320", Icon: CheckCircleIcon },
        { label: "New This Month", value: "515", Icon: ArrowTrendingUpIcon },
        { label: "Avg Engagement", value: "93.2%", Icon: StarIcon },
      ].map(({ label, value, Icon }, i) => (
        <div className="ap-stat-card" key={i}>
          <div className="ap-stat-icon"><Icon style={{ width: "22px", height: "22px", strokeWidth: 1.75 }} /></div>
          <div className="ap-stat-content">
            <p style={{ margin: "0 0 0.2rem", fontSize: "0.6875rem", fontWeight: "700", color: "var(--ap-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
            <p style={{ margin: 0, fontSize: "1.375rem", fontWeight: "700", color: "var(--ap-primary)", lineHeight: 1 }}>{value}</p>
          </div>
        </div>
      ))}
    </div>

    <div className="ap-table">
      <table>
        <thead>
          <tr>
            <th>User Type</th>
            <th>Total Users</th>
            <th>Active Users</th>
            <th>New This Month</th>
            <th>Engagement Rate</th>
          </tr>
        </thead>
        <tbody>
          {userActivityRows.map((r, i) => (
            <tr key={i}>
              <td style={{ fontWeight: "600" }}>{r.type}</td>
              <td>{r.total}</td>
              <td>{r.active}</td>
              <td>+{r.newMonth}</td>
              <td><span className={`ap-badge ${r.rateClass}`}>{r.rate}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const TABS = [
  { id: "ai-triage", label: "AI Triage Decisions" },
  { id: "appointment", label: "Appointment Analytics" },
  { id: "consultation", label: "Consultation History" },
  { id: "subscription", label: "Subscription Analytics" },
  { id: "revenue", label: "Revenue Report" },
  { id: "user-activity", label: "User Activity" },
];

const TAB_CONTENT = {
  "ai-triage": <AITriageTab />,
  appointment: <AppointmentTab />,
  consultation: <ConsultationTab />,
  subscription: <SubscriptionTab />,
  revenue: <RevenueTab />,
  "user-activity": <UserActivityTab />,
};

const SystemReports = () => {
  const [activeTab, setActiveTab] = useState("ai-triage");
  const [reportType, setReportType] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [category, setCategory] = useState("");

  return (
    <div style={{ fontFamily: "Outfit, sans-serif" }}>
      {/* Back link + Page title */}
      <div style={{ marginBottom: "1.75rem" }}>
        <Link
          to="/admin/dashboard"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", color: "var(--ap-text-secondary)", textDecoration: "none", marginBottom: "0.625rem", fontWeight: "500" }}
        >
          <ArrowLeftIcon style={{ width: "14px", height: "14px", strokeWidth: 2.5 }} />
          Back to Dashboard
        </Link>
        <h1 style={{ margin: 0, fontSize: "1.875rem", fontWeight: "700", color: "var(--ap-text-primary)" }}>System Reports</h1>
      </div>

      {/* Filter Bar */}
      <div className="ap-card" style={{ marginBottom: "1.75rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "0.875rem", alignItems: "center" }}>
          <select
            className="ap-form-select"
            value={reportType}
            onChange={e => setReportType(e.target.value)}
          >
            <option value="">Report Type</option>
            <option>AI Triage Report</option>
            <option>Appointment Report</option>
            <option>Consultation Report</option>
            <option>Subscription Report</option>
            <option>Revenue Report</option>
            <option>User Activity Report</option>
          </select>
          <input
            type="date"
            className="ap-form-input"
            placeholder="Date Range"
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
          />
          <select
            className="ap-form-select"
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            <option value="">Category</option>
            <option>All</option>
            <option>Patients</option>
            <option>Doctors</option>
            <option>Subscriptions</option>
            <option>Revenue</option>
          </select>
          <button className="ap-btn ap-btn-primary" style={{ whiteSpace: "nowrap" }}>
            Generate
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ borderBottom: "2px solid var(--ap-border)", marginBottom: "1.75rem", display: "flex", gap: 0, overflowX: "auto" }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "0.75rem 1.125rem",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === tab.id ? "3px solid var(--ap-primary)" : "3px solid transparent",
              color: activeTab === tab.id ? "var(--ap-primary)" : "var(--ap-text-secondary)",
              fontSize: "0.8125rem",
              fontWeight: activeTab === tab.id ? "700" : "500",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
              marginBottom: "-2px",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active Tab Heading */}
      <h2 style={{ margin: "0 0 1.25rem", fontSize: "1.125rem", fontWeight: "700", color: "var(--ap-text-primary)", textTransform: "uppercase", letterSpacing: "0.02em" }}>
        {TABS.find(t => t.id === activeTab)?.label}
      </h2>

      {/* Tab Content */}
      {TAB_CONTENT[activeTab]}
    </div>
  );
};

export default SystemReports;
