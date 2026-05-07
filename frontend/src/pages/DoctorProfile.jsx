import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import DoctorSidebar from "../components/DoctorSidebar";
import {
  UserCircleIcon,
  DocumentIcon,
  CheckBadgeIcon,
  ClockIcon,
  TrashIcon,
  EyeIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";
import "./PatientPortal.css";

const SPECIALIZATIONS = [
  "Cardiology", "Dermatology", "ENT", "General Medicine", "Gynaecology",
  "Neurology", "Ophthalmology", "Orthopaedics", "Paediatrics", "Psychiatry",
  "Radiology", "Surgery", "Urology",
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DUMMY_DOCS = [
  { id: "d1", name: "Medical Degree Certificate", type: "PDF", status: "verified" },
  { id: "d2", name: "License Registration", type: "PDF", status: "verified" },
  { id: "d3", name: "Specialization Certificate", type: "JPG", status: "pending" },
];

const StatusBadge = ({ status }) => {
  const styles = {
    verified: { background: "#dcfce7", color: "#15803d", border: "1px solid #bbf7d0" },
    pending: { background: "#fefce8", color: "#854d0e", border: "1px solid #fef08a" },
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "0.2rem 0.625rem",
        borderRadius: 9999,
        fontSize: "0.6875rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        ...styles[status],
      }}
    >
      {status === "verified" ? <CheckBadgeIcon style={{ width: 12, height: 12 }} /> : <ClockIcon style={{ width: 12, height: 12 }} />}
      {status}
    </span>
  );
};

