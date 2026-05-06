import { useEffect, useState, useContext, useCallback, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import DoctorSidebar from "../components/DoctorSidebar";
import { AppContext } from "../context/AppContext";
import "./PatientPortal.css";

const FORM_FIELDS = [
  { label: "Chief Complaint", key: "chiefComplaint", rows: 2 },
  { label: "Symptoms", key: "symptoms", rows: 3 },
  { label: "Diagnosis", key: "diagnosis", rows: 2 },
  { label: "Prescription", key: "prescription", rows: 4 },
  { label: "Recommended Tests", key: "recommendedTests", rows: 2 },
  { label: "Follow-up Date", key: "followUp", rows: 1 },
];

// ─── IoT Device Panel ─────────────────────────────────────────────────────────

const scoreColor = (score) => {
  if (score == null) return { bar: "#93c5fd", text: "#1e40af", bg: "#eff6ff", label: "No data" };
  if (score >= 75) return { bar: "#34d399", text: "#065f46", bg: "#ecfdf5", label: "Normal" };
  if (score >= 50) return { bar: "#fbbf24", text: "#92400e", bg: "#fffbeb", label: "Moderate" };
  return { bar: "#f87171", text: "#991b1b", bg: "#fef2f2", label: "Needs Review" };
};

const ScoreArc = ({ score }) => {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const pct = score != null ? Math.min(score, 100) / 100 : 0;
  const dash = circ * pct;
  const col = scoreColor(score);
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" style={{ display: "block" }}>
      <circle cx="36" cy="36" r={r} fill="none" stroke="#e2e8f0" strokeWidth="7" />
      <circle
        cx="36" cy="36" r={r} fill="none"
        stroke={col.bar} strokeWidth="7"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
        style={{ transition: "stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)" }}
      />
      <text x="36" y="39" textAnchor="middle" fontSize="13" fontWeight="700" fill={col.text}>
        {score != null ? score : "—"}
      </text>
    </svg>
  );
};

