<<<<<<< HEAD
import { useState } from "react";
import { toast } from "react-toastify";

const DoctorVerification = () => {
  const [activeFilter, setActiveFilter] = useState("PENDING");
  const [verificationNotes, setVerificationNotes] = useState({});
  const [expandedDoctor, setExpandedDoctor] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);

  const [doctors, setDoctors] = useState([
    {
      id: 1,
      name: "Dr. John Smith",
      email: "john.smith@hospital.com",
      specialty: "Cardiology",
      appliedDate: "2026-04-20",
      status: "PENDING",
      medicalLicense: "ML/2024/12345",
      degreeCertificate: "MD/2015/67890",
      idProof: "AADHAR/123456789",
      experience: "12 years",
      hospital: "City Hospital",
    },
    {
      id: 2,
      name: "Dr. Sarah Johnson",
      email: "sarah.johnson@clinic.com",
      specialty: "Dermatology",
      appliedDate: "2026-04-18",
      status: "PENDING",
      medicalLicense: "ML/2024/54321",
      degreeCertificate: "MD/2018/98765",
      idProof: "AADHAR/987654321",
      experience: "8 years",
      hospital: "Skin Clinic",
    },
    {
      id: 3,
      name: "Dr. Michael Brown",
      email: "michael.brown@hospital.com",
      specialty: "Orthopedics",
      appliedDate: "2026-04-15",
      status: "VERIFIED",
      medicalLicense: "ML/2024/11111",
      degreeCertificate: "MD/2016/22222",
      idProof: "AADHAR/333333333",
      experience: "10 years",
      hospital: "Main Hospital",
    },
  ]);

  const filters = ["PENDING", "VERIFIED", "REJECTED", "ALL"];

  const filteredDoctors = doctors.filter((doc) => {
    if (activeFilter === "ALL") return true;
    return doc.status === activeFilter;
  });

  const handleApproveDoctor = (doctorId) => {
    setDoctors(prev => prev.map(doc =>
      doc.id === doctorId ? { ...doc, status: "VERIFIED" } : doc
    ));
    toast.success("Doctor approved successfully!");
    setShowModal(false);
  };

  const handleRejectDoctor = (doctorId) => {
    setDoctors(prev => prev.map(doc =>
      doc.id === doctorId ? { ...doc, status: "REJECTED" } : doc
    ));
    toast.error("Doctor application rejected!");
    setShowModal(false);
=======
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

  const filteredDoctors = doctors?.filter((doc) => {
    const status = doc.is_verified ? "VERIFIED" : "PENDING";
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
>>>>>>> faaa6941737f830510b23ce6328c2e7a7b0e7b9f
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
<<<<<<< HEAD
        ) : (
=======
        ) : activeFilter === "VERIFIED" ? (
          /* Table View for Verified Doctors */
          <div className="ap-card overflow-hidden">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Doctor Name</th>
                  <th>Specialty</th>
                  <th>License No</th>
                  <th>Fee</th>
                  <th>Joined Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredDoctors.map((doctor) => (
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
                    <td>{new Date(doctor.created_at).toLocaleDateString()}</td>
                    <td>
                      <span className="ap-badge ap-badge-verified">Verified</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Card View for Pending/Rejected */
>>>>>>> faaa6941737f830510b23ce6328c2e7a7b0e7b9f
          <div className="ap-grid ap-grid-2">
            {filteredDoctors.map((doctor) => (
              <div key={doctor.id} className="ap-card">
                <div className="ap-card-header">
                  <div>
<<<<<<< HEAD
                    <h3 className="ap-card-title">{doctor.name}</h3>
                    <p className="ap-card-subtitle">{doctor.specialty}</p>
                  </div>
                  <span className={`ap-badge ap-badge-${doctor.status.toLowerCase()}`}>
                    {doctor.status}
                  </span>
                </div>

                {/* Doctor Info */}
                <div className="ap-form-group">
                  <label className="ap-form-label">Email</label>
                  <p className="ap-list-meta">{doctor.email}</p>
=======
                    <h3 className="ap-card-title">{doctor.users?.name}</h3>
                    <p className="ap-card-subtitle">{doctor.specialty}</p>
                  </div>
                  <span className={`ap-badge ap-badge-${doctor.is_verified ? 'verified' : 'pending'}`}>
                    {doctor.is_verified ? 'VERIFIED' : 'PENDING'}
                  </span>
                </div>
                
                <div className="ap-form-group">
                  <label className="ap-form-label">Email</label>
                  <p className="ap-list-meta">{doctor.users?.email}</p>
>>>>>>> faaa6941737f830510b23ce6328c2e7a7b0e7b9f
                </div>

                <div className="ap-form-group">
                  <label className="ap-form-label">Medical License</label>
<<<<<<< HEAD
                  <p className="ap-list-meta">{doctor.medicalLicense}</p>
                </div>

                <div className="ap-form-group">
                  <label className="ap-form-label">Degree Certificate</label>
                  <p className="ap-list-meta">{doctor.degreeCertificate}</p>
                </div>

                <div className="ap-form-group">
                  <label className="ap-form-label">ID Proof</label>
                  <p className="ap-list-meta">{doctor.idProof}</p>
=======
                  <p className="ap-list-meta">{doctor.license_no || 'N/A'}</p>
                </div>

                <div className="ap-form-group">
                  <label className="ap-form-label">Qualifications</label>
                  <p className="ap-list-meta">{doctor.qualifications || 'N/A'}</p>
                </div>

                <div className="ap-form-group">
                  <label className="ap-form-label">Consultation Fee</label>
                  <p className="ap-list-meta">NPR {doctor.consultation_fee}</p>
>>>>>>> faaa6941737f830510b23ce6328c2e7a7b0e7b9f
                </div>

                <div className="ap-form-group">
                  <label className="ap-form-label">Experience</label>
<<<<<<< HEAD
                  <p className="ap-list-meta">{doctor.experience}</p>
                </div>

                <div className="ap-form-group">
                  <label className="ap-form-label">Hospital</label>
                  <p className="ap-list-meta">{doctor.hospital}</p>
                </div>

                <div className="ap-form-group">
                  <label className="ap-form-label">Applied Date</label>
                  <p className="ap-list-meta">{doctor.appliedDate}</p>
                </div>

                {/* Verification Notes */}
                <div className="ap-form-group">
                  <label className="ap-form-label">Verification Notes</label>
                  <textarea
                    value={verificationNotes[doctor.id] || ""}
                    onChange={(e) => setVerificationNotes({ ...verificationNotes, [doctor.id]: e.target.value })}
                    className="ap-form-textarea"
                    placeholder="Add verification notes here..."
                  />
                </div>

                {/* Action Buttons */}
                {doctor.status === "PENDING" && (
=======
                  <p className="ap-list-meta">{doctor.experience_years || 'N/A'} years</p>
                </div>

                <div className="ap-form-group">
                  <label className="ap-form-label">Bio / Notes</label>
                  <p className="ap-list-meta">{doctor.bio || 'No notes provided'}</p>
                </div>

                {/* Action Buttons */}
                {!doctor.is_verified && (
>>>>>>> faaa6941737f830510b23ce6328c2e7a7b0e7b9f
                  <div className="ap-button-group" style={{ marginTop: '1rem' }}>
                    <button 
                      onClick={() => handleRequestInfo(doctor.id)}
                      className="ap-btn ap-btn-outline"
                    >
                      Request Info
                    </button>
                    <button 
                      onClick={() => {
<<<<<<< HEAD
                        setSelectedAction({ type: 'reject', doctorId: doctor.id, doctorName: doctor.name });
=======
                        setSelectedAction({ type: 'reject', doctorId: doctor.id, doctorName: doctor.users?.name });
>>>>>>> faaa6941737f830510b23ce6328c2e7a7b0e7b9f
                        setShowModal(true);
                      }}
                      className="ap-btn ap-btn-danger"
                    >
                      Reject
                    </button>
                    <button 
                      onClick={() => {
<<<<<<< HEAD
                        setSelectedAction({ type: 'approve', doctorId: doctor.id, doctorName: doctor.name });
=======
                        setSelectedAction({ type: 'approve', doctorId: doctor.id, doctorName: doctor.users?.name });
>>>>>>> faaa6941737f830510b23ce6328c2e7a7b0e7b9f
                        setShowModal(true);
                      }}
                      className="ap-btn ap-btn-success"
                    >
                      Approve
                    </button>
                  </div>
                )}
              </div>
            ))}
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
