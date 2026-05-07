import { useContext, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PatientSidebar from "../components/PatientSidebar";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import {
  ArrowLeftIcon,
  UserIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  PlusIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  PhotoIcon,
  DocumentIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import "./PatientPortal.css";
import "./EditProfile.css";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const REPORT_CATEGORIES = ["blood_test", "x_ray", "mri_ct", "prescription", "other"];
const CATEGORY_LABELS = {
  blood_test: "Blood Test",
  x_ray: "X-Ray",
  mri_ct: "MRI/CT Scan",
  prescription: "Prescription",
  other: "Other",
};

function reportIcon(category) {
  if (category === "x_ray" || category === "mri_ct") return <PhotoIcon style={{ width: 20, height: 20 }} />;
  if (category === "prescription") return <DocumentTextIcon style={{ width: 20, height: 20 }} />;
  return <DocumentIcon style={{ width: 20, height: 20 }} />;
}

const EditProfile = () => {
  const { backendUrl, token } = useContext(AppContext);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const reportInputRef = useRef(null);
  const headers = { Authorization: `Bearer ${token}` };

  // Loading & saving states
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingHealth, setSavingHealth] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  // Profile section
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");

  // Health section
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [allergies, setAllergies] = useState("");
  const [chronicConditions, setChronicConditions] = useState("");
  const [currentMedications, setCurrentMedications] = useState("");

  // Emergency contact
  const [contactId, setContactId] = useState(null);
  const [contactName, setContactName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");

  // Address
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [country, setCountry] = useState("");

  // Reports
  const [reports, setReports] = useState([]);
  const [reportCategoryFilter, setReportCategoryFilter] = useState("all");
  const [uploadingReport, setUploadingReport] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [reportCategory, setReportCategory] = useState("blood_test");
  const [showUploadForm, setShowUploadForm] = useState(false);

  // ── Load all data on mount ────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const [profileRes, contactsRes, addressRes, reportsRes] = await Promise.allSettled([
          axios.get(backendUrl + "/api/patient/profile", { headers }),
          axios.get(backendUrl + "/api/patient/emergency-contacts", { headers }),
          axios.get(backendUrl + "/api/patient/address", { headers }),
          axios.get(backendUrl + "/api/patient/reports", { headers }),
        ]);

        if (profileRes.status === "fulfilled" && profileRes.value.data.success) {
          const p = profileRes.value.data.data;
          const user = p.user || p;
          const nameParts = (user.name || "").split(" ");
          setFirstName(nameParts[0] || "");
          setLastName(nameParts.slice(1).join(" ") || "");
          setEmail(user.email || "");
          setPhone(user.phone || "");
          setAvatarUrl(user.avatarUrl || user.avatar_url || null);
          setBloodGroup(p.bloodGroup || "");
          setGender(p.gender || "");
          if (p.dateOfBirth) setDateOfBirth(new Date(p.dateOfBirth).toISOString().split("T")[0]);
          setHeight(p.height || "");
          setWeight(p.weight || "");
          setAllergies(p.allergies || "");
          setChronicConditions(p.chronicConditions || "");
          setCurrentMedications(p.currentMedications || "");
        }

        if (contactsRes.status === "fulfilled" && contactsRes.value.data.success) {
          const contacts = contactsRes.value.data.data;
          const first = Array.isArray(contacts) ? contacts[0] : null;
          if (first) {
            setContactId(first.id);
            setContactName(first.contactName || "");
            setRelationship(first.relationship || "");
            setContactPhone(first.contactPhone || "");
            setAlternatePhone(first.alternatePhone || "");
          }
        }

        if (addressRes.status === "fulfilled" && addressRes.value.data.success) {
          const addr = addressRes.value.data.data;
          if (addr) {
            setStreetAddress(addr.streetAddress || "");
            setCity(addr.city || "");
            setState(addr.state || "");
            setPinCode(addr.pinCode || "");
            setCountry(addr.country || "");
          }
        }

        if (reportsRes.status === "fulfilled" && reportsRes.value.data.success) {
          const data = reportsRes.value.data.data;
          setReports(Array.isArray(data) ? data : data?.reports || []);
        }
      } catch {
        toast.error("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, backendUrl]);

  // ── Save handlers ─────────────────────────────────────────────────────────────
  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await axios.patch(backendUrl + "/api/patient/profile", { firstName, lastName, email, phone }, { headers });
      await axios.patch(backendUrl + "/api/patient/profile/health", { bloodGroup, gender, dateOfBirth, height, weight, allergies, chronicConditions, currentMedications }, { headers });
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const saveHealth = async () => {
    setSavingHealth(true);
    try {
      await axios.patch(backendUrl + "/api/patient/profile/health", { height, weight, allergies, chronicConditions, currentMedications }, { headers });
      toast.success("Health info updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save health info");
    } finally {
      setSavingHealth(false);
    }
  };

  const saveContact = async () => {
    setSavingContact(true);
    try {
      if (contactId) {
        await axios.patch(backendUrl + `/api/patient/emergency-contacts/${contactId}`, { contactName, relationship, contactPhone, alternatePhone }, { headers });
      } else {
        const { data } = await axios.post(backendUrl + "/api/patient/emergency-contacts", { contactName, relationship, contactPhone, alternatePhone }, { headers });
        if (data.success) setContactId(data.data?.id);
      }
      toast.success("Emergency contact saved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save contact");
    } finally {
      setSavingContact(false);
    }
  };

  const saveAddress = async () => {
    setSavingAddress(true);
    try {
      await axios.put(backendUrl + "/api/patient/address", { streetAddress, city, state, pinCode, country }, { headers });
      toast.success("Address saved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save address");
    } finally {
      setSavingAddress(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append("avatar", file);
    try {
      const { data } = await axios.patch(backendUrl + "/api/patient/profile/avatar", form, {
        headers: { ...headers, "Content-Type": "multipart/form-data" },
      });
      if (data.success) {
        setAvatarUrl(data.data?.avatarUrl || data.data?.avatar_url || data.data?.user?.avatar_url || null);
        toast.success("Avatar updated");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to upload avatar");
    }
  };

  const handleReportUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !reportTitle.trim()) {
      toast.error("Please enter a report title first");
      return;
    }
    setUploadingReport(true);
    const form = new FormData();
    form.append("report", file);
    form.append("title", reportTitle.trim());
    form.append("category", reportCategory);
    try {
      const { data } = await axios.post(backendUrl + "/api/patient/reports", form, {
        headers: { ...headers, "Content-Type": "multipart/form-data" },
      });
      if (data.success) {
        setReports((prev) => [data.data, ...prev]);
        setReportTitle("");
        setShowUploadForm(false);
        toast.success("Report uploaded");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to upload report");
    } finally {
      setUploadingReport(false);
    }
  };

  const handleDeleteReport = async (id) => {
    try {
      await axios.delete(backendUrl + `/api/patient/reports/${id}`, { headers });
      setReports((prev) => prev.filter((r) => r.id !== id));
      toast.success("Report deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete report");
    }
  };

  const handleDownloadReport = async (id, title) => {
    try {
      const res = await axios.get(backendUrl + `/api/patient/reports/${id}/download`, {
        headers,
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = title || "report";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download report");
    }
  };

  const filteredReports = reportCategoryFilter === "all"
    ? reports
    : reports.filter((r) => r.category === reportCategoryFilter);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";
  const fmtSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const resolvedAvatar = avatarUrl
    ? (avatarUrl.startsWith("http") ? avatarUrl : `${backendUrl}/${String(avatarUrl).replace(/^\/+/, "")}`)
    : null;

  return (
    <div className="ep-page pp-page">
      <div className="ep-container pp-container">
        <PatientSidebar />

        <main className="ep-main-content pp-main-content">
          <Link to="/patient-portal" className="ep-back-link">
            <ArrowLeftIcon style={{ width: 16, height: 16 }} /> Back to Dashboard
          </Link>

          <h1 className="ep-page-title">Edit Profile</h1>

          {loading ? (
            <div className="ep-loading">Loading profile...</div>
          ) : (
            <>
              {/* ── Profile Picture & Personal Info ── */}
              <div className="ep-card pp-panel">
                <h2 className="ep-section-title pp-section-title">Profile Picture</h2>
                <div className="ep-profile-row">
                  <div className="ep-avatar-col">
                    <div className="ep-avatar">
                      {resolvedAvatar
                        ? <img src={resolvedAvatar} alt="avatar" />
                        : <UserIcon style={{ width: 52, height: 52 }} />}
                    </div>
                    <div className="ep-avatar-actions">
                      <input type="file" ref={fileInputRef} style={{ display: "none" }} accept="image/*" onChange={handleAvatarUpload} />
                      <button type="button" className="ep-btn ep-btn-primary ep-btn-sm" onClick={() => fileInputRef.current.click()}>
                        <ArrowUpTrayIcon style={{ width: 14, height: 14 }} /> Upload
                      </button>
                      <button type="button" className="ep-btn ep-btn-danger ep-btn-sm" onClick={() => setAvatarUrl(null)}>
                        <TrashIcon style={{ width: 14, height: 14 }} /> Remove
                      </button>
                    </div>
                  </div>

                  <div className="ep-form-grid">
                    <div className="ep-form-group">
                      <label className="ep-form-label">First Name <span className="ep-required">*</span></label>
                      <input className="ep-form-input" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                    </div>
                    <div className="ep-form-group">
                      <label className="ep-form-label">Last Name <span className="ep-required">*</span></label>
                      <input className="ep-form-input" placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                    </div>
                    <div className="ep-form-group ep-full-width">
                      <label className="ep-form-label">Email <span className="ep-required">*</span></label>
                      <input type="email" className="ep-form-input" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="ep-form-group">
                      <label className="ep-form-label">Phone Number</label>
                      <input type="tel" className="ep-form-input" placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                    <div className="ep-form-group">
                      <label className="ep-form-label">Date of Birth</label>
                      <input type="date" className="ep-form-input" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
                    </div>
                    <div className="ep-form-group">
                      <label className="ep-form-label">Gender</label>
                      <select className="ep-form-select" value={gender} onChange={(e) => setGender(e.target.value)}>
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="ep-form-group">
                      <label className="ep-form-label">Blood Group</label>
                      <select className="ep-form-select" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
                        <option value="">Select Blood Group</option>
                        {BLOOD_GROUPS.map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="ep-action-bar">
                  <button type="button" className="ep-btn ep-btn-primary" onClick={saveProfile} disabled={savingProfile}>
                    <CheckIcon style={{ width: 15, height: 15 }} /> {savingProfile ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </div>

              {/* ── Health Information ── */}
              <div className="ep-card pp-panel">
                <h2 className="ep-section-title pp-section-title">Health Information</h2>
                <div className="ep-form-grid">
                  <div className="ep-form-group">
                    <label className="ep-form-label">Height (cm)</label>
                    <input type="number" className="ep-form-input" placeholder="Height" value={height} onChange={(e) => setHeight(e.target.value)} />
                  </div>
                  <div className="ep-form-group">
                    <label className="ep-form-label">Weight (kg)</label>
                    <input type="number" className="ep-form-input" placeholder="Weight" value={weight} onChange={(e) => setWeight(e.target.value)} />
                  </div>
                  <div className="ep-form-group ep-full-width">
                    <label className="ep-form-label">Allergies</label>
                    <textarea className="ep-form-textarea" placeholder="List any allergies..." value={allergies} onChange={(e) => setAllergies(e.target.value)} />
                  </div>
                  <div className="ep-form-group ep-full-width">
                    <label className="ep-form-label">Chronic Conditions</label>
                    <textarea className="ep-form-textarea" placeholder="List chronic conditions..." value={chronicConditions} onChange={(e) => setChronicConditions(e.target.value)} />
                  </div>
                  <div className="ep-form-group ep-full-width">
                    <label className="ep-form-label">Current Medications</label>
                    <textarea className="ep-form-textarea" placeholder="List current medications and dosages..." value={currentMedications} onChange={(e) => setCurrentMedications(e.target.value)} />
                  </div>
                </div>
                <div className="ep-action-bar">
                  <button type="button" className="ep-btn ep-btn-primary" onClick={saveHealth} disabled={savingHealth}>
                    <CheckIcon style={{ width: 15, height: 15 }} /> {savingHealth ? "Saving..." : "Save Health Info"}
                  </button>
                </div>
              </div>

              {/* ── Medical Reports ── */}
              <div className="ep-card pp-panel">
                <div className="ep-section-header">
                  <h2 className="ep-section-title pp-section-title" style={{ margin: 0 }}>Medical Reports & Documents</h2>
                  <button type="button" className="ep-btn ep-btn-primary ep-btn-sm" onClick={() => setShowUploadForm((s) => !s)}>
                    <PlusIcon style={{ width: 14, height: 14 }} /> Upload Report
                  </button>
                </div>

                {showUploadForm ? (
                  <div className="ep-upload-form">
                    <div className="ep-form-grid" style={{ marginBottom: "1rem" }}>
                      <div className="ep-form-group">
                        <label className="ep-form-label">Report Title <span className="ep-required">*</span></label>
                        <input className="ep-form-input" placeholder="e.g. Complete Blood Count" value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} />
                      </div>
                      <div className="ep-form-group">
                        <label className="ep-form-label">Category</label>
                        <select className="ep-form-select" value={reportCategory} onChange={(e) => setReportCategory(e.target.value)}>
                          {REPORT_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                        </select>
                      </div>
                    </div>
                    <div
                      className="ep-upload-zone"
                      onClick={() => reportInputRef.current.click()}
                    >
                      <input type="file" ref={reportInputRef} style={{ display: "none" }} accept=".pdf,.jpg,.jpeg,.png" onChange={handleReportUpload} disabled={uploadingReport} />
                      <CloudArrowUpIcon style={{ width: 36, height: 36, color: "var(--ep-text-muted)", marginBottom: "0.5rem" }} />
                      <div className="ep-upload-text">{uploadingReport ? "Uploading..." : "Click or drag & drop to upload"}</div>
                      <div className="ep-upload-hint">PDF, JPG, PNG · Max 10 MB</div>
                    </div>
                    <button type="button" className="ep-btn ep-btn-secondary ep-btn-sm" style={{ marginTop: "0.5rem" }} onClick={() => setShowUploadForm(false)}>
                      <XMarkIcon style={{ width: 14, height: 14 }} /> Cancel
                    </button>
                  </div>
                ) : (
                  <div className="ep-upload-zone ep-upload-zone-quiet" onClick={() => setShowUploadForm(true)}>
                    <CloudArrowUpIcon style={{ width: 36, height: 36, color: "var(--ep-text-muted)", marginBottom: "0.5rem" }} />
                    <div className="ep-upload-text">Drag & drop files here or click to browse</div>
                    <div className="ep-upload-hint">PDF, JPG, PNG · Max 10 MB</div>
                  </div>
                )}

                <div className="ep-category-pills">
                  <button type="button" className={`ep-category-pill ${reportCategoryFilter === "all" ? "ep-category-pill-active" : ""}`} onClick={() => setReportCategoryFilter("all")}>All</button>
                  {REPORT_CATEGORIES.map((c) => (
                    <button key={c} type="button" className={`ep-category-pill ${reportCategoryFilter === c ? "ep-category-pill-active" : ""}`} onClick={() => setReportCategoryFilter(c)}>
                      {CATEGORY_LABELS[c]}
                    </button>
                  ))}
                </div>

                <div className="ep-reports-label">Existing Reports</div>

                {filteredReports.length === 0 ? (
                  <div className="ep-empty">No reports found.</div>
                ) : (
                  <div className="ep-report-list">
                    {filteredReports.map((r) => (
                      <div key={r.id} className="ep-report-item">
                        <div className="ep-report-icon">{reportIcon(r.category)}</div>
                        <div className="ep-report-info">
                          <div className="ep-report-name">{r.title}</div>
                          <div className="ep-report-meta">
                            <span className="ep-report-type">{CATEGORY_LABELS[r.category] || r.category}</span>
                            <span>·</span>
                            <span>{fmtDate(r.createdAt || r.reportDate)}</span>
                            {r.fileSize && <><span>·</span><span>{fmtSize(r.fileSize)}</span></>}
                          </div>
                        </div>
                        <div className="ep-report-actions">
                          <button type="button" className="ep-btn ep-btn-secondary ep-btn-sm">
                            <EyeIcon style={{ width: 13, height: 13 }} /> View
                          </button>
                          <button type="button" className="ep-btn ep-btn-secondary ep-btn-sm" onClick={() => handleDownloadReport(r.id, r.title)}>
                            <ArrowDownTrayIcon style={{ width: 13, height: 13 }} /> Download
                          </button>
                          <button type="button" className="ep-btn ep-btn-danger ep-btn-sm" onClick={() => handleDeleteReport(r.id)}>
                            <TrashIcon style={{ width: 13, height: 13 }} /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Emergency Contact ── */}
              <div className="ep-card pp-panel">
                <h2 className="ep-section-title pp-section-title">Emergency Contact</h2>
                <div className="ep-form-grid">
                  <div className="ep-form-group">
                    <label className="ep-form-label">Contact Name <span className="ep-required">*</span></label>
                    <input className="ep-form-input" placeholder="Contact name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
                  </div>
                  <div className="ep-form-group">
                    <label className="ep-form-label">Relationship</label>
                    <input className="ep-form-input" placeholder="e.g. Spouse, Parent" value={relationship} onChange={(e) => setRelationship(e.target.value)} />
                  </div>
                  <div className="ep-form-group">
                    <label className="ep-form-label">Contact Phone <span className="ep-required">*</span></label>
                    <input type="tel" className="ep-form-input" placeholder="Phone number" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                  </div>
                  <div className="ep-form-group">
                    <label className="ep-form-label">Alternate Phone</label>
                    <input type="tel" className="ep-form-input" placeholder="Alternate number" value={alternatePhone} onChange={(e) => setAlternatePhone(e.target.value)} />
                  </div>
                </div>
                <div className="ep-action-bar">
                  <button type="button" className="ep-btn ep-btn-primary" onClick={saveContact} disabled={savingContact}>
                    <CheckIcon style={{ width: 15, height: 15 }} /> {savingContact ? "Saving..." : "Save Contact"}
                  </button>
                </div>
              </div>

              {/* ── Address ── */}
              <div className="ep-card pp-panel">
                <h2 className="ep-section-title pp-section-title">Address Information</h2>
                <div className="ep-form-grid">
                  <div className="ep-form-group ep-full-width">
                    <label className="ep-form-label">Street Address</label>
                    <input className="ep-form-input" placeholder="Street address" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} />
                  </div>
                  <div className="ep-form-group">
                    <label className="ep-form-label">City</label>
                    <input className="ep-form-input" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div className="ep-form-group">
                    <label className="ep-form-label">State</label>
                    <input className="ep-form-input" placeholder="State" value={state} onChange={(e) => setState(e.target.value)} />
                  </div>
                  <div className="ep-form-group">
                    <label className="ep-form-label">Pin Code</label>
                    <input className="ep-form-input" placeholder="Pin code" value={pinCode} onChange={(e) => setPinCode(e.target.value)} />
                  </div>
                  <div className="ep-form-group">
                    <label className="ep-form-label">Country</label>
                    <input className="ep-form-input" placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} />
                  </div>
                </div>
                <div className="ep-action-bar">
                  <button type="button" className="ep-btn ep-btn-primary" onClick={saveAddress} disabled={savingAddress}>
                    <CheckIcon style={{ width: 15, height: 15 }} /> {savingAddress ? "Saving..." : "Save Address"}
                  </button>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default EditProfile;
