import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import PatientSidebar from "../components/PatientSidebar";
import { ArrowLeftIcon, PencilIcon } from "@heroicons/react/24/outline";
import { useContext } from "react";
import { AppContext } from "../context/AppContext";
import "./MedicalHistory.css";

const MedicalHistory = () => {
  const { backendUrl, token } = useContext(AppContext);
  const [medicalHistory, setMedicalHistory] = useState("");
  const [allergies, setAllergies] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ medicalHistory: "", allergies: "" });

  useEffect(() => {
    fetchMedicalHistory();
  }, []);

  const fetchMedicalHistory = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/patient/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setMedicalHistory(data.data.medical_history || "");
        setAllergies(data.data.allergies || "");
        setEditData({
          medicalHistory: data.data.medical_history || "",
          allergies: data.data.allergies || "",
        });
      }
    } catch (error) {
      console.error("Error fetching medical history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    setEditData({ medicalHistory, allergies });
    setEditing(false);
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/patient/profile/health`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          medicalHistory: editData.medicalHistory,
          allergies: editData.allergies,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setMedicalHistory(editData.medicalHistory);
        setAllergies(editData.allergies);
        setEditing(false);
      }
    } catch (error) {
      console.error("Error updating medical history:", error);
    }
  };

  return (
    <div className="mh-page">
      <div className="mh-container">
        <PatientSidebar />

        <main className="mh-main-content">
          <Link to="/patient-portal" className="mh-back-link">
            <ArrowLeftIcon style={{ width: 16, height: 16 }} /> Back to Dashboard
          </Link>

          <div className="mh-header">
            <h1 className="mh-page-title">Medical History</h1>
            <p className="mh-page-subtitle">View and manage your medical history and allergies</p>
            {!editing && (
              <button type="button" className="mh-btn mh-btn-primary" onClick={handleEdit}>
                <PencilIcon style={{ width: 16, height: 16 }} /> Edit
              </button>
            )}
          </div>

          {loading ? (
            <div className="mh-loading">Loading medical history...</div>
          ) : editing ? (
            <div className="mh-edit-form">
              <div className="mh-form-group">
                <label className="mh-form-label">Medical History</label>
                <textarea
                  className="mh-form-textarea"
                  value={editData.medicalHistory}
                  onChange={(e) => setEditData({ ...editData, medicalHistory: e.target.value })}
                  placeholder="Enter your medical history..."
                  rows={6}
                />
              </div>

              <div className="mh-form-group">
                <label className="mh-form-label">Allergies</label>
                <textarea
                  className="mh-form-textarea"
                  value={editData.allergies}
                  onChange={(e) => setEditData({ ...editData, allergies: e.target.value })}
                  placeholder="Enter your allergies..."
                  rows={4}
                />
              </div>

              <div className="mh-form-actions">
                <button type="button" className="mh-btn mh-btn-primary" onClick={handleSave}>
                  Save Changes
                </button>
                <button type="button" className="mh-btn mh-btn-secondary" onClick={handleCancel}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mh-content">
              <div className="mh-section">
                <h2 className="mh-section-title">Medical History</h2>
                <div className="mh-info-box">
                  {medicalHistory ? (
                    <p className="mh-info-text">{medicalHistory}</p>
                  ) : (
                    <p className="mh-info-empty">No medical history recorded</p>
                  )}
                </div>
              </div>

              <div className="mh-section">
                <h2 className="mh-section-title">Allergies</h2>
                <div className="mh-info-box">
                  {allergies ? (
                    <p className="mh-info-text">{allergies}</p>
                  ) : (
                    <p className="mh-info-empty">No allergies recorded</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default MedicalHistory;
