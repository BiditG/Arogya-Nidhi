import { useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { AppContext } from "../context/AppContext";
import { assets } from "../assets/assets_frontend/assets";
import "./PublicProfile.css";

const formatDate = (value) => {
  if (!value) return "Not set";
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return "Not set";
  }
};

const PublicProfile = () => {
  const { barcode } = useParams();
  const { backendUrl } = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(backendUrl + `/api/public/profile/${barcode}`);
        if (data?.success) {
          setProfile(data.data.profile);
        } else {
          setProfile(null);
        }
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    if (barcode) loadProfile();
  }, [barcode, backendUrl]);

  if (loading) {
    return (
      <div className="public-shell">
        <div className="public-card">
          <div className="public-loading">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="public-shell">
        <div className="public-card">
          <div className="public-loading">Profile not found.</div>
        </div>
      </div>
    );
  }

  const avatarUrl = profile.avatarUrl || assets.profile_pic;
  const address = profile.address || {};
  const addressLine = [address.streetAddress, address.city, address.state, address.pinCode, address.country]
    .map((part) => (part || "").trim())
    .filter(Boolean)
    .join(", ") || "Not set";

  return (
    <div className="public-shell">
      <div className="public-card">
        <h1 className="public-title">Verified Profile</h1>
        <p className="public-subtitle">Shared via secure barcode scan.</p>

        <div className="public-identity">
          <div className="public-avatar">
            <img src={avatarUrl} alt="Profile" />
          </div>
          <div>
            <h2 className="public-name">{profile.name || "Unnamed"}</h2>
            <div className="public-pill">{profile.role || "user"}</div>
          </div>
        </div>

        <div className="public-grid">
          <div className="public-field">
            <div className="public-label">Email</div>
            <div className="public-value">{profile.email || "Not set"}</div>
          </div>
          <div className="public-field">
            <div className="public-label">Phone</div>
            <div className="public-value">{profile.phone || "Not set"}</div>
          </div>
          <div className="public-field">
            <div className="public-label">Gender</div>
            <div className="public-value">{profile.gender || "Not set"}</div>
          </div>
          <div className="public-field">
            <div className="public-label">Birthday</div>
            <div className="public-value">{formatDate(profile.dateOfBirth)}</div>
          </div>
          <div className="public-field">
            <div className="public-label">Address</div>
            <div className="public-value">{addressLine}</div>
          </div>
          <div className="public-field">
            <div className="public-label">Barcode</div>
            <div className="public-value">{profile.barcode}</div>
          </div>
        </div>

        <div className="public-footer">
          <span>Shared via ArogyaNidhi</span>
          <span>Keep this page private.</span>
        </div>
      </div>
    </div>
  );
};

export default PublicProfile;