const DoctorProfile = () => {
  const { token, userData, backendUrl, loadUserProfileData } = useContext(AppContext);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const docInputRef = useRef(null);

  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [docs, setDocs] = useState(DUMMY_DOCS);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dob: "",
    specialization: "",
    licenseNumber: "",
    yearsOfExperience: "",
    qualification: "",
    hospitalAffiliation: "",
    bio: "",
    consultationFee: "",
    street: "",
    city: "",
    state: "",
    pinCode: "",
    country: "",
    workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
    startTime: "09:00",
    endTime: "18:00",
    consultationDuration: "30",
  });

  useEffect(() => {
    if (!token) return navigate("/login");
    const role = userData?.role || userData?.user?.role;
    if (role !== "doctor") return navigate("/login");

    const name = userData?.name || userData?.user?.name || "";
    const parts = name.split(" ");
    setForm((f) => ({
      ...f,
      firstName: parts[0] || "",
      lastName: parts.slice(1).join(" ") || "",
      email: userData?.email || userData?.user?.email || "",
      phone: userData?.phone || userData?.user?.phone || "",
    }));
    if (userData?.image || userData?.user?.avatar_url || userData?.user?.avatarUrl) {
      setImagePreview(userData?.image || userData?.user?.avatar_url || userData?.user?.avatarUrl);
    }
  }, [token, userData, navigate]);

  useEffect(() => {
    if (!token) return;
    const loadDoctorProfile = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}`, dtoken: token };
        const { data } = await axios.get(backendUrl + "/api/auth/doctor/profile", { headers });
        const body = data || {};
        const profile = body?.data?.profile || body?.profile || body?.data || null;
        if (!profile) return;

        setForm((f) => ({
          ...f,
          specialization: profile.specialty || "",
          licenseNumber: profile.license_no || profile.nmc_license_no || "",
          qualification: profile.qualifications || "",
          consultationFee: profile.consultation_fee ?? "",
        }));
      } catch (err) {
        console.error("Failed to load doctor profile", err?.response?.data || err.message || err);
      }
    };

    loadDoctorProfile();
  }, [backendUrl, token]);

  const handleField = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const toggleDay = (day) => {
    setForm((f) => ({
      ...f,
      workingDays: f.workingDays.includes(day)
        ? f.workingDays.filter((d) => d !== day)
        : [...f.workingDays, day],
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProfileImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleDocDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) addDoc(file);
  };

  const handleDocInput = (e) => {
    const file = e.target.files[0];
    if (file) addDoc(file);
  };

  const addDoc = (file) => {
    const ext = file.name.split(".").pop().toUpperCase();
    setDocs((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, name: file.name.replace(/\.[^.]+$/, ""), type: ext, status: "pending" },
    ]);
  };

  const deleteDoc = (id) => setDocs((prev) => prev.filter((d) => d.id !== id));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!token || saving) return;
    setSaving(true);
    try {
      const payload = {
        firstName: form.firstName?.trim() || undefined,
        lastName: form.lastName?.trim() || undefined,
        email: form.email?.trim() || undefined,
        phone: form.phone?.trim() || null,
        specialty: form.specialization || undefined,
        license_no: form.licenseNumber?.trim() || undefined,
        qualifications: form.qualification?.trim() || undefined,
        consultation_fee: form.consultationFee === "" ? null : Number(form.consultationFee),
      };

      const headers = { Authorization: `Bearer ${token}`, dtoken: token };
      const { data } = await axios.post(backendUrl + "/api/auth/doctor/update-profile", payload, { headers });
      if (!data?.success) throw new Error(data?.message || "Update failed");

      toast.success("Profile updated successfully");
      await loadUserProfileData();
      navigate("/doctor-portal");
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pp-page">
      <div className="pp-container">
        <DoctorSidebar />

        <main className="pp-main-content">
          <button
            onClick={() => navigate("/doctor-portal")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "none",
              color: "var(--pp-text-secondary)",
              fontSize: "0.8125rem",
              fontWeight: 500,
              cursor: "pointer",
              marginBottom: "1.25rem",
              padding: 0,
            }}
          >
            <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>

          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--pp-text-primary)",
              marginBottom: "0.25rem",
            }}
          >
            Edit Profile
          </h1>
          <hr style={{ border: "none", borderTop: "1px solid var(--pp-border)", marginBottom: "1.75rem" }} />

          <form onSubmit={handleSave}>
            {/* ── Profile Picture ── */}
            <section className="pp-section">
              <h2 className="pp-section-title">Profile Picture</h2>
              <div
                className="pp-panel"
                style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "1.5rem", alignItems: "start" }}
              >
                <div>
                  <div
                    style={{
                      width: 130,
                      height: 130,
                      border: "2px dashed var(--pp-border)",
                      borderRadius: "0.5rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      background: "var(--pp-background)",
                      marginBottom: "0.75rem",
                    }}
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ textAlign: "center", color: "var(--pp-text-muted)", fontSize: "0.75rem" }}>
                        <UserCircleIcon style={{ width: 40, height: 40, margin: "0 auto 4px" }} />
                        Profile Photo
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      className="pp-btn pp-btn-secondary pp-btn-sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload New
                    </button>
                    <button
                      type="button"
                      className="pp-btn pp-btn-outline pp-btn-sm"
                      onClick={() => { setProfileImage(null); setImagePreview(null); }}
                    >
                      Remove
                    </button>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageChange} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <FormField label="First Name" required>
                    <input className="dp-input" name="firstName" placeholder="Enter First Name" value={form.firstName} onChange={handleField} required />
                  </FormField>
                  <FormField label="Last Name" required>
                    <input className="dp-input" name="lastName" placeholder="Enter Last Name" value={form.lastName} onChange={handleField} />
                  </FormField>
                  <FormField label="Email" required style={{ gridColumn: "1 / -1" }}>
                    <input className="dp-input" name="email" type="email" placeholder="Enter Email Address" value={form.email} onChange={handleField} required />
                  </FormField>
                  <FormField label="Phone Number" required>
                    <input className="dp-input" name="phone" placeholder="Enter Phone Number" value={form.phone} onChange={handleField} />
                  </FormField>
                  <FormField label="Date of Birth">
                    <input className="dp-input" name="dob" type="date" placeholder="DD/MM/YYYY" value={form.dob} onChange={handleField} />
                  </FormField>
                </div>
              </div>
            </section>

            {/* ── Professional Information ── */}
            <section className="pp-section">
              <h2 className="pp-section-title">Professional Information</h2>
              <div className="pp-panel" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <FormField label="Specialization" required>
                  <select className="dp-input dp-select" name="specialization" value={form.specialization} onChange={handleField} required>
                    <option value="">Select Specialization</option>
                    {SPECIALIZATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </FormField>
                <FormField label="License Number" required>
                  <input className="dp-input" name="licenseNumber" placeholder="Enter License Number" value={form.licenseNumber} onChange={handleField} />
                </FormField>
                <FormField label="Years of Experience">
                  <input className="dp-input" name="yearsOfExperience" type="number" min="0" placeholder="Enter Years" value={form.yearsOfExperience} onChange={handleField} />
                </FormField>
                <FormField label="Qualification">
                  <input className="dp-input" name="qualification" placeholder="Enter Qualification" value={form.qualification} onChange={handleField} />
                </FormField>
                <FormField label="Hospital/Clinic Affiliation" style={{ gridColumn: "1 / -1" }}>
                  <input className="dp-input" name="hospitalAffiliation" placeholder="Enter Affiliation" value={form.hospitalAffiliation} onChange={handleField} />
                </FormField>
                <FormField label="Bio/About" style={{ gridColumn: "1 / -1" }}>
                  <textarea
                    className="dp-input dp-textarea"
                    name="bio"
                    placeholder="Write a brief description about yourself..."
                    value={form.bio}
                    onChange={handleField}
                    rows={4}
                  />
                </FormField>
                <FormField label="Consultation Fee (₹)" style={{ gridColumn: "1 / -1" }}>
                  <input className="dp-input" name="consultationFee" type="number" min="0" placeholder="Enter Consultation Fee" value={form.consultationFee} onChange={handleField} />
                </FormField>
              </div>
            </section>

            {/* ── Medical Certificates & Documents ── */}
            <section className="pp-section">
              <h2 className="pp-section-title">Medical Certificates &amp; Documents</h2>
              <div className="pp-panel">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--pp-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Uploaded Documents
                  </span>
                  <button
                    type="button"
                    className="pp-btn pp-btn-secondary pp-btn-sm"
                    onClick={() => docInputRef.current?.click()}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <ArrowUpTrayIcon style={{ width: 13, height: 13 }} />
                    + Upload New Document
                  </button>
                  <input ref={docInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={handleDocInput} />
                </div>

                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDocDrop}
                  onClick={() => docInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragOver ? "var(--pp-primary)" : "var(--pp-border)"}`,
                    borderRadius: "0.5rem",
                    padding: "2rem",
                    textAlign: "center",
                    cursor: "pointer",
                    background: dragOver ? "var(--pp-primary-lighter)" : "var(--pp-background)",
                    transition: "all 0.2s",
                    marginBottom: "1.25rem",
                  }}
                >
                  <DocumentIcon style={{ width: 36, height: 36, margin: "0 auto 0.5rem", color: "var(--pp-text-muted)" }} />
                  <p style={{ color: "var(--pp-text-secondary)", fontSize: "0.875rem", fontWeight: 500, margin: "0 0 0.25rem" }}>
                    Drag &amp; Drop files here or click to browse
                  </p>
                  <p style={{ color: "var(--pp-text-muted)", fontSize: "0.75rem", margin: 0 }}>
                    (Supported formats: PDF, JPG, PNG | Max size: 5MB)
                  </p>
                </div>

                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--pp-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
                  Existing Documents
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  {docs.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.875rem",
                        padding: "0.75rem 1rem",
                        border: "1px solid var(--pp-border)",
                        borderRadius: "0.375rem",
                        background: "var(--pp-surface)",
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          background: "var(--pp-primary-lighter)",
                          border: "1px solid var(--pp-primary-light)",
                          borderRadius: "0.375rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <DocumentIcon style={{ width: 18, height: 18, color: "var(--pp-primary)" }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--pp-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {doc.name}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--pp-text-muted)" }}>{doc.type}</div>
                      </div>
                      <StatusBadge status={doc.status} />
                      <button type="button" className="pp-btn pp-btn-outline pp-btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <EyeIcon style={{ width: 12, height: 12 }} /> View
                      </button>
                      <button
                        type="button"
                        className="pp-btn pp-btn-sm"
                        onClick={() => deleteDoc(doc.id)}
                        style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", display: "inline-flex", alignItems: "center", gap: 4 }}
                      >
                        <TrashIcon style={{ width: 12, height: 12 }} /> Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* ── Address Information ── */}
            <section className="pp-section">
              <h2 className="pp-section-title">Address Information</h2>
              <div className="pp-panel" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                <FormField label="Street Address" style={{ gridColumn: "1 / -1" }}>
                  <input className="dp-input" name="street" placeholder="Enter Street Address" value={form.street} onChange={handleField} />
                </FormField>
                <FormField label="City">
                  <input className="dp-input" name="city" placeholder="Enter City" value={form.city} onChange={handleField} />
                </FormField>
                <FormField label="State">
                  <input className="dp-input" name="state" placeholder="Enter State" value={form.state} onChange={handleField} />
                </FormField>
                <FormField label="Pin Code">
                  <input className="dp-input" name="pinCode" placeholder="Enter Pin Code" value={form.pinCode} onChange={handleField} />
                </FormField>
                <FormField label="Country" style={{ gridColumn: "1 / -1" }}>
                  <select className="dp-input dp-select" name="country" value={form.country} onChange={handleField}>
                    <option value="">Select Country</option>
                    <option value="Nepal">Nepal</option>
                    <option value="India">India</option>
                    <option value="Other">Other</option>
                  </select>
                </FormField>
              </div>
            </section>

            {/* ── Availability Settings ── */}
            <section className="pp-section">
              <h2 className="pp-section-title">Availability Settings</h2>
              <div className="pp-panel" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--pp-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
                    Working Days
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {DAYS.map((day) => {
                      const active = form.workingDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          style={{
                            padding: "0.375rem 0.875rem",
                            borderRadius: "0.375rem",
                            border: `1px solid ${active ? "var(--pp-primary)" : "var(--pp-border)"}`,
                            background: active ? "var(--pp-primary)" : "var(--pp-surface)",
                            color: active ? "#fff" : "var(--pp-text-secondary)",
                            fontSize: "0.8125rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <FormField label="Start Time">
                    <input className="dp-input" name="startTime" type="time" value={form.startTime} onChange={handleField} />
                  </FormField>
                  <FormField label="End Time">
                    <input className="dp-input" name="endTime" type="time" value={form.endTime} onChange={handleField} />
                  </FormField>
                </div>

                <FormField label="Consultation Duration (Minutes)" style={{ gridColumn: "1 / -1" }}>
                  <input className="dp-input" name="consultationDuration" type="number" min="5" step="5" placeholder="30" value={form.consultationDuration} onChange={handleField} />
                </FormField>
              </div>
            </section>

            {/* ── Actions ── */}
            <div style={{ display: "flex", gap: "0.75rem", paddingBottom: "2rem" }}>
              <button type="submit" className="pp-btn pp-btn-primary" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button type="button" className="pp-btn pp-btn-secondary" onClick={() => navigate("/doctor-portal")}>
                Cancel
              </button>
              <button
                type="button"
                className="pp-btn pp-btn-outline"
                onClick={() => navigate("/doctor-portal/profile/preview")}
              >
                Preview Profile
              </button>
            </div>
          </form>
        </main>
      </div>

      <style>{`
        .dp-input {
          width: 100%;
          padding: 0.5625rem 0.75rem;
          border: 1px solid var(--pp-border);
          border-radius: 0.375rem;
          font-size: 0.875rem;
          color: var(--pp-text-primary);
          background: var(--pp-surface);
          outline: none;
          transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .dp-input:focus {
          border-color: var(--pp-primary);
        }
        .dp-input::placeholder {
          color: var(--pp-text-muted);
        }
        .dp-select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.75rem center;
          background-size: 14px;
          padding-right: 2rem;
        }
        .dp-textarea {
          resize: vertical;
          min-height: 90px;
        }
      `}</style>
    </div>
  );
};

const FormField = ({ label, required, children, style }) => (
  <div style={style}>
    <label
      style={{
        display: "block",
        fontSize: "0.75rem",
        fontWeight: 600,
        color: "var(--pp-text-secondary)",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        marginBottom: "0.375rem",
      }}
    >
      {label}{required && <span style={{ color: "#dc2626", marginLeft: 2 }}>*</span>}
    </label>
    {children}
  </div>
);

export default DoctorProfile;
