import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { AppContext } from "../context/AppContext";
import { patientPortalApi } from "../utils/patientPortalApi";

const defaultForm = {
  doctorId: "",
  scheduledAt: "",
  durationMinutes: 30,
  patientNotes: "",
};

const getErrorMessage = (err, fallback) =>
  err?.response?.data?.message || err?.message || fallback;

const BookAppointment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { backendUrl, token } = useContext(AppContext);

  const doctorIdFromQuery = searchParams.get("doctorId") || "";

  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...defaultForm, doctorId: doctorIdFromQuery });

  const minDateTimeValue = useMemo(
    () => new Date(Date.now() + 60 * 1000).toISOString().slice(0, 16),
    []
  );

  const loadDoctors = useCallback(async () => {
    try {
      setLoading(true);
      const params = specialtyFilter ? { specialty: specialtyFilter } : {};
      const data = await patientPortalApi.getDoctors(backendUrl, token, params);
      setDoctors(data.doctors || []);

      if (doctorIdFromQuery) {
        const doctor = await patientPortalApi.getDoctorById(
          backendUrl,
          token,
          doctorIdFromQuery
        );
        setSelectedDoctor(doctor);
        setForm((prev) => ({ ...prev, doctorId: doctor.id }));
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load doctor list"));
    } finally {
      setLoading(false);
    }
  }, [backendUrl, doctorIdFromQuery, specialtyFilter, token]);

  const loadDoctorProfile = async (doctorId) => {
    try {
      const profile = await patientPortalApi.getDoctorById(backendUrl, token, doctorId);
      setSelectedDoctor(profile);
      setForm((prev) => ({ ...prev, doctorId: doctorId }));
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load doctor profile"));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.doctorId) {
      toast.error("Please select a doctor");
      return;
    }

    try {
      await patientPortalApi.bookAppointment(backendUrl, token, {
        doctorId: form.doctorId,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMinutes: Number(form.durationMinutes),
        patientNotes: form.patientNotes || undefined,
      });
      toast.success("Appointment booked successfully");
      setForm({ ...defaultForm, doctorId: form.doctorId });
      navigate("/patient-portal");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to book appointment"));
    }
  };

  useEffect(() => {
    if (token) {
      loadDoctors();
    }
  }, [loadDoctors, token]);

  if (!token) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="bg-white border rounded-xl p-8 text-center max-w-xl">
          <h1 className="text-2xl font-bold text-gray-900">Book Appointment</h1>
          <p className="text-gray-600 mt-2">
            Login as a patient to schedule appointments.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="mt-5 px-6 py-2 bg-primary text-white rounded-lg"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Book Appointment</h1>
          <p className="text-gray-600 mt-1">
            Pick a verified doctor and confirm your consultation slot.
          </p>
        </div>
        <button
          onClick={() => navigate("/patient-portal")}
          className="px-4 py-2 border rounded-lg text-sm"
        >
          Back to Portal
        </button>
      </div>

      <div className="grid xl:grid-cols-[1.2fr_1fr] gap-5">
        <div className="bg-white border rounded-xl p-4">
          <div className="flex flex-wrap gap-2 items-center mb-4">
            <input
              type="text"
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              className="border rounded-lg p-2 text-sm min-w-[220px]"
              placeholder="Filter doctors by specialty"
            />
            <button
              onClick={loadDoctors}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
            >
              Search
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">Loading doctors...</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
              {doctors.length ? (
                doctors.map((doctor) => (
                  <div key={doctor.id} className="border rounded-xl p-3">
                    <p className="font-semibold text-gray-900">
                      {doctor.user?.name || "Doctor"}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">{doctor.specialty}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Experience: {doctor.experienceYears || 0} years
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                      Fee: {doctor.consultationFee}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => loadDoctorProfile(doctor.id)}
                        className="text-xs px-3 py-1.5 border rounded-md hover:border-primary"
                      >
                        View Profile
                      </button>
                      <button
                        onClick={() =>
                          setForm((prev) => ({ ...prev, doctorId: doctor.id }))
                        }
                        className={`text-xs px-3 py-1.5 rounded-md ${
                          form.doctorId === doctor.id
                            ? "bg-primary text-white"
                            : "border border-gray-300"
                        }`}
                      >
                        {form.doctorId === doctor.id ? "Selected" : "Select"}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No doctors found.</p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white border rounded-xl p-4">
            <h2 className="text-lg font-semibold text-gray-900">Booking Form</h2>
            <form onSubmit={handleSubmit} className="mt-3 space-y-3">
              <label className="block text-sm text-gray-600">Selected doctor</label>
              <select
                value={form.doctorId}
                onChange={(e) => setForm((prev) => ({ ...prev, doctorId: e.target.value }))}
                className="w-full border rounded-lg p-2 text-sm"
                required
              >
                <option value="">Select a doctor</option>
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.user?.name} - {doctor.specialty}
                  </option>
                ))}
              </select>

              <label className="block text-sm text-gray-600">Schedule date & time</label>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                min={minDateTimeValue}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, scheduledAt: e.target.value }))
                }
                className="w-full border rounded-lg p-2 text-sm"
                required
              />

              <label className="block text-sm text-gray-600">Duration (minutes)</label>
              <input
                type="number"
                min="15"
                max="120"
                step="15"
                value={form.durationMinutes}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    durationMinutes: e.target.value,
                  }))
                }
                className="w-full border rounded-lg p-2 text-sm"
                required
              />

              <label className="block text-sm text-gray-600">Patient notes (optional)</label>
              <textarea
                value={form.patientNotes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, patientNotes: e.target.value }))
                }
                className="w-full border rounded-lg p-2 text-sm"
                rows={4}
                placeholder="Add symptoms or context"
              />

              <button
                type="submit"
                className="w-full bg-primary text-white py-2 rounded-lg"
              >
                Confirm Appointment
              </button>
            </form>
          </div>

          <div className="bg-white border rounded-xl p-4">
            <h2 className="text-lg font-semibold text-gray-900">Doctor Profile</h2>
            {selectedDoctor ? (
              <div className="mt-3 text-sm text-gray-700 space-y-1">
                <p>
                  <span className="text-gray-500">Name:</span>{" "}
                  {selectedDoctor.user?.name || "Doctor"}
                </p>
                <p>
                  <span className="text-gray-500">Specialty:</span>{" "}
                  {selectedDoctor.specialty || "-"}
                </p>
                <p>
                  <span className="text-gray-500">Sub-specialty:</span>{" "}
                  {selectedDoctor.subSpecialty || "-"}
                </p>
                <p>
                  <span className="text-gray-500">Experience:</span>{" "}
                  {selectedDoctor.experienceYears || 0} years
                </p>
                <p>
                  <span className="text-gray-500">Qualifications:</span>{" "}
                  {selectedDoctor.qualifications || "-"}
                </p>
                <p className="pt-1">
                  <span className="text-gray-500">Bio:</span> {selectedDoctor.bio || "-"}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-500">
                Select a doctor to view full profile details.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookAppointment;
