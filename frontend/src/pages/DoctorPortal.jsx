import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import DoctorSidebar from "../components/DoctorSidebar";
import "./PatientPortal.css";

const DoctorPortal = () => {
  const { token, userData, logout, backendUrl } = useContext(AppContext);
  const navigate = useNavigate();
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // form fields
  const [consultationFee, setConsultationFee] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [specialty, setSpecialty] = useState('');
  const [subSpecialty, setSubSpecialty] = useState('');
  const [licenseNo, setLicenseNo] = useState('');

  useEffect(() => {
    if (!token) return navigate("/login");
    const role = userData?.role || userData?.user?.role;
    if (role !== "doctor") return navigate("/login");
  }, [token, userData, navigate]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const headers = token ? { dtoken: token, Authorization: `Bearer ${token}` } : {};
        const { data } = await axios.get(backendUrl + "/api/doctor/dashboard", { headers });
        if (data.success) setDash(data.dashData || data.dashData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [backendUrl, token]);

  // load doctor profile from auth route (Supabase doctor_profiles)
  useEffect(() => {
    if (!token) return;
    const fetchProfile = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}`, dtoken: token } : {};
        const { data } = await axios.get(backendUrl + '/api/auth/doctor/profile', { headers });
        const body = data || {};
        const profilePayload = body?.data?.profile || body?.profile || body?.data || null;
        if (body?.success && profilePayload) {
          setProfile(profilePayload);
          setConsultationFee(profilePayload.consultation_fee ?? profilePayload.consultationFee ?? '');
          setQualifications(profilePayload.qualifications || '');
          setIsAvailable(typeof profilePayload.is_available !== 'undefined' ? profilePayload.is_available : true);
          setSpecialty(profilePayload.specialty || '');
          setSubSpecialty(profilePayload.sub_specialty || profilePayload.subSpecialty || '');
          setLicenseNo(profilePayload.license_no || profilePayload.nmc_license_no || '');
        }
      } catch (err) {
        console.error('Failed to load doctor profile', err?.response?.data || err.message || err);
      }
    };
    fetchProfile();
  }, [backendUrl, token]);

  return (
    <div className="pp-page">
      <div className="pp-container">
        <DoctorSidebar />

        <main className="pp-main-content" id="dashboard">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold">Doctor Dashboard</h1>
            <div>
              <button className="bg-red-500 text-white px-4 py-2 rounded" onClick={logout}>Logout</button>
            </div>
          </div>

          {loading && <p>Loading...</p>}

          {dash && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded shadow">
                <p className="text-sm text-gray-500">Earnings</p>
                <p className="text-2xl font-bold">{dash.earnings || 0}</p>
              </div>
              <div className="p-4 border rounded shadow">
                <p className="text-sm text-gray-500">Patients</p>
                <p className="text-2xl font-bold">{dash.patients}</p>
              </div>
              <div className="p-4 border rounded shadow">
                <p className="text-sm text-gray-500">Appointments</p>
                <p className="text-2xl font-bold">{dash.appointments}</p>
              </div>
            </div>
          )}

          <div className="mt-6 p-4 border rounded">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">My Profile</h2>
              <div>
                <button className="bg-primary text-white px-3 py-1 rounded mr-2" onClick={() => setEditMode(!editMode)}>{editMode ? 'Cancel' : 'Edit Profile'}</button>
              </div>
            </div>

            {!profile && <p className="text-sm text-gray-500">Loading profile...</p>}

        {profile && !editMode && (
          <div>
            <p className="font-medium">{profile.user?.name || profile.user?.email}</p>
            <p className="text-sm text-gray-600">Specialty: {profile.specialty || '—'}</p>
            <p className="text-sm text-gray-600">Qualifications: {profile.qualifications || '—'}</p>
            <p className="text-sm text-gray-600">Consultation Fee: {profile.consultation_fee ?? '—'}</p>
            <p className="text-sm text-gray-600">Available: {profile.is_available ? 'Yes' : 'No'}</p>
            <p className="text-sm text-gray-600">License: {profile.license_no || profile.nmc_license_no || '—'}</p>
          </div>
        )}

        {profile && editMode && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);
              try {
                const payload = {
                  consultation_fee: consultationFee,
                  qualifications,
                  is_available: !!isAvailable,
                  specialty,
                  sub_specialty: subSpecialty,
                  license_no: licenseNo,
                };
                const headers = token ? { Authorization: `Bearer ${token}`, dtoken: token } : {};
                const { data } = await axios.post(backendUrl + '/api/auth/doctor/update-profile', payload, { headers });
                const body = data || {};
                const updatedProfile = body?.data?.profile || body?.profile || body?.data || null;
                if (body?.success && updatedProfile) {
                  setProfile(updatedProfile);
                  setEditMode(false);
                } else {
                  console.error('Update failed', data);
                }
              } catch (err) {
                console.error('Failed to update profile', err?.response?.data || err.message || err);
              } finally {
                setSaving(false);
              }
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block">
                <div className="text-sm text-gray-600">Consultation Fee</div>
                <input className="mt-1 w-full border rounded px-2 py-1" value={consultationFee} onChange={(e) => setConsultationFee(e.target.value)} />
              </label>
              <label className="block">
                <div className="text-sm text-gray-600">Available</div>
                <select className="mt-1 w-full border rounded px-2 py-1" value={isAvailable ? '1' : '0'} onChange={(e) => setIsAvailable(e.target.value === '1')}>
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </label>
              <label className="block md:col-span-2">
                <div className="text-sm text-gray-600">Qualifications (comma separated)</div>
                <textarea className="mt-1 w-full border rounded px-2 py-1" value={qualifications} onChange={(e) => setQualifications(e.target.value)} />
              </label>
              <label className="block">
                <div className="text-sm text-gray-600">Specialty</div>
                <input className="mt-1 w-full border rounded px-2 py-1" value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
              </label>
              <label className="block">
                <div className="text-sm text-gray-600">Sub Specialty</div>
                <input className="mt-1 w-full border rounded px-2 py-1" value={subSpecialty} onChange={(e) => setSubSpecialty(e.target.value)} />
              </label>
              <label className="block md:col-span-2">
                <div className="text-sm text-gray-600">License / NMC</div>
                <input className="mt-1 w-full border rounded px-2 py-1" value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} />
              </label>
            </div>

            <div className="mt-4">
              <button type="submit" className="bg-primary text-white px-4 py-2 rounded" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        )}
      </div>

      {dash?.latestAppointments && dash.latestAppointments.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Upcoming Appointments</h2>
          <ul className="space-y-2">
            {dash.latestAppointments.map((a) => (
              <li key={a._id || a.id} className="p-3 border rounded">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">{a.user?.name || a.user?.email || a.userId}</p>
                    <p className="text-sm text-gray-500">{a.slotDate} {a.slotTime}</p>
                  </div>
                  <div className="text-sm text-gray-600">{a.status || (a.cancelled ? 'cancelled' : 'pending')}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
        </main>
      </div>
    </div>
  );
};

export default DoctorPortal;
