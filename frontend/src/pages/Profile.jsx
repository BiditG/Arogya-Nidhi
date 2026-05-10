import { useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import QRCode from "react-qr-code";
import { toast } from "react-toastify";
import { AppContext } from "../context/AppContext";
import { assets } from "../assets/assets_frontend/assets";
import { supabase } from "../lib/supabaseClient";
import "./Profile.css";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const GENDER_OPTIONS = ["female", "male", "other"];

const formatDateTime = (value) => {
  if (!value) return "--";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "--";
  }
};

const toDateInputValue = (value) => {
  if (!value) return "";
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return "";
  }
};

const getAddressValue = (source, key) => {
  if (!source) return "";
  const map = {
    streetAddress: ["streetAddress", "street_address", "street"],
    city: ["city"],
    state: ["state"],
    pinCode: ["pinCode", "pin_code", "zipcode", "zip_code"],
    country: ["country"],
  };
  const keys = map[key] || [key];
  for (const candidate of keys) {
    if (source[candidate]) return source[candidate];
  }
  return "";
};

const Profile = () => {
  const { backendUrl, token, loadUserProfileData, userData } = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [patientProfile, setPatientProfile] = useState(null);
  const [patientAddress, setPatientAddress] = useState(null);
  const [emergencyContact, setEmergencyContact] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isEditingBasic, setIsEditingBasic] = useState(false);
  const [isEditingHealth, setIsEditingHealth] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);

  const [savingBasic, setSavingBasic] = useState(false);
  const [savingHealth, setSavingHealth] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [savingContact, setSavingContact] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");

  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [allergies, setAllergies] = useState("");
  const [chronicConditions, setChronicConditions] = useState("");
  const [currentMedications, setCurrentMedications] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");

  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [country, setCountry] = useState("");

  const [contactId, setContactId] = useState(null);
  const [contactName, setContactName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");

  const role = String(userData?.role || userData?.user?.role || profile?.user?.role || "").toLowerCase();
  const isPatient = role === "patient";

  const hydrateForm = (profilePayload, patientPayload, addressPayload, contactPayload) => {
    const user = patientPayload?.user || profilePayload?.user || {};
    const nameParts = (user.name || "").split(" ");
    setFirstName(nameParts[0] || "");
    setLastName(nameParts.slice(1).join(" ") || "");
    setEmail(user.email || "");
    setPhone(user.phone || "");

    setGender(profilePayload?.gender || patientPayload?.gender || "");
    setDateOfBirth(toDateInputValue(profilePayload?.dateOfBirth || patientPayload?.dateOfBirth));
    setBloodGroup(patientPayload?.bloodGroup || patientPayload?.blood_group || "");

    setHeight(patientPayload?.height || "");
    setWeight(patientPayload?.weight || "");
    setAllergies(patientPayload?.allergies || "");
    setChronicConditions(patientPayload?.chronicConditions || "");
    setCurrentMedications(patientPayload?.currentMedications || "");
    setMedicalHistory(patientPayload?.medicalHistory || patientPayload?.medical_history || "");

    const resolvedAddress = addressPayload || profilePayload?.address || {};
    setStreetAddress(getAddressValue(resolvedAddress, "streetAddress"));
    setCity(getAddressValue(resolvedAddress, "city"));
    setState(getAddressValue(resolvedAddress, "state"));
    setPinCode(getAddressValue(resolvedAddress, "pinCode"));
    setCountry(getAddressValue(resolvedAddress, "country"));

    setContactId(contactPayload?.id || null);
    setContactName(contactPayload?.contactName || "");
    setRelationship(contactPayload?.relationship || "");
    setContactPhone(contactPayload?.contactPhone || "");
    setAlternatePhone(contactPayload?.alternatePhone || "");
  };

  const loadProfile = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const profileRes = await axios.get(backendUrl + "/api/profile", { headers });

      if (profileRes.data?.success) {
        const payload = profileRes.data.data?.profile || {};
        setProfile(payload);

        const resolvedRole = String(
          userData?.role || userData?.user?.role || payload?.user?.role || ""
        ).toLowerCase();

        let patientPayload = null;
        let addressPayload = null;
        let contactPayload = null;

        if (resolvedRole === "patient") {
          const [patientRes, addressRes, contactRes] = await Promise.allSettled([
            axios.get(backendUrl + "/api/patient/profile", { headers }),
            axios.get(backendUrl + "/api/patient/address", { headers }),
            axios.get(backendUrl + "/api/patient/emergency-contacts", { headers }),
          ]);

          if (patientRes.status === "fulfilled" && patientRes.value.data?.success) {
            patientPayload = patientRes.value.data.data || null;
            setPatientProfile(patientPayload);
          }

          if (addressRes.status === "fulfilled" && addressRes.value.data?.success) {
            addressPayload = addressRes.value.data.data || null;
            setPatientAddress(addressPayload);
          }

          if (contactRes.status === "fulfilled" && contactRes.value.data?.success) {
            const contacts = contactRes.value.data.data || [];
            contactPayload = Array.isArray(contacts) ? contacts[0] : contacts;
            setEmergencyContact(contactPayload || null);
          }
        }

        hydrateForm(payload, patientPayload, addressPayload, contactPayload);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setProfile(null);
      return;
    }
    loadProfile();
  }, [token, backendUrl, userData]);

  const getAvatar = () => {
    const avatarUrl = profile?.user?.avatar_url || profile?.user?.avatarUrl;
    if (!avatarUrl) return assets.profile_pic;
    if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) return avatarUrl;
    return `${backendUrl}/${avatarUrl}`;
  };

  const handleSaveBasic = async () => {
    if (savingBasic) return;
    setSavingBasic(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (isPatient) {
        await axios.patch(
          backendUrl + "/api/patient/profile",
          { firstName: firstName || null, lastName: lastName || null, email: email || null, phone: phone || null },
          { headers }
        );
      } else {
        await axios.patch(
          backendUrl + "/api/profile",
          { phone: phone || null },
          { headers }
        );
      }

      toast.success("Profile updated successfully");
      await loadProfile();
      await loadUserProfileData();
      setIsEditingBasic(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update phone");
    } finally {
      setSavingBasic(false);
    }
  };

  const handleSaveHealth = async () => {
    if (!isPatient || savingHealth) return;
    setSavingHealth(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.patch(
        backendUrl + "/api/patient/profile/health",
        {
          bloodGroup: bloodGroup || null,
          gender: gender || null,
          dateOfBirth: dateOfBirth || null,
          height: height || null,
          weight: weight || null,
          allergies: allergies || null,
          chronicConditions: chronicConditions || null,
          currentMedications: currentMedications || null,
          medicalHistory: medicalHistory || null,
        },
        { headers }
      );
      toast.success("Health details saved");
      await loadProfile();
      setIsEditingHealth(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update health info");
    } finally {
      setSavingHealth(false);
    }
  };

  const handleSaveAddress = async () => {
    if (!isPatient || savingAddress) return;
    setSavingAddress(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(
        backendUrl + "/api/patient/address",
        { streetAddress, city, state, pinCode, country },
        { headers }
      );
      toast.success("Address saved");
      await loadProfile();
      setIsEditingAddress(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update address");
    } finally {
      setSavingAddress(false);
    }
  };

  const handleSaveContact = async () => {
    if (!isPatient || savingContact) return;
    setSavingContact(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (contactId) {
        await axios.patch(
          backendUrl + `/api/patient/emergency-contacts/${contactId}`,
          { contactName, relationship, contactPhone, alternatePhone },
          { headers }
        );
      } else {
        const { data } = await axios.post(
          backendUrl + "/api/patient/emergency-contacts",
          { contactName, relationship, contactPhone, alternatePhone },
          { headers }
        );
        if (data?.success) setContactId(data.data?.id || null);
      }
      toast.success("Emergency contact saved");
      await loadProfile();
      setIsEditingContact(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save contact");
    } finally {
      setSavingContact(false);
    }
  };

  const handleAvatarUpload = async () => {
    if (!image) return;
    setUploadingAvatar(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const avatarData = new FormData();
      avatarData.append("avatar", image);
      if (isPatient) {
        await axios.patch(backendUrl + "/api/patient/profile/avatar", avatarData, { headers });
      } else {
        await axios.patch(backendUrl + "/api/profile/avatar", avatarData, { headers });
      }
      toast.success("Profile photo updated");
      setImage(null);
      setImagePreview("");
      await loadProfile();
      await loadUserProfileData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const sendPasswordReset = async () => {
    if (!supabase) {
      toast.error("Supabase is not configured on the frontend");
      return;
    }
    const emailAddress = profile?.user?.email;
    if (!emailAddress) {
      toast.error("Email not available");
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailAddress, {
        redirectTo: `${window.location.origin}/profile`,
      });
      if (error) throw error;
      toast.success("Password reset email sent");
    } catch (err) {
      toast.error(err.message || "Failed to send reset email");
    } finally {
      setResetLoading(false);
    }
  };

  const changePassword = async () => {
    if (!supabase) {
      toast.error("Supabase is not configured on the frontend");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setChangingPassword(false);
    }
  };

  const barcode = profile?.user?.barcode || profile?.barcode || "";
  const publicLink = useMemo(() => {
    if (!barcode) return "";
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/public-profile/${barcode}`;
  }, [barcode]);

  const copyToClipboard = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  };

  if (loading) {
    return (
      <div className="profile-shell">
        <div className="profile-card">
          <p className="profile-empty">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-shell">
        <div className="profile-card">
          <p className="profile-empty">Profile not available.</p>
        </div>
      </div>
    );
  }

  const user = profile.user || {};
  const statusText = user.is_active ? "Active" : "Inactive";

  return (
    <div className="profile-shell">
      <div className="profile-header">
        <div>
          <p className="profile-subtitle">Manage your identity, photo, and security settings.</p>
        </div>
        <div className="profile-header-actions">
          {role && <span className="profile-chip">{role}</span>}
          {barcode && <span className="profile-chip">Barcode Active</span>}
        </div>
      </div>

      <div className="profile-grid">
        <div className="profile-card profile-main-card">
          <div className="profile-identity">
            <div className="profile-avatar profile-avatar-editable">
              <img
                src={imagePreview || (image ? URL.createObjectURL(image) : getAvatar())}
                alt="profile avatar"
              />
              <button
                type="button"
                className="profile-avatar-action"
                onClick={() => fileInputRef.current?.click()}
              >
                Change
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="profile-file-input"
                onChange={(e) => {
                  const nextFile = e.target.files?.[0] || null;
                  setImage(nextFile);
                  setImagePreview(nextFile ? URL.createObjectURL(nextFile) : "");
                }}
              />
            </div>
            <div className="profile-identity-info">
              <h2 className="profile-name">{user.name || "Your Name"}</h2>
              <div className="profile-meta">
                <span>{user.email || "email not set"}</span>
                <span>{user.role || "patient"}</span>
              </div>
              <div className="profile-tags">
                <span>{statusText}</span>
                <span>{user.phone || "No phone"}</span>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <div className="profile-section-head">
              <div>
                <p className="profile-section-title">Profile Photo</p>
                <p className="profile-section-caption">Upload a clear headshot to personalize your profile.</p>
              </div>
              <div className="profile-section-actions">
                <button
                  className="profile-btn profile-btn-primary"
                  type="button"
                  onClick={handleAvatarUpload}
                  disabled={!image || uploadingAvatar}
                >
                  {uploadingAvatar ? "Uploading..." : "Save photo"}
                </button>
              </div>
            </div>
            <div className="profile-upload">
              <button
                type="button"
                className="profile-upload-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                Select image
              </button>
              <p className="profile-upload-hint">JPG or PNG. Recommended 512 x 512px.</p>
              {image && (
                <div className="profile-upload-actions">
                  <span>{image.name}</span>
                  <button
                    type="button"
                    className="profile-btn profile-btn-secondary"
                    onClick={() => {
                      setImage(null);
                      setImagePreview("");
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="profile-section">
            <div className="profile-section-head">
              <div>
                <p className="profile-section-title">Basic details</p>
                <p className="profile-section-caption">Keep your contact and identity details up to date.</p>
              </div>
              <div className="profile-section-actions">
                {isEditingBasic ? (
                  <div className="profile-inline-actions">
                    <button
                      className="profile-btn profile-btn-primary"
                      onClick={handleSaveBasic}
                      type="button"
                      disabled={savingBasic}
                    >
                      {savingBasic ? "Saving..." : "Save"}
                    </button>
                    <button
                      className="profile-btn profile-btn-secondary"
                      type="button"
                      onClick={() => {
                        hydrateForm(profile, patientProfile, patientAddress, emergencyContact);
                        setIsEditingBasic(false);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    className="profile-btn profile-btn-secondary"
                    onClick={() => setIsEditingBasic(true)}
                    type="button"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
            <div className="profile-form profile-two-col">
              <div className="profile-field">
                <label className="profile-label">First name</label>
                {isEditingBasic && isPatient ? (
                  <input
                    className="profile-input"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                ) : (
                  <div className="profile-static">{firstName || "--"}</div>
                )}
              </div>
              <div className="profile-field">
                <label className="profile-label">Last name</label>
                {isEditingBasic && isPatient ? (
                  <input
                    className="profile-input"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                ) : (
                  <div className="profile-static">{lastName || "--"}</div>
                )}
              </div>
              <div className="profile-field">
                <label className="profile-label">Email</label>
                {isEditingBasic && isPatient ? (
                  <input
                    className="profile-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                ) : (
                  <div className="profile-static">{email || "--"}</div>
                )}
              </div>
              <div className="profile-field">
                <label className="profile-label">Phone</label>
                {isEditingBasic ? (
                  <input
                    className="profile-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                ) : (
                  <div className="profile-static">{phone || "--"}</div>
                )}
              </div>
            </div>
          </div>

          {isPatient && (
            <div className="profile-section">
              <div className="profile-section-head">
                <div>
                  <p className="profile-section-title">Health profile</p>
                  <p className="profile-section-caption">Keep medical context ready for consultations.</p>
                </div>
                <div className="profile-section-actions">
                  {isEditingHealth ? (
                    <div className="profile-inline-actions">
                      <button
                        className="profile-btn profile-btn-primary"
                        onClick={handleSaveHealth}
                        type="button"
                        disabled={savingHealth}
                      >
                        {savingHealth ? "Saving..." : "Save"}
                      </button>
                      <button
                        className="profile-btn profile-btn-secondary"
                        type="button"
                        onClick={() => {
                          hydrateForm(profile, patientProfile, patientAddress, emergencyContact);
                          setIsEditingHealth(false);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className="profile-btn profile-btn-secondary"
                      onClick={() => setIsEditingHealth(true)}
                      type="button"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
              <div className="profile-form profile-two-col">
                <div className="profile-field">
                  <label className="profile-label">Blood group</label>
                  {isEditingHealth ? (
                    <select
                      className="profile-select"
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                    >
                      <option value="">Select</option>
                      {BLOOD_GROUPS.map((group) => (
                        <option key={group} value={group}>
                          {group}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="profile-static">{bloodGroup || "--"}</div>
                  )}
                </div>
                <div className="profile-field">
                  <label className="profile-label">Gender</label>
                  {isEditingHealth ? (
                    <select
                      className="profile-select"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                    >
                      <option value="">Select</option>
                      {GENDER_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="profile-static">{gender || "--"}</div>
                  )}
                </div>
                <div className="profile-field">
                  <label className="profile-label">Date of birth</label>
                  {isEditingHealth ? (
                    <input
                      className="profile-input"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                    />
                  ) : (
                    <div className="profile-static">{dateOfBirth || "--"}</div>
                  )}
                </div>
                <div className="profile-field">
                  <label className="profile-label">Height (cm)</label>
                  {isEditingHealth ? (
                    <input
                      className="profile-input"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                    />
                  ) : (
                    <div className="profile-static">{height || "--"}</div>
                  )}
                </div>
                <div className="profile-field">
                  <label className="profile-label">Weight (kg)</label>
                  {isEditingHealth ? (
                    <input
                      className="profile-input"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                    />
                  ) : (
                    <div className="profile-static">{weight || "--"}</div>
                  )}
                </div>
                <div className="profile-field profile-field-wide">
                  <label className="profile-label">Allergies</label>
                  {isEditingHealth ? (
                    <textarea
                      className="profile-textarea"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                    />
                  ) : (
                    <div className="profile-static">{allergies || "--"}</div>
                  )}
                </div>
                <div className="profile-field profile-field-wide">
                  <label className="profile-label">Chronic conditions</label>
                  {isEditingHealth ? (
                    <textarea
                      className="profile-textarea"
                      value={chronicConditions}
                      onChange={(e) => setChronicConditions(e.target.value)}
                    />
                  ) : (
                    <div className="profile-static">{chronicConditions || "--"}</div>
                  )}
                </div>
                <div className="profile-field profile-field-wide">
                  <label className="profile-label">Current medications</label>
                  {isEditingHealth ? (
                    <textarea
                      className="profile-textarea"
                      value={currentMedications}
                      onChange={(e) => setCurrentMedications(e.target.value)}
                    />
                  ) : (
                    <div className="profile-static">{currentMedications || "--"}</div>
                  )}
                </div>
                <div className="profile-field profile-field-wide">
                  <label className="profile-label">Medical history</label>
                  {isEditingHealth ? (
                    <textarea
                      className="profile-textarea"
                      value={medicalHistory}
                      onChange={(e) => setMedicalHistory(e.target.value)}
                    />
                  ) : (
                    <div className="profile-static">{medicalHistory || "--"}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {isPatient && (
            <div className="profile-section">
              <div className="profile-section-head">
                <div>
                  <p className="profile-section-title">Address</p>
                  <p className="profile-section-caption">Where should we reach you offline?</p>
                </div>
                <div className="profile-section-actions">
                  {isEditingAddress ? (
                    <div className="profile-inline-actions">
                      <button
                        className="profile-btn profile-btn-primary"
                        onClick={handleSaveAddress}
                        type="button"
                        disabled={savingAddress}
                      >
                        {savingAddress ? "Saving..." : "Save"}
                      </button>
                      <button
                        className="profile-btn profile-btn-secondary"
                        type="button"
                        onClick={() => {
                          hydrateForm(profile, patientProfile, patientAddress, emergencyContact);
                          setIsEditingAddress(false);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className="profile-btn profile-btn-secondary"
                      onClick={() => setIsEditingAddress(true)}
                      type="button"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
              <div className="profile-form profile-two-col">
                <div className="profile-field profile-field-wide">
                  <label className="profile-label">Street address</label>
                  {isEditingAddress ? (
                    <input
                      className="profile-input"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                    />
                  ) : (
                    <div className="profile-static">{streetAddress || "--"}</div>
                  )}
                </div>
                <div className="profile-field">
                  <label className="profile-label">City</label>
                  {isEditingAddress ? (
                    <input
                      className="profile-input"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  ) : (
                    <div className="profile-static">{city || "--"}</div>
                  )}
                </div>
                <div className="profile-field">
                  <label className="profile-label">State</label>
                  {isEditingAddress ? (
                    <input
                      className="profile-input"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                    />
                  ) : (
                    <div className="profile-static">{state || "--"}</div>
                  )}
                </div>
                <div className="profile-field">
                  <label className="profile-label">Pin code</label>
                  {isEditingAddress ? (
                    <input
                      className="profile-input"
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value)}
                    />
                  ) : (
                    <div className="profile-static">{pinCode || "--"}</div>
                  )}
                </div>
                <div className="profile-field">
                  <label className="profile-label">Country</label>
                  {isEditingAddress ? (
                    <input
                      className="profile-input"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    />
                  ) : (
                    <div className="profile-static">{country || "--"}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {isPatient && (
            <div className="profile-section">
              <div className="profile-section-head">
                <div>
                  <p className="profile-section-title">Emergency contact</p>
                  <p className="profile-section-caption">Someone we can reach if needed.</p>
                </div>
                <div className="profile-section-actions">
                  {isEditingContact ? (
                    <div className="profile-inline-actions">
                      <button
                        className="profile-btn profile-btn-primary"
                        onClick={handleSaveContact}
                        type="button"
                        disabled={savingContact}
                      >
                        {savingContact ? "Saving..." : "Save"}
                      </button>
                      <button
                        className="profile-btn profile-btn-secondary"
                        type="button"
                        onClick={() => {
                          hydrateForm(profile, patientProfile, patientAddress, emergencyContact);
                          setIsEditingContact(false);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className="profile-btn profile-btn-secondary"
                      onClick={() => setIsEditingContact(true)}
                      type="button"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
              <div className="profile-form profile-two-col">
                <div className="profile-field">
                  <label className="profile-label">Contact name</label>
                  {isEditingContact ? (
                    <input
                      className="profile-input"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                    />
                  ) : (
                    <div className="profile-static">{contactName || "--"}</div>
                  )}
                </div>
                <div className="profile-field">
                  <label className="profile-label">Relationship</label>
                  {isEditingContact ? (
                    <input
                      className="profile-input"
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                    />
                  ) : (
                    <div className="profile-static">{relationship || "--"}</div>
                  )}
                </div>
                <div className="profile-field">
                  <label className="profile-label">Phone</label>
                  {isEditingContact ? (
                    <input
                      className="profile-input"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                    />
                  ) : (
                    <div className="profile-static">{contactPhone || "--"}</div>
                  )}
                </div>
                <div className="profile-field">
                  <label className="profile-label">Alternate phone</label>
                  {isEditingContact ? (
                    <input
                      className="profile-input"
                      value={alternatePhone}
                      onChange={(e) => setAlternatePhone(e.target.value)}
                    />
                  ) : (
                    <div className="profile-static">{alternatePhone || "--"}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="profile-section">
            <p className="profile-section-title">Account details</p>
            <div className="profile-form profile-static-grid">
              <div className="profile-field">
                <label className="profile-label">User ID</label>
                <div className="profile-static">{user.id || "--"}</div>
              </div>
              <div className="profile-field">
                <label className="profile-label">Status</label>
                <div className="profile-static">{statusText}</div>
              </div>
              <div className="profile-field">
                <label className="profile-label">Created</label>
                <div className="profile-static">{formatDateTime(user.created_at)}</div>
              </div>
              <div className="profile-field">
                <label className="profile-label">Updated</label>
                <div className="profile-static">{formatDateTime(user.updated_at)}</div>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <p className="profile-section-title">Security</p>
            <div className="profile-form">
              <div className="profile-field">
                <label className="profile-label">Forgot password</label>
                <button
                  className="profile-btn profile-btn-secondary"
                  type="button"
                  onClick={sendPasswordReset}
                  disabled={resetLoading}
                >
                  {resetLoading ? "Sending..." : "Send reset email"}
                </button>
              </div>
              <div className="profile-field">
                <label className="profile-label">New password</label>
                <input
                  className="profile-input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="profile-field">
                <label className="profile-label">Confirm password</label>
                <input
                  className="profile-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <div className="profile-field profile-inline-actions">
                <button
                  className="profile-btn profile-btn-primary"
                  type="button"
                  onClick={changePassword}
                  disabled={changingPassword}
                >
                  {changingPassword ? "Updating..." : "Change password"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-card profile-qr-card">
          <div>
            <p className="profile-section-title">Profile Barcode</p>
            <p className="profile-subtitle">Scan to open your public profile instantly.</p>
          </div>
          <div className="profile-qr-code">
            {publicLink ? <QRCode value={publicLink} size={160} /> : "No barcode yet"}
          </div>
          <div>
            <div className="profile-code">{barcode || "--"}</div>
            {publicLink && <div className="profile-link">{publicLink}</div>}
          </div>
          <div className="profile-copy">
            {barcode && (
              <button type="button" onClick={() => copyToClipboard(barcode, "Barcode")}>Copy Code</button>
            )}
            {publicLink && (
              <button type="button" onClick={() => copyToClipboard(publicLink, "Link")}>Copy Link</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