const InteractiveChart = ({ items, maxVal, barColor, tooltipFn, height = 96 }) => {
  const [hovered, setHovered] = useState(null);
  const [tooltip, setTooltip] = useState({ x: 0, y: 0, text: "" });
  const containerRef = useRef(null);

  const handleMouseMove = (e, idx, item) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHovered(idx);
    setTooltip({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      text: tooltipFn(item, idx),
    });
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        display: "flex",
        gap: 4,
        alignItems: "flex-end",
        height,
        padding: "8px 0 0",
        overflow: "visible",
      }}
    >
      {items.map((item, idx) => {
        const val = typeof item === "object" ? item.val : item;
        const pct = maxVal > 0 ? Math.min(val / maxVal, 1) : 0;
        const isHov = hovered === idx;
        const col = typeof barColor === "function" ? barColor(item, idx) : barColor;
        return (
          <div
            key={idx}
            style={{
              flex: 1,
              height: `${Math.max(pct * (height - 16), 4)}px`,
              background: isHov ? col.hover : col.normal,
              borderRadius: "3px 3px 0 0",
              cursor: "pointer",
              transition: "height 0.5s cubic-bezier(.4,0,.2,1), background 0.15s",
              animationDelay: `${idx * 40}ms`,
              boxShadow: isHov ? `0 0 0 2px ${col.hover}55` : "none",
              transform: isHov ? "scaleX(1.12)" : "scaleX(1)",
              transformOrigin: "bottom",
            }}
            onMouseMove={(e) => handleMouseMove(e, idx, item)}
            onMouseLeave={() => setHovered(null)}
          />
        );
      })}
      {hovered !== null && (
        <div
          style={{
            position: "absolute",
            left: Math.min(tooltip.x + 10, (containerRef.current?.offsetWidth || 200) - 90),
            top: Math.max(tooltip.y - 36, 0),
            background: "#0f172a",
            color: "#f8fafc",
            fontSize: "0.6875rem",
            fontWeight: 600,
            padding: "4px 10px",
            borderRadius: 6,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            zIndex: 20,
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
};

const IoTDevicePanel = ({ patientId, backendUrl, token }) => {
  const [tab, setTab] = useState("tremor"); // tremor | reaction
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!token || !patientId) return;
    setLoading(true);
    axios
      .get(`${backendUrl}/api/doctor/patient-iot/${patientId}`, {
        headers: { Authorization: `Bearer ${token}`, dtoken: token },
      })
      .then(({ data }) => {
        if (data?.success) {
          const arr = Array.isArray(data.data) ? data.data : data.data?.readings || [];
          setResults(arr);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patientId, backendUrl, token]);

  // Separate into test types
  const tremorItems = results.filter((r) => r.sensorData?.test === "tremor_analysis").slice(0, 15);
  const reactionItems = results.filter((r) => r.sensorData?.test === "reaction_time").slice(0, 15);
  const activeItems = tab === "tremor" ? tremorItems : reactionItems;

  // Build chart bars
  const tremorBars = tremorItems.map((r) => ({
    val: parseFloat(r.sensorData?.amplitude || 0),
    score: r.resultScore,
    date: r.createdAt,
    label: `${r.sensorData?.amplitude}u amplitude`,
  }));

  const reactionBars = reactionItems.map((r) => ({
    val: r.sensorData?.reactionTimeMs || 0,
    score: r.resultScore,
    date: r.createdAt,
    label: `${r.sensorData?.reactionTimeMs}ms`,
  }));

  // Fallback demo bars when no real data
  const demoTremorBars = [0.3, 0.6, 0.4, 0.8, 0.5, 0.3, 0.7, 0.4, 0.6, 0.5, 0.4, 0.7].map(
    (v, i) => ({ val: v, score: Math.round(80 - v * 20), date: null, label: `Sample ${i + 1}` })
  );
  const demoReactionBars = [320, 280, 310, 260, 295, 340, 275, 300, 285, 310, 265, 290].map(
    (v, i) => ({ val: v, score: Math.max(0, Math.round(100 - (v - 150) / 5)), date: null, label: `${v}ms` })
  );

  const chartBars = tab === "tremor"
    ? (tremorBars.length ? tremorBars : demoTremorBars)
    : (reactionBars.length ? reactionBars : demoReactionBars);

  const maxVal = Math.max(...chartBars.map((b) => b.val), 0.001);

  // Latest result stats
  const latestTremor = tremorItems[0];
  const latestReaction = reactionItems[0];
  const latestScore = tab === "tremor" ? latestTremor?.resultScore : latestReaction?.resultScore;
  const latestScoreCol = scoreColor(latestScore);

  const avgReactionMs = reactionItems.length
    ? Math.round(reactionItems.reduce((s, r) => s + (r.sensorData?.reactionTimeMs || 0), 0) / reactionItems.length)
    : null;

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;

  const barColorFn = () => {
    // Keep the original site blue palette for bars — score coloring only on the arc
    return { normal: "#dbeafe", hover: "#93c5fd" };
  };

  const tooltipFn = (item) => {
    const parts = [item.label];
    if (item.score != null) parts.push(`Score: ${item.score}/100`);
    if (item.date) parts.push(fmtDate(item.date));
    return parts.join(" · ");
  };

  return (
    <>
      <div style={{
        background: "var(--pp-surface)",
        border: "1px solid var(--pp-border)",
        borderRadius: "0.5rem",
        boxShadow: "var(--pp-shadow-sm)",
        overflow: "hidden",
      }}>
        {/* Header + Tabs */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem 1.25rem 0",
          borderBottom: "1px solid var(--pp-border)",
        }}>
          <div style={{ display: "flex", gap: 0 }}>
            {["tremor", "reaction"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  border: "none",
                  borderBottom: tab === t ? "2px solid var(--pp-primary)" : "2px solid transparent",
                  background: "transparent",
                  color: tab === t ? "var(--pp-primary)" : "var(--pp-text-muted)",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  transition: "color 0.15s, border-color 0.15s",
                  marginBottom: -1,
                }}
              >
                {t === "tremor" ? "Tremor Analysis" : "Reaction Time"}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, paddingBottom: "0.75rem" }}>
            {loading && (
              <span style={{ fontSize: "0.6875rem", color: "var(--pp-text-muted)", alignSelf: "center" }}>Loading…</span>
            )}
            {activeItems.length === 0 && !loading && (
              <span style={{
                fontSize: "0.6875rem",
                padding: "0.25rem 0.625rem",
                borderRadius: 9999,
                background: "#f1f5f9",
                color: "var(--pp-text-muted)",
                fontWeight: 600,
              }}>Demo data</span>
            )}
            <button
              className="pp-btn pp-btn-outline pp-btn-sm"
              onClick={() => setShowModal(true)}
            >
              View Details
            </button>
          </div>
        </div>

        {/* Chart + Score */}
        <div style={{ display: "flex", gap: 0, padding: "1.25rem" }}>
          {/* Bar Chart */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <InteractiveChart
              items={chartBars}
              maxVal={maxVal}
              barColor={barColorFn}
              tooltipFn={tooltipFn}
              height={112}
            />
            {/* X-axis labels */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 4,
              paddingBottom: 2,
            }}>
              {chartBars.filter((_, i) => i === 0 || i === Math.floor(chartBars.length / 2) || i === chartBars.length - 1).map((b, i) => (
                <span key={i} style={{ fontSize: "0.625rem", color: "var(--pp-text-muted)" }}>
                  {b.date ? fmtDate(b.date) : (i === 0 ? "Oldest" : i === 1 ? "Mid" : "Latest")}
                </span>
              ))}
            </div>
          </div>

          {/* Score Panel */}
          <div style={{
            width: 140,
            flexShrink: 0,
            marginLeft: 20,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: latestScoreCol.bg,
            borderRadius: 8,
            padding: "1rem",
            border: `1px solid ${latestScoreCol.bar}55`,
          }}>
            <ScoreArc score={latestScore} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: latestScoreCol.text, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {latestScoreCol.label}
              </div>
              {tab === "tremor" && latestTremor && (
                <div style={{ fontSize: "0.75rem", color: "var(--pp-text-secondary)", marginTop: 2 }}>
                  Amp: {latestTremor.sensorData?.amplitude}u
                </div>
              )}
              {tab === "reaction" && avgReactionMs && (
                <div style={{ fontSize: "0.75rem", color: "var(--pp-text-secondary)", marginTop: 2 }}>
                  Avg: {avgReactionMs}ms
                </div>
              )}
              <div style={{ fontSize: "0.6875rem", color: "var(--pp-text-muted)", marginTop: 4 }}>
                {activeItems.length > 0 ? `${activeItems.length} reading${activeItems.length !== 1 ? "s" : ""}` : "No data yet"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.45)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(2px)",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div style={{
            background: "var(--pp-surface)",
            borderRadius: 12,
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            width: "min(680px, 94vw)",
            maxHeight: "80vh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}>
            <div style={{
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid var(--pp-border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1rem" }}>
                  {tab === "tremor" ? "Tremor Analysis" : "Reaction Time"} — Full History
                </div>
                <div style={{ fontSize: "0.8125rem", color: "var(--pp-text-secondary)", marginTop: 2 }}>
                  {activeItems.length === 0 ? "No recorded sessions found" : `${activeItems.length} session${activeItems.length !== 1 ? "s" : ""} recorded`}
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: "var(--pp-background)",
                  border: "1px solid var(--pp-border)",
                  borderRadius: 6,
                  width: 32,
                  height: 32,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1rem",
                  color: "var(--pp-text-secondary)",
                }}
              >✕</button>
            </div>

            <div style={{ overflowY: "auto", flex: 1, padding: "1rem 1.5rem" }}>
              {activeItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "var(--pp-text-muted)", fontSize: "0.875rem" }}>
                  No IoT test data recorded for this patient yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {activeItems.map((item, i) => {
                    const sc = scoreColor(item.resultScore);
                    return (
                      <div key={item.id || i} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "0.875rem 1rem",
                        background: sc.bg,
                        borderRadius: 8,
                        border: `1px solid ${sc.bar}44`,
                      }}>
                        <div style={{
                          width: 42, height: 42, borderRadius: "50%",
                          background: sc.bar + "33",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: 800, fontSize: "0.9rem", color: sc.text, flexShrink: 0,
                        }}>
                          {item.resultScore ?? "—"}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--pp-text-primary)" }}>
                            {tab === "tremor"
                              ? `Amplitude: ${item.sensorData?.amplitude}u · ${item.sensorData?.pointCount || ""} pts`
                              : `${item.sensorData?.reactionTimeMs}ms · Mode: ${item.sensorData?.mode || "visual"}`}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--pp-text-secondary)", marginTop: 2 }}>
                            {new Date(item.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                        <span style={{
                          padding: "0.25rem 0.75rem",
                          borderRadius: 9999,
                          fontSize: "0.6875rem",
                          fontWeight: 700,
                          background: sc.bar + "22",
                          color: sc.text,
                          border: `1px solid ${sc.bar}66`,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          flexShrink: 0,
                        }}>{sc.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const DoctorConsultations = () => {
  const { token, backendUrl } = useContext(AppContext);

  const [appointments, setAppointments] = useState([]);
  const [active, setActive] = useState(null);
  const [aiSummary, setAiSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQ, setSearchQ] = useState("");

  const headers = token
    ? {
        Authorization: `Bearer ${token}`,
        dtoken: token,
      }
    : {};

  const normalizeStatus = (status) => String(status || "").toLowerCase();

  const getPatientName = (appointment) => {
    return (
      appointment?.patient?.users?.name ||
      appointment?.patient?.user?.name ||
      appointment?.user?.name ||
      appointment?.patient_name ||
      "Unknown Patient"
    );
  };

  const getPatientEmail = (appointment) => {
    return (
      appointment?.patient?.users?.email ||
      appointment?.patient?.user?.email ||
      appointment?.user?.email ||
      ""
    );
  };

  const getDate = (appointment) => {
    if (!appointment?.scheduled_at) return appointment?.slotDate || "—";

    return new Date(appointment.scheduled_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getTime = (appointment) => {
    if (!appointment?.scheduled_at) return appointment?.slotTime || "—";

    return new Date(appointment.scheduled_at).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getType = (appointment) => {
    return appointment?.type || appointment?.reason || appointment?.patient_notes || "Consultation";
  };

  const prepareAppointmentForConsultation = (appointment) => {
    return {
      ...appointment,
      chiefComplaint: appointment?.chiefComplaint || "",
      symptoms: appointment?.symptoms || "",
      diagnosis: appointment?.diagnosis || "",
      prescription: appointment?.prescription || "",
      recommendedTests: appointment?.recommendedTests || "",
      followUp: appointment?.followUp || "",
    };
  };

  const load = useCallback(async () => {
    if (!token) return;

    setLoading(true);

    try {
      const { data } = await axios.get(`${backendUrl}/api/doctor/appointments`, {
        headers,
      });

      if (data?.success) {
        const list = data.appointments || [];
        setAppointments(list);

        const firstActive = list.find((appointment) =>
          ["confirmed", "scheduled", "pending"].includes(
            normalizeStatus(appointment.status)
          )
        );

        if (firstActive) {
          const prepared = prepareAppointmentForConsultation(firstActive);
          setActive(prepared);
          setAiSummary(buildAiSummary(prepared));
        } else {
          setActive(null);
          setAiSummary("");
        }
      } else {
        setAppointments([]);
        toast.error(data?.message || "Failed to load consultations");
      }
    } catch (err) {
      console.error("Load consultations error:", err);
      toast.error(err?.response?.data?.message || "Failed to load consultations");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [token, backendUrl]);

  useEffect(() => {
    load();
  }, [load]);

  const buildAiSummary = (appointment) => {
    if (!appointment) return "";

    return `Patient: ${getPatientName(appointment)}
Appointment: ${getDate(appointment)} at ${getTime(appointment)}
Type: ${getType(appointment)}

Notes:
${appointment.patient_notes || appointment.reason || "No patient notes available."}`;
  };

  const displayHistory = appointments
    .filter((appointment) => normalizeStatus(appointment.status) === "completed")
    .filter((appointment) => {
      if (!searchQ) return true;
      return getPatientName(appointment).toLowerCase().includes(searchQ.toLowerCase());
    });

  const activeAppointments = appointments.filter((appointment) =>
    ["confirmed", "scheduled", "pending"].includes(normalizeStatus(appointment.status))
  );

  const changeField = (key, value) => {
    setActive((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const selectAppointment = (appointment) => {
    const prepared = prepareAppointmentForConsultation(appointment);
    setActive(prepared);
    setAiSummary(buildAiSummary(prepared));
  };

  const savePrescription = async (shouldEndConsultation = false) => {
    if (!active?.id && !active?._id) {
      toast.error("No active appointment selected");
      return;
    }

    setSaving(true);

    try {
      const { data } = await axios.post(
        `${backendUrl}/api/consultation-summaries`,
        {
          appointmentId: active.id || active._id,
          diagnosis: active.diagnosis || null,
          prescription: active.prescription || null,
          followupDate: active.followUp || null,
          doctorNotes: [
            active.chiefComplaint ? `Chief Complaint: ${active.chiefComplaint}` : "",
            active.symptoms ? `Symptoms: ${active.symptoms}` : "",
            active.recommendedTests
              ? `Recommended Tests: ${active.recommendedTests}`
              : "",
          ]
            .filter(Boolean)
            .join("\n"),
        },
        { headers }
      );

      if (data?.success) {
        toast.success(data.message || "Prescription saved successfully");

        await load();

        if (shouldEndConsultation) {
          setActive(null);
        }
      } else {
        toast.error(data?.message || "Failed to save prescription");
      }
    } catch (err) {
      console.error("Save prescription error:", err);
      toast.error(err?.response?.data?.message || "Failed to save prescription");
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = () => savePrescription(false);
  const savePrescriptionOnly = () => savePrescription(false);
  const endConsultation = () => savePrescription(true);

  return (
    <div className="pp-page">
      <div className="pp-container">
        <DoctorSidebar />

        <main className="pp-main-content">
          <p className="pp-welcome">Consultations</p>

          <section className="pp-section">
            <h2 className="pp-section-title">Active Consultation</h2>

            {loading ? (
              <div className="pp-panel">Loading consultation...</div>
            ) : !active ? (
              <div className="pp-panel">
                <p>No active consultation selected.</p>

                {activeAppointments.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    {activeAppointments.map((appointment) => (
                      <button
                        key={appointment.id || appointment._id}
                        className="pp-btn pp-btn-outline pp-btn-sm"
                        style={{ marginRight: 8, marginBottom: 8 }}
                        onClick={() => selectAppointment(appointment)}
                      >
                        {getPatientName(appointment)} — {getDate(appointment)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="pp-panel">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "200px 1fr",
                    gap: 20,
                  }}
                >
                  <div>
                    <div
                      style={{
                        width: 100,
                        height: 100,
                        background: "var(--pp-primary-lighter)",
                        border: "1px solid var(--pp-primary-light)",
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--pp-primary)",
                        fontWeight: 700,
                        fontSize: 32,
                      }}
                    >
                      {getPatientName(active).slice(0, 1)}
                    </div>

                    <div style={{ marginTop: 8, fontWeight: 700 }}>
                      {getPatientName(active)}
                    </div>

                    <div
                      style={{
                        color: "var(--pp-text-secondary)",
                        fontSize: "0.8125rem",
                      }}
                    >
                      {getPatientEmail(active)}
                    </div>

                    <div
                      style={{
                        color: "var(--pp-text-secondary)",
                        fontSize: "0.8125rem",
                        marginTop: 4,
                      }}
                    >
                      {getDate(active)} · {getTime(active)}
                    </div>

                    <div style={{ marginTop: 8 }}>
                      <span className="pp-status-badge pp-status-progress">
                        {getType(active)}
                      </span>
                    </div>

                    {activeAppointments.length > 1 && (
                      <div style={{ marginTop: 16 }}>
                        <div className="pp-panel-title" style={{ marginBottom: 8 }}>
                          Switch Patient
                        </div>

                        {activeAppointments.map((appointment) => (
                          <button
                            key={appointment.id || appointment._id}
                            className="pp-btn pp-btn-outline pp-btn-sm"
                            style={{ marginBottom: 6, width: "100%" }}
                            onClick={() => selectAppointment(appointment)}
                          >
                            {getPatientName(appointment)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    {FORM_FIELDS.map(({ label, key, rows }) => (
                      <div key={key} style={{ marginBottom: 12 }}>
                        <div className="pp-panel-title" style={{ marginBottom: 4 }}>
                          {label}
                        </div>

                        {key === "followUp" ? (
                          <input
                            type="date"
                            className="pp-chat-input"
                            style={{ width: "100%" }}
                            value={active?.[key] || ""}
                            onChange={(e) => changeField(key, e.target.value)}
                          />
                        ) : (
                          <textarea
                            className="pp-chat-input"
                            rows={rows}
                            style={{ width: "100%", resize: "vertical" }}
                            value={active?.[key] || ""}
                            onChange={(e) => changeField(key, e.target.value)}
                          />
                        )}
                      </div>
                    ))}

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        className="pp-btn pp-btn-secondary"
                        onClick={saveNotes}
                        disabled={saving}
                      >
                        Save Notes
                      </button>

                      <button
                        className="pp-btn pp-btn-outline"
                        onClick={savePrescriptionOnly}
                        disabled={saving}
                      >
                        Save Prescription
                      </button>

                      <button
                        className="pp-btn pp-btn-primary"
                        onClick={endConsultation}
                        disabled={saving}
                      >
                        {saving ? "Saving..." : "End Consultation"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="pp-section">
            <h2 className="pp-section-title">AI Patient Summary</h2>

            <div className="pp-panel">
              <div
                style={{
                  background: "var(--pp-background)",
                  padding: 12,
                  borderRadius: 6,
                  whiteSpace: "pre-wrap",
                  fontSize: "0.875rem",
                  color: "var(--pp-text-secondary)",
                  minHeight: 80,
                  lineHeight: 1.7,
                }}
              >
                {aiSummary || "No AI summary available."}
              </div>

              <button
                className="pp-btn pp-btn-outline pp-btn-sm"
                style={{ marginTop: 8 }}
                onClick={() => setAiSummary(buildAiSummary(active))}
              >
                Refresh Summary
              </button>
            </div>
          </section>

          <section className="pp-section">
            <h2 className="pp-section-title">IoT Device Data</h2>
            <IoTDevicePanel patientId={active?.patient?.id || active?.patient?._id || active?.patient_id} backendUrl={backendUrl} token={token} />
          </section>

          <section className="pp-section">
            <h2 className="pp-section-title">Consultation History</h2>

            <div style={{ marginBottom: 12 }}>
              <input
                className="pp-chat-input"
                placeholder="Search patient…"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
              />
            </div>

            <div className="pp-table-container">
              <table className="pp-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Patient</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {displayHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6}>No completed consultations.</td>
                    </tr>
                  ) : (
                    displayHistory.map((appointment) => (
                      <tr key={appointment.id || appointment._id}>
                        <td>{getDate(appointment)}</td>
                        <td>{getTime(appointment)}</td>
                        <td>{getPatientName(appointment)}</td>
                        <td>{getType(appointment)}</td>
                        <td>{appointment.status}</td>
                        <td>
                          <div className="pp-appointment-actions">
                            <button
                              className="pp-btn pp-btn-outline pp-btn-sm"
                              onClick={() => selectAppointment(appointment)}
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default DoctorConsultations;