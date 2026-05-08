import { useState, useContext, useEffect } from "react";
import { toast } from "react-toastify";
import { AdminContext } from "../../context/AdminContext";

const DoctorVerification = () => {
  const { doctors, getAllDoctors, verifyDoctor, aToken } = useContext(AdminContext);
  
  const [activeFilter, setActiveFilter] = useState("PENDING");
  const [verificationNotes, setVerificationNotes] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);

  useEffect(() => {
    if (aToken) {
      getAllDoctors();
    }
  }, [aToken]);
  const filters = ["PENDING", "VERIFIED", "REJECTED", "ALL"];

  const getDoctorStatus = (doctor) => {
    return (doctor.verification_status || (doctor.is_verified ? 'verified' : 'pending')).toUpperCase();
  };

  const filteredDoctors = doctors?.filter((doc) => {
    const status = getDoctorStatus(doc);
    if (activeFilter === "ALL") return true;
    return status === activeFilter;
  }) || [];

  const handleApproveDoctor = async (doctorId) => {
    const success = await verifyDoctor(doctorId, "verified");
    if (success) {
      setShowModal(false);
    }
  };

  const handleRejectDoctor = async (doctorId) => {
    const success = await verifyDoctor(doctorId, "rejected");
    if (success) {
      setShowModal(false);
    }
  };

  const handleRequestInfo = (doctorId) => {
    const note = verificationNotes[doctorId] || "Please provide additional information";
    toast.info(`Information request sent to doctor. Note: ${note}`);
  };

  return (
    <div>
      <h1 className="ap-page-title">Doctor Verification</h1>

      {/* Filter Buttons */}
      <section className="ap-section ap-card">
        <div className="ap-filter-buttons">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`ap-filter-btn ${activeFilter === filter ? 'active' : ''}`}
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      {/* Doctors List */}
      <section className="ap-section">
        {filteredDoctors.length === 0 ? (
          <div className="ap-card">
            <p className="ap-list-meta">No doctors found with the selected status</p>
          </div>
        ) : (activeFilter === "VERIFIED" || activeFilter === "REJECTED") ? (
          /* Table View for Verified/Rejected Doctors */
          <div className="ap-card overflow-hidden">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Doctor Name</th>
                  <th>Specialty</th>
                  <th>License No</th>
                  <th>Fee</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDoctors.map((doctor) => {
                  const docStatus = getDoctorStatus(doctor);
                  return (
                    <tr key={doctor.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <img 
                            src={doctor.users?.avatar_url || "https://via.placeholder.com/40"} 
                            alt="" 
                            className="w-8 h-8 rounded-full bg-gray-100"
                          />
                          <span>{doctor.users?.name}</span>
                        </div>
                      </td>
                      <td>{doctor.specialty}</td>
                      <td>{doctor.license_no}</td>
                      <td>NPR {doctor.consultation_fee}</td>
                      <td>
                        <span className={`ap-badge ap-badge-${docStatus.toLowerCase()}`}>
                          {docStatus}
                        </span>
                      </td>
                      <td>
                        <button className="ap-btn ap-btn-outline ap-btn-sm" onClick={() => setActiveFilter("ALL")}>View Details</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Card View for Pending/All */
          <div className="ap-grid ap-grid-2">
            {filteredDoctors.map((doctor) => {
              const docStatus = getDoctorStatus(doctor).toLowerCase();
              return (
                <div key={doctor.id} className="ap-card">
                  <div className="ap-card-header">
                  <div>
                    <h3 className="ap-card-title">{doctor.users?.name}</h3>
                    <p className="ap-card-subtitle">{doctor.specialty}</p>
                  </div>
                  <span className={`ap-badge ap-badge-${docStatus}`}>
                    {docStatus.toUpperCase()}
                  </span>
                </div>
                
                <div className="ap-form-group">
                  <label className="ap-form-label">Email</label>
                  <p className="ap-list-meta">{doctor.users?.email}</p>
                </div>

                <div className="ap-form-group">
                  <label className="ap-form-label">Medical License</label>
                  <p className="ap-list-meta">{doctor.license_no || 'N/A'}</p>
                </div>

                <div className="ap-form-group">
                  <label className="ap-form-label">Qualifications</label>
                  <p className="ap-list-meta">{doctor.qualifications || 'N/A'}</p>
                </div>

                <div className="ap-form-group">
                  <label className="ap-form-label">Consultation Fee</label>
                  <p className="ap-list-meta">NPR {doctor.consultation_fee}</p>
                </div>

                <div className="ap-form-group">
                  <label className="ap-form-label">Experience</label>
                  <p className="ap-list-meta">{doctor.experience_years || 'N/A'} years</p>
                </div>

                <div className="ap-form-group">
                  <label className="ap-form-label">Bio / Notes</label>
                  <p className="ap-list-meta">{doctor.bio || 'No notes provided'}</p>
                </div>

                {/* Action Buttons - only show for pending */}
                {!doctor.is_verified && docStatus === 'pending' && (
                  <div className="ap-button-group" style={{ marginTop: '1rem' }}>
                    <button 
                      onClick={() => handleRequestInfo(doctor.id)}
                      className="ap-btn ap-btn-outline"
                    >
                      Request Info
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedAction({ type: 'reject', doctorId: doctor.id, doctorName: doctor.users?.name });
                        setShowModal(true);
                      }}
                      className="ap-btn ap-btn-danger"
                    >
                      Reject
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedAction({ type: 'approve', doctorId: doctor.id, doctorName: doctor.users?.name });
                        setShowModal(true);
                      }}
                      className="ap-btn ap-btn-success"
                    >
                      Approve
                    </button>
                  </div>
                )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Confirmation Modal */}
      {showModal && selectedAction && (
        <div className="ap-modal">
          <div className="ap-modal-content">
            <div className="ap-modal-header">
              <h3 className="ap-modal-title">
                {selectedAction.type === 'approve' ? 'Approve Doctor' : 'Reject Application'}
              </h3>
            </div>
            <div className="ap-modal-body">
              <p className="ap-list-meta">
                Are you sure you want to {selectedAction.type} <strong>{selectedAction.doctorName}</strong>'s application?
              </p>
            </div>
            <div className="ap-modal-footer">
              <button
                onClick={() => setShowModal(false)}
                className="ap-btn ap-btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedAction.type === 'approve') {
                    handleApproveDoctor(selectedAction.doctorId);
                  } else {
                    handleRejectDoctor(selectedAction.doctorId);
                  }
                }}
                className={`ap-btn ${selectedAction.type === 'approve' ? 'ap-btn-success' : 'ap-btn-danger'}`}
              >
                {selectedAction.type === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorVerification;
