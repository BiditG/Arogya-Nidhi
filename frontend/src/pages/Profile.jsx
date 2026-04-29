import { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import QRCode from "react-qr-code";
import { toast } from "react-toastify";
import { AppContext } from "../context/AppContext";
import { assets } from "../assets/assets_frontend/assets";
import "./Profile.css";

const GENDER_OPTIONS = [
  { label: "Select", value: "" },
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
  { label: "Prefer not to say", value: "prefer_not_to_say" },
];

const Profile = () => {
  const { backendUrl, token, loadUserProfileData } = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const [isEdit, setIsEdit] = useState(false);
  const [image, setImage] = useState(null);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    gender: "",
    dob: "",
    streetAddress: "",
    city: "",
    state: "",
    pinCode: "",
    country: "",
  });

  const normalizeGender = (value) => {
    if (!value) return "";
    const v = String(value).toLowerCase();
    if (["male", "female", "other", "prefer_not_to_say"].includes(v)) return v;
    if (v === "others") return "other";
    return "";
  };

  const formatDateInput = (value) => {
    if (!value) return "";
    try {
      return new Date(value).toISOString().slice(0, 10);
    } catch {
      return "";
    }
  };

  const loadProfile = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const profileRes = await axios.get(backendUrl + "/api/profile", { headers });

      if (profileRes.data?.success) {
        const payload = profileRes.data.data?.profile || {};
        const user = payload.user || {};
        const addr = payload.address || {};
        setProfile(payload);
        setForm((prev) => ({
          ...prev,
          name: user.name || "",
          phone: user.phone || "",
          gender: normalizeGender(payload.gender || ""),
          dob: formatDateInput(payload.dateOfBirth),
          streetAddress: addr.streetAddress || "",
          city: addr.city || "",
          state: addr.state || "",
          pinCode: addr.pinCode || "",
          country: addr.country || "",
        }));
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
  }, [token, backendUrl]);

  const getAvatar = () => {
    const avatarUrl = profile?.user?.avatarUrl || profile?.user?.avatar_url || profile?.user?.avatarUrl;
    if (!avatarUrl) return assets.profile_pic;
    if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) return avatarUrl;
    return `${backendUrl}/${avatarUrl}`;
  };

  const handleSave = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      await axios.patch(
        backendUrl + "/api/profile",
        {
          name: form.name,
          phone: form.phone,
          gender: form.gender || null,
          dateOfBirth: form.dob || null,
          streetAddress: form.streetAddress || null,
          city: form.city || null,
          state: form.state || null,
          pinCode: form.pinCode || null,
          country: form.country || null,
        },
        { headers }
      );

      if (image) {
        const avatarData = new FormData();
        avatarData.append("avatar", image);
        await axios.patch(backendUrl + "/api/profile/avatar", avatarData, {
          headers,
        });
      }

      toast.success("Profile updated successfully");
      await loadProfile();
      await loadUserProfileData();
      setIsEdit(false);
      setImage(null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile");
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

  return (
    <div className="profile-shell">
      <div className="profile-header">
        <div>
          <h1 className="profile-title">Profile Command Center</h1>
          <p className="profile-subtitle">Curate your identity and keep your care network in sync.</p>
        </div>
        {barcode && <span className="profile-chip">Barcode Active</span>}
      </div>

      <div className="profile-grid">
        <div className="profile-card">
          <div className="profile-identity">
            <div className="profile-avatar">
              <img src={image ? URL.createObjectURL(image) : getAvatar()} alt="profile avatar" />
            </div>
            <div>
              {isEdit ? (
                <input
                  className="profile-input"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              ) : (
                <h2 className="profile-name">{form.name || "Your Name"}</h2>
              )}
              <div className="profile-meta">
                <span>{profile?.user?.email || "email not set"}</span>
                <span>{profile?.user?.role || "patient"}</span>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <p className="profile-section-title">Contact & Address</p>
            <div className="profile-form">
              <div className="profile-field">
                <label className="profile-label">Phone</label>
                <input
                  className="profile-input"
                  disabled={!isEdit}
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="profile-field">
                <label className="profile-label">Street Address</label>
                <input
                  className="profile-input"
                  disabled={!isEdit}
                  value={form.streetAddress}
                  onChange={(e) => setForm((prev) => ({ ...prev, streetAddress: e.target.value }))}
                />
              </div>
              <div className="profile-field">
                <label className="profile-label">City</label>
                <input
                  className="profile-input"
                  disabled={!isEdit}
                  value={form.city}
                  onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                />
              </div>
              <div className="profile-field">
                <label className="profile-label">State</label>
                <input
                  className="profile-input"
                  disabled={!isEdit}
                  value={form.state}
                  onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
                />
              </div>
              <div className="profile-field">
                <label className="profile-label">Pin Code</label>
                <input
                  className="profile-input"
                  disabled={!isEdit}
                  value={form.pinCode}
                  onChange={(e) => setForm((prev) => ({ ...prev, pinCode: e.target.value }))}
                />
              </div>
              <div className="profile-field">
                <label className="profile-label">Country</label>
                <input
                  className="profile-input"
                  disabled={!isEdit}
                  value={form.country}
                  onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="profile-section">
            <p className="profile-section-title">Personal Details</p>
            <div className="profile-form">
              <div className="profile-field">
                <label className="profile-label">Gender</label>
                <select
                  className="profile-select"
                  disabled={!isEdit}
                  value={form.gender}
                  onChange={(e) => setForm((prev) => ({ ...prev, gender: e.target.value }))}
                >
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="profile-field">
                <label className="profile-label">Birthday</label>
                <input
                  type="date"
                  className="profile-input"
                  disabled={!isEdit}
                  value={form.dob}
                  onChange={(e) => setForm((prev) => ({ ...prev, dob: e.target.value }))}
                />
              </div>
              <div className="profile-field">
                <label className="profile-label">Avatar</label>
                <input
                  type="file"
                  disabled={!isEdit}
                  onChange={(e) => setImage(e.target.files?.[0] || null)}
                />
              </div>
            </div>
          </div>

          <div className="profile-actions">
            {isEdit ? (
              <>
                <button className="profile-btn profile-btn-primary" onClick={handleSave}>
                  Save Changes
                </button>
                <button
                  className="profile-btn profile-btn-secondary"
                  onClick={() => {
                    setIsEdit(false);
                    setImage(null);
                    loadProfile();
                  }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button className="profile-btn profile-btn-primary" onClick={() => setIsEdit(true)}>
                Edit Profile
              </button>
            )}
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
