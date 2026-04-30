import { useState } from "react";
import { Link } from "react-router-dom";
import PatientSidebar from "../components/PatientSidebar";
import { ArrowLeftIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { useContext } from "react";
import { AppContext } from "../context/AppContext";
import "./MedicalHistory.css";

const RECORDS = [
  {
    id: 1,
    date: "April 8, 2026",
    doctorInitials: "SJ",
    doctorName: "Dr. Sarah Johnson",
    doctorSub: "Cardiologist • General Hospital",
    type: "General Checkup",
    chiefComplaint: "Chest pain and shortness of breath during exercise",
    symptoms: "Mild chest tightness, occasional palpitations, fatigue after walking",
    diagnosisLabel: "Primary Diagnosis",
    diagnosis: "Stable Angina Pectoris (I20.8)",
    prescriptions: [
      "Aspirin 81mg — Once daily",
      "Metoprolol 50mg — Twice daily",
      "Atorvastatin 20mg — Once daily at bedtime",
    ],
    followUp: "Return in 2 weeks for stress test. Avoid strenuous exercise until then.",
    notes: null,
  },
  {
    id: 2,
    date: "March 15, 2026",
    doctorInitials: "MC",
    doctorName: "Dr. Michael Chen",
    doctorSub: "General Physician • City Medical Center",
    type: "Annual Physical",
    chiefComplaint: "Routine annual health examination",
    symptoms: "None reported",
    diagnosisLabel: "Assessment",
    diagnosis: "Healthy adult, no acute concerns",
    prescriptions: [],
    followUp: null,
    notes:
      "Blood pressure slightly elevated (138/88). Recommended lifestyle modifications: reduce sodium intake, increase physical activity. Labs ordered: lipid panel, HbA1c.",
  },
  {
    id: 3,
    date: "February 22, 2026",
    doctorInitials: "EW",
    doctorName: "Dr. Emily Williams",
    doctorSub: "Dermatologist • Skin Care Clinic",
    type: "Follow-up",
    chiefComplaint: "Persistent eczema on hands and arms",
    symptoms: "Dry, itchy patches on both hands, redness and mild scaling",
    diagnosisLabel: "Primary Diagnosis",
    diagnosis: "Atopic Dermatitis (L20.9)",
    prescriptions: [
      "Hydrocortisone 1% cream — Apply twice daily to affected areas",
      "Moisturizing lotion — Apply as needed",
    ],
    followUp: "Return if no improvement in 2 weeks. Avoid irritants and hot water.",
    notes: null,
  },
  {
    id: 4,
    date: "January 10, 2026",
    doctorInitials: "RJ",
    doctorName: "Dr. Robert Jones",
    doctorSub: "Orthopedic Surgeon • Bone & Joint Center",
    type: "Post-Op Check",
    chiefComplaint: "Follow-up after knee arthroscopy",
    symptoms: "Mild swelling, occasional pain with movement",
    diagnosisLabel: "Post-Operative Status",
    diagnosis: "Healing well, no signs of infection",
    prescriptions: [],
    followUp: null,
    notes:
      "Sutures removed. Range of motion improving. Continue physical therapy 3x weekly. Gradual return to normal activities allowed.",
  },
];

const MedicalHistory = () => {
  const { backendUrl, token } = useContext(AppContext);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("All Dates");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [activeFilter, setActiveFilter] = useState({ search: "", date: "All Dates", type: "All Types" });

  const applyFilters = () => {
    setActiveFilter({ search, date: dateFilter, type: typeFilter });
  };

  const clearFilters = () => {
    setSearch("");
    setDateFilter("All Dates");
    setTypeFilter("All Types");
    setActiveFilter({ search: "", date: "All Dates", type: "All Types" });
  };

  const filtered = RECORDS.filter((r) => {
    const q = activeFilter.search.toLowerCase();
    if (q && !r.doctorName.toLowerCase().includes(q) && !r.diagnosis.toLowerCase().includes(q) && !r.type.toLowerCase().includes(q)) return false;
    if (activeFilter.type !== "All Types" && r.type !== activeFilter.type) return false;
    return true;
  });

  return (
    <div className="mh-page">
      <div className="mh-container">
        <PatientSidebar />

        <main className="mh-main-content">
          <Link to="/patient-portal" className="mh-back-link">
            <ArrowLeftIcon style={{ width: 16, height: 16 }} /> Back to Dashboard
          </Link>

          <h1 className="mh-page-title">Medical History</h1>
          <p className="mh-page-subtitle">View your past appointments and doctor diagnoses</p>

          <div className="mh-filter-container">
            <input
              type="text"
              className="mh-filter-input"
              placeholder="Search by doctor or diagnosis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            />
            <select
              className="mh-filter-select"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option>All Dates</option>
              <option>Last 30 Days</option>
              <option>Last 6 Months</option>
              <option>Last Year</option>
            </select>
            <select
              className="mh-filter-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option>All Types</option>
              <option>General Checkup</option>
              <option>Annual Physical</option>
              <option>Follow-up</option>
              <option>Post-Op Check</option>
              <option>Emergency</option>
            </select>
            <button type="button" className="mh-btn mh-btn-primary" onClick={applyFilters}>
              <FunnelIcon style={{ width: 15, height: 15 }} /> Filter
            </button>
            {(activeFilter.search || activeFilter.type !== "All Types") && (
              <button type="button" className="mh-btn mh-btn-secondary" onClick={clearFilters}>
                Clear
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="mh-empty-state">No records match your filters.</div>
          ) : (
            <div className="mh-timeline">
              {filtered.map((record) => (
                <div key={record.id} className="mh-timeline-item">
                  <div className="mh-timeline-date">{record.date}</div>
                  <div className="mh-consultation-card">
                    <div className="mh-consultation-header">
                      <div className="mh-doctor-info">
                        <div className="mh-doctor-avatar">{record.doctorInitials}</div>
                        <div>
                          <div className="mh-doctor-name">{record.doctorName}</div>
                          <div className="mh-doctor-sub">{record.doctorSub}</div>
                        </div>
                      </div>
                      <span className="mh-consultation-type">{record.type}</span>
                    </div>

                    <div className="mh-consultation-body">
                      <div className="mh-info-row">
                        <div className="mh-info-label">Chief Complaint</div>
                        <div className="mh-info-value">{record.chiefComplaint}</div>
                      </div>

                      <div className="mh-info-row">
                        <div className="mh-info-label">Symptoms</div>
                        <div className="mh-info-value">{record.symptoms}</div>
                      </div>

                      <div className="mh-info-row">
                        <div className="mh-info-label">Diagnosis</div>
                        <div className="mh-info-value">
                          <div className="mh-diagnosis-box">
                            <div className="mh-diagnosis-title">{record.diagnosisLabel}</div>
                            <div className="mh-diagnosis-text">{record.diagnosis}</div>
                          </div>
                        </div>
                      </div>

                      {record.prescriptions.length > 0 && (
                        <div className="mh-info-row">
                          <div className="mh-info-label">Prescription</div>
                          <div className="mh-info-value">
                            <ul className="mh-prescription-list">
                              {record.prescriptions.map((p, i) => (
                                <li key={i}>• {p}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {record.followUp && (
                        <div className="mh-info-row">
                          <div className="mh-info-label">Follow-up</div>
                          <div className="mh-info-value">{record.followUp}</div>
                        </div>
                      )}

                      {record.notes && (
                        <div className="mh-info-row">
                          <div className="mh-info-label">Notes</div>
                          <div className="mh-info-value">{record.notes}</div>
                        </div>
                      )}
                    </div>

                    <div className="mh-consultation-actions">
                      <button type="button" className="mh-btn mh-btn-primary mh-btn-sm">
                        Download Report
                      </button>
                      <button type="button" className="mh-btn mh-btn-secondary mh-btn-sm">
                        Share
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default MedicalHistory;
