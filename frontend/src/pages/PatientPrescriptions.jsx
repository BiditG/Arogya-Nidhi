import { useContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import PatientSidebar from "../components/PatientSidebar";
import { AppContext } from "../context/AppContext";
import "./PatientPortal.css";

const PatientPrescriptions = () => {
  const { token, backendUrl } = useContext(AppContext);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fmtDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const loadPrescriptions = async () => {
    try {
      setLoading(true);

      const { data } = await axios.get(
        backendUrl + "/api/consultation-summaries/my-prescriptions",
        { headers }
      );

      if (data.success) {
        setPrescriptions(data.prescriptions || []);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to load prescriptions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadPrescriptions();
  }, [token]);

  return (
    <div className="pp-page">
      <div className="pp-container">
        <PatientSidebar />

        <main className="pp-main-content">
          <p className="pp-welcome">My Prescriptions</p>

          <section className="pp-section">
            <h2 className="pp-section-title">Doctor Prescriptions</h2>

            {loading ? (
              <div className="pp-panel">Loading prescriptions...</div>
            ) : prescriptions.length === 0 ? (
              <div className="pp-panel">No prescriptions found.</div>
            ) : (
              <div className="pp-table-container">
                <table className="pp-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Doctor</th>
                      <th>Specialty</th>
                      <th>Diagnosis</th>
                      <th>Prescription</th>
                      <th>Follow-up</th>
                    </tr>
                  </thead>

                  <tbody>
                    {prescriptions.map((item) => (
                      <tr key={item.id}>
                        <td>{fmtDate(item.created_at)}</td>
                        <td>
                          {item.appointment?.doctor?.users?.name || "Doctor"}
                        </td>
                        <td>{item.appointment?.doctor?.specialty || "—"}</td>
                        <td>{item.diagnosis || "—"}</td>
                        <td style={{ whiteSpace: "pre-wrap" }}>
                          {item.prescription || "—"}
                        </td>
                        <td>{fmtDate(item.followup_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {prescriptions.map((item) => (
            <section className="pp-section" key={`card-${item.id}`}>
              <div className="pp-panel">
                <h3 className="pp-panel-title">
                  Prescription from {item.appointment?.doctor?.users?.name || "Doctor"}
                </h3>

                <p>
                  <strong>Date:</strong> {fmtDate(item.created_at)}
                </p>

                <p>
                  <strong>Diagnosis:</strong> {item.diagnosis || "—"}
                </p>

                <p>
                  <strong>Prescription:</strong>
                </p>

                <div
                  style={{
                    background: "var(--pp-background)",
                    padding: 12,
                    borderRadius: 6,
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.6,
                  }}
                >
                  {item.prescription || "No prescription provided."}
                </div>

                {item.doctor_notes && (
                  <>
                    <p style={{ marginTop: 12 }}>
                      <strong>Doctor Notes:</strong>
                    </p>
                    <div
                      style={{
                        background: "var(--pp-background)",
                        padding: 12,
                        borderRadius: 6,
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.6,
                      }}
                    >
                      {item.doctor_notes}
                    </div>
                  </>
                )}

                <p style={{ marginTop: 12 }}>
                  <strong>Follow-up Date:</strong> {fmtDate(item.followup_date)}
                </p>
              </div>
            </section>
          ))}
        </main>
      </div>
    </div>
  );
};

export default PatientPrescriptions;