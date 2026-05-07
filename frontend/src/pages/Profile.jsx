import { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import QRCode from "react-qr-code";
import { toast } from "react-toastify";
import { AppContext } from "../context/AppContext";
import { assets } from "../assets/assets_frontend/assets";
import { supabase } from "../lib/supabaseClient";
import "./Profile.css";

const formatDateTime = (value) => {
  if (!value) return "--";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "--";
  }
};

const Profile = () => {
  const { backendUrl, token, loadUserProfileData } = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const [isEdit, setIsEdit] = useState(false);
  const [image, setImage] = useState(null);
  const [profile, setProfile] = useState(null);
  const [phone, setPhone] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const loadProfile = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const profileRes = await axios.get(backendUrl + "/api/profile", { headers });

      if (profileRes.data?.success) {
        const payload = profileRes.data.data?.profile || {};
        const user = payload.user || {};
        setProfile(payload);
        setPhone(user.phone || "");
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
    const avatarUrl = profile?.user?.avatar_url || profile?.user?.avatarUrl;
    if (!avatarUrl) return assets.profile_pic;
    if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) return avatarUrl;
    return `${backendUrl}/${avatarUrl}`;
  };

  const handleSave = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.patch(
        backendUrl + "/api/profile",
        { phone: phone || null },
        { headers }
      );

      toast.success("Phone updated successfully");
      await loadProfile();
      await loadUserProfileData();
      setIsEdit(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update phone");
    }
  };

  const handleAvatarUpload = async () => {
    if (!image) return;
    setUploadingAvatar(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const avatarData = new FormData();
      avatarData.append("avatar", image);
      await axios.patch(backendUrl + "/api/profile/avatar", avatarData, { headers });
      toast.success("Profile photo updated");
      setImage(null);
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
    const email = profile?.user?.email;
    if (!email) {
      toast.error("Email not available");
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
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
          <h1 className="profile-title">Profile Command Center</h1>
          <p className="profile-subtitle">Manage your identity, photo, and security settings.</p>
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
              <h2 className="profile-name">{user.name || "Your Name"}</h2>
              <div className="profile-meta">
                <span>{user.email || "email not set"}</span>
                <span>{user.role || "patient"}</span>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <p className="profile-section-title">Profile Photo</p>
            <div className="profile-form">
              <div className="profile-field">
                <label className="profile-label">Upload new photo</label>
                <input type="file" onChange={(e) => setImage(e.target.files?.[0] || null)} />
              </div>
              <div className="profile-field profile-inline-actions">
                <button
                  className="profile-btn profile-btn-secondary"
                  type="button"
                  onClick={handleAvatarUpload}
                  disabled={!image || uploadingAvatar}
                >
                  {uploadingAvatar ? "Uploading..." : "Update Photo"}
                </button>
              </div>
            </div>
          </div>

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
            <p className="profile-section-title">Contact</p>
            <div className="profile-form">
              <div className="profile-field">
                <label className="profile-label">Phone</label>
                <input
                  className="profile-input"
                  disabled={!isEdit}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="profile-field profile-inline-actions">
                {isEdit ? (
                  <div className="profile-inline-actions">
                    <button className="profile-btn profile-btn-primary" onClick={handleSave} type="button">
                      Save Phone
                    </button>
                    <button
                      className="profile-btn profile-btn-secondary"
                      type="button"
                      onClick={() => {
                        setIsEdit(false);
                        setPhone(user.phone || "");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button className="profile-btn profile-btn-primary" onClick={() => setIsEdit(true)} type="button">
                    Edit Phone
                  </button>
                )}
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
