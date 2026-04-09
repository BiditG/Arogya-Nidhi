import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AppContext } from "../context/AppContext";
import { patientPortalApi } from "../utils/patientPortalApi";

const IOT_TYPES = [
  "blood_pressure",
  "blood_glucose",
  "heart_rate",
  "spo2",
  "temperature",
  "weight",
  "ecg",
  "other",
];

const statusClassMap = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-sky-50 text-sky-700 border-sky-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  no_show: "bg-slate-100 text-slate-700 border-slate-200",
};

const QueryBadge = ({ isResolved }) => (
  <span
    className={`text-xs px-2 py-1 rounded-full border ${
      isResolved
        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
        : "bg-amber-50 text-amber-700 border-amber-200"
    }`}
  >
    {isResolved ? "Resolved" : "Open"}
  </span>
);

const SectionTitle = ({ title, description }) => (
  <div className="mb-4">
    <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
    {description ? <p className="text-sm text-gray-600 mt-1">{description}</p> : null}
  </div>
);

const formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
};

const formatNumber = (value) => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number") return value.toFixed(1).replace(/\.0$/, "");
  return String(value);
};

const getErrorMessage = (err, fallback) =>
  err?.response?.data?.message || err?.message || fallback;

const PatientPortal = () => {
  const navigate = useNavigate();
  const { userData, backendUrl, token, loadUserProfileData } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);

  const [overview, setOverview] = useState(null);
  const [quickActions, setQuickActions] = useState({
    upcomingAppointments: [],
    recentMedicalHistory: [],
    recentIotReadings: [],
  });

  const [appointments, setAppointments] = useState([]);
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [rescheduleValues, setRescheduleValues] = useState({
    scheduledAt: "",
    patientNotes: "",
  });

  const [queries, setQueries] = useState([]);
  const [queryResolvedFilter, setQueryResolvedFilter] = useState("all");
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [queryForm, setQueryForm] = useState({
    title: "",
    symptomText: "",
    isAnonymous: false,
  });

  const [medicalHistory, setMedicalHistory] = useState([]);
  const [iotReadings, setIotReadings] = useState([]);
  const [iotTypeFilter, setIotTypeFilter] = useState("");
  const [selectedReading, setSelectedReading] = useState(null);
  const [iotForm, setIotForm] = useState({
    testType: "blood_pressure",
    sensorData: "{}",
    resultScore: "",
    notes: "",
  });

  const [doctorItems, setDoctorItems] = useState([]);
  const [doctorSpecialtyFilter, setDoctorSpecialtyFilter] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  const appointmentStatuses = useMemo(
    () => ["", "pending", "confirmed", "cancelled", "completed", "no_show"],
    []
  );

  const refreshOverview = useCallback(async () => {
    const [overviewData, quickData] = await Promise.all([
      patientPortalApi.getOverview(backendUrl, token),
      patientPortalApi.getQuickActions(backendUrl, token),
    ]);
    setOverview(overviewData);
    setQuickActions(quickData);
  }, [backendUrl, token]);

  const refreshAppointments = useCallback(async () => {
    const params = appointmentStatusFilter ? { status: appointmentStatusFilter } : {};
    const data = await patientPortalApi.getAppointments(backendUrl, token, params);
    setAppointments(data.appointments || []);
  }, [appointmentStatusFilter, backendUrl, token]);

  const refreshQueries = useCallback(async () => {
    const params =
      queryResolvedFilter === "all"
        ? {}
        : { isResolved: queryResolvedFilter === "resolved" ? "true" : "false" };
    const data = await patientPortalApi.getQueries(backendUrl, token, params);
    setQueries(data.queries || []);
  }, [backendUrl, queryResolvedFilter, token]);

  const refreshMedicalHistory = useCallback(async () => {
    const [historyData, recentData] = await Promise.all([
      patientPortalApi.getMedicalHistory(backendUrl, token),
      patientPortalApi.getRecentMedicalHistory(backendUrl, token),
    ]);
    setMedicalHistory([...(historyData.records || [])]);
    setQuickActions((prev) => ({
      ...prev,
      recentMedicalHistory: recentData || [],
    }));
  }, [backendUrl, token]);

  const refreshIotReadings = useCallback(async () => {
    const params = iotTypeFilter ? { testType: iotTypeFilter } : {};
    const [allData, recentData] = await Promise.all([
      patientPortalApi.getIotReadings(backendUrl, token, params),
      patientPortalApi.getRecentIotReadings(backendUrl, token),
    ]);
    setIotReadings(allData.readings || []);
    setQuickActions((prev) => ({
      ...prev,
      recentIotReadings: recentData || [],
    }));
  }, [backendUrl, iotTypeFilter, token]);

  const refreshDoctors = useCallback(async () => {
    const params = doctorSpecialtyFilter
      ? { specialty: doctorSpecialtyFilter }
      : {};
    const data = await patientPortalApi.getDoctors(backendUrl, token, params);
    setDoctorItems(data.doctors || []);
  }, [backendUrl, doctorSpecialtyFilter, token]);

  const refreshPortalData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        refreshOverview(),
        refreshAppointments(),
        refreshQueries(),
        refreshMedicalHistory(),
        refreshIotReadings(),
        refreshDoctors(),
      ]);
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load patient portal"));
    } finally {
      setLoading(false);
    }
  }, [
    refreshAppointments,
    refreshDoctors,
    refreshIotReadings,
    refreshMedicalHistory,
    refreshOverview,
    refreshQueries,
  ]);

  const fetchAppointmentDetails = async (id) => {
    try {
      const data = await patientPortalApi.getAppointmentById(backendUrl, token, id);
      setSelectedAppointment(data);
      setRescheduleValues({
        scheduledAt: "",
        patientNotes: data.patientNotes || "",
      });
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not load appointment details"));
    }
  };

  const fetchQueryDetails = async (id) => {
    try {
      const data = await patientPortalApi.getQueryById(backendUrl, token, id);
      setSelectedQuery(data);
      setQueryForm({
        title: data.title || "",
        symptomText: data.symptomText || "",
        isAnonymous: Boolean(data.isAnonymous),
      });
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not load query details"));
    }
  };

  const fetchDoctorDetails = async (id) => {
    try {
      const data = await patientPortalApi.getDoctorById(backendUrl, token, id);
      setSelectedDoctor(data);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not load doctor profile"));
    }
  };

  const fetchReadingDetails = async (id) => {
    try {
      const data = await patientPortalApi.getIotReadingById(backendUrl, token, id);
      setSelectedReading(data);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not load IoT reading details"));
    }
  };

  const handleCancelAppointment = async (id) => {
    try {
      await patientPortalApi.cancelAppointment(backendUrl, token, id);
      toast.success("Appointment cancelled");
      await Promise.all([refreshAppointments(), refreshOverview()]);
      setSelectedAppointment(null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not cancel appointment"));
    }
  };

  const handleRescheduleAppointment = async (event) => {
    event.preventDefault();
    if (!selectedAppointment) return;

    try {
      await patientPortalApi.rescheduleAppointment(
        backendUrl,
        token,
        selectedAppointment.id,
        {
          scheduledAt: new Date(rescheduleValues.scheduledAt).toISOString(),
          patientNotes: rescheduleValues.patientNotes || undefined,
        }
      );
      toast.success("Appointment rescheduled");
      await Promise.all([
        refreshAppointments(),
        refreshOverview(),
        fetchAppointmentDetails(selectedAppointment.id),
      ]);
      setRescheduleValues((prev) => ({ ...prev, scheduledAt: "" }));
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not reschedule appointment"));
    }
  };

  const handleCreateQuery = async (event) => {
    event.preventDefault();
    try {
      await patientPortalApi.createQuery(backendUrl, token, queryForm);
      toast.success("Health query created");
      await refreshQueries();
      setQueryForm({ title: "", symptomText: "", isAnonymous: false });
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not create query"));
    }
  };

  const handleUpdateQuery = async (event) => {
    event.preventDefault();
    if (!selectedQuery) return;
    try {
      await patientPortalApi.updateQuery(backendUrl, token, selectedQuery.id, {
        title: queryForm.title,
        symptomText: queryForm.symptomText,
        isAnonymous: queryForm.isAnonymous,
      });
      toast.success("Query updated");
      await Promise.all([refreshQueries(), fetchQueryDetails(selectedQuery.id)]);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not update query"));
    }
  };

  const handleCloseQuery = async () => {
    if (!selectedQuery) return;
    try {
      await patientPortalApi.closeQuery(backendUrl, token, selectedQuery.id);
      toast.success("Query closed");
      await Promise.all([refreshQueries(), fetchQueryDetails(selectedQuery.id)]);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not close query"));
    }
  };

  const handleDeleteQuery = async () => {
    if (!selectedQuery) return;
    try {
      await patientPortalApi.deleteQuery(backendUrl, token, selectedQuery.id);
      toast.success("Query deleted");
      setSelectedQuery(null);
      await refreshQueries();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not delete query"));
    }
  };

  const handleSubmitIot = async (event) => {
    event.preventDefault();
    try {
      const parsedSensorData = JSON.parse(iotForm.sensorData || "{}");
      await patientPortalApi.submitIotTest(backendUrl, token, {
        testType: iotForm.testType,
        sensorData: parsedSensorData,
        resultScore:
          iotForm.resultScore === "" ? undefined : Number(iotForm.resultScore),
        notes: iotForm.notes || undefined,
      });
      toast.success("IoT test submitted");
      setIotForm({
        testType: iotForm.testType,
        sensorData: "{}",
        resultScore: "",
        notes: "",
      });
      await Promise.all([refreshIotReadings(), refreshOverview()]);
    } catch (err) {
      toast.error(
        err instanceof SyntaxError
          ? "Sensor data must be valid JSON"
          : getErrorMessage(err, "Could not submit IoT reading")
      );
    }
  };

  useEffect(() => {
    if (token) {
      loadUserProfileData();
      refreshPortalData();
    }
  }, [loadUserProfileData, refreshPortalData, token]);

  useEffect(() => {
    if (!token) return;
    refreshAppointments();
  }, [refreshAppointments, token]);

  useEffect(() => {
    if (!token) return;
    refreshQueries();
  }, [refreshQueries, token]);

  useEffect(() => {
    if (!token) return;
    refreshIotReadings();
  }, [refreshIotReadings, token]);

  useEffect(() => {
    if (!token) return;
    refreshDoctors();
  }, [refreshDoctors, token]);

  if (!token) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="bg-white border rounded-xl p-8 text-center max-w-xl">
          <h1 className="text-2xl font-bold text-gray-900">Patient Portal</h1>
          <p className="text-gray-600 mt-2">
            Please login as a patient to access your health dashboard.
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

  const patientName = userData?.user?.name || overview?.patient?.name || "Patient";
  const selectedQueryEditable = selectedQuery && !selectedQuery.isResolved;

  return (
    <div className="min-h-screen py-6">
      <div className="bg-gradient-to-r from-indigo-600 via-blue-500 to-cyan-500 rounded-2xl p-6 text-white shadow-lg">
        <p className="text-sm uppercase tracking-widest text-indigo-100">Patient Portal</p>
        <h1 className="text-3xl font-bold mt-1">Welcome back, {patientName}</h1>
        <p className="text-indigo-50 mt-2 max-w-2xl">
          Track your health, manage appointments, submit IoT tests, and stay in touch
          with verified doctors.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={() => setActiveTab("overview")}
            className="px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 transition"
          >
            Health Overview
          </button>
          <button
            onClick={() => setActiveTab("appointments")}
            className="px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 transition"
          >
            Upcoming Appointments
          </button>
          <button
            onClick={() => setActiveTab("queries")}
            className="px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 transition"
          >
            My Health Queries
          </button>
          <button
            onClick={() => navigate("/patient-portal/book-appointment")}
            className="px-4 py-2 rounded-lg bg-white text-indigo-700 font-semibold hover:bg-indigo-50 transition"
          >
            Book Appointment Page
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {[
          ["overview", "Overview"],
          ["appointments", "Appointments"],
          ["queries", "Health Queries"],
          ["medical", "Medical History"],
          ["iot", "IoT Tests"],
          ["doctors", "Doctors"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 rounded-lg text-sm border transition ${
              activeTab === key
                ? "bg-primary text-white border-primary"
                : "bg-white text-gray-700 border-gray-300 hover:border-primary"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-8 text-gray-600">Loading patient data...</div>
      ) : (
        <div className="mt-6">
          {activeTab === "overview" && (
            <div>
              <SectionTitle
                title="Health Overview"
                description="Dashboard stats and quick actions synced from patient APIs."
              />
              <div className="grid md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border p-4">
                  <p className="text-sm text-gray-500">Health Score</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {overview?.stats?.healthScore ?? "-"}
                  </p>
                </div>
                <div className="bg-white rounded-xl border p-4">
                  <p className="text-sm text-gray-500">Upcoming</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {overview?.stats?.upcomingAppointments ?? 0}
                  </p>
                </div>
                <div className="bg-white rounded-xl border p-4">
                  <p className="text-sm text-gray-500">Pending Tests</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {overview?.stats?.pendingTests ?? 0}
                  </p>
                </div>
                <div className="bg-white rounded-xl border p-4">
                  <p className="text-sm text-gray-500">Prescriptions</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {overview?.stats?.activePrescriptions ?? 0}
                  </p>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-4 mt-4">
                <div className="bg-white rounded-xl border p-4">
                  <h3 className="font-semibold text-gray-900">Health Score Breakdown</h3>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(overview?.healthScoreBreakdown || {}).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                        >
                          <p className="text-gray-500">{key}</p>
                          <p className="text-lg font-semibold text-gray-900">{value}</p>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-xl border p-4">
                  <h3 className="font-semibold text-gray-900">Quick Actions</h3>
                  <div className="grid md:grid-cols-3 gap-3 mt-3">
                    <div className="border rounded-lg p-3 bg-blue-50/40">
                      <p className="text-sm font-medium">Upcoming Appointments</p>
                      <ul className="mt-2 text-xs text-gray-700 space-y-2">
                        {quickActions.upcomingAppointments?.length ? (
                          quickActions.upcomingAppointments.map((item) => (
                            <li key={item.id} className="border-b border-blue-100 pb-2">
                              <p className="font-medium">{item.doctor?.user?.name || "Doctor"}</p>
                              <p>{formatDateTime(item.scheduledAt)}</p>
                            </li>
                          ))
                        ) : (
                          <li>No upcoming appointments.</li>
                        )}
                      </ul>
                    </div>

                    <div className="border rounded-lg p-3 bg-emerald-50/40">
                      <p className="text-sm font-medium">Recent History</p>
                      <ul className="mt-2 text-xs text-gray-700 space-y-2">
                        {quickActions.recentMedicalHistory?.length ? (
                          quickActions.recentMedicalHistory.map((item) => (
                            <li key={item.id} className="border-b border-emerald-100 pb-2">
                              <p className="font-medium">{item.consultationSummary?.diagnosis || "Diagnosis"}</p>
                              <p>{item.doctor?.user?.name || "Doctor"}</p>
                            </li>
                          ))
                        ) : (
                          <li>No recent medical history.</li>
                        )}
                      </ul>
                    </div>

                    <div className="border rounded-lg p-3 bg-amber-50/40">
                      <p className="text-sm font-medium">Recent IoT</p>
                      <ul className="mt-2 text-xs text-gray-700 space-y-2">
                        {quickActions.recentIotReadings?.length ? (
                          quickActions.recentIotReadings.map((item) => (
                            <li key={item.id} className="border-b border-amber-100 pb-2">
                              <p className="font-medium">{item.testType}</p>
                              <p>Score: {formatNumber(item.resultScore)}</p>
                            </li>
                          ))
                        ) : (
                          <li>No recent IoT readings.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "appointments" && (
            <div>
              <SectionTitle
                title="Appointments"
                description="View, filter, inspect, cancel, and reschedule your appointments."
              />
              <div className="flex flex-wrap gap-3 items-center mb-4">
                <label className="text-sm text-gray-600">Filter by status</label>
                <select
                  value={appointmentStatusFilter}
                  onChange={(e) => setAppointmentStatusFilter(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm"
                >
                  {appointmentStatuses.map((status) => (
                    <option key={status || "all"} value={status}>
                      {status ? status : "all"}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => navigate("/patient-portal/book-appointment")}
                  className="ml-auto px-4 py-2 bg-primary text-white rounded-lg"
                >
                  Book New Appointment
                </button>
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                <div className="bg-white border rounded-xl p-4">
                  <h3 className="font-semibold">All Appointments</h3>
                  <div className="mt-3 space-y-3 max-h-[460px] overflow-y-auto pr-1">
                    {appointments.length ? (
                      appointments.map((item) => (
                        <div key={item.id} className="border rounded-lg p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-gray-900">
                                {item.doctor?.user?.name || "Doctor"}
                              </p>
                              <p className="text-sm text-gray-600">{item.doctor?.specialty}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDateTime(item.scheduledAt)}
                              </p>
                            </div>
                            <span
                              className={`text-xs px-2 py-1 rounded-full border ${
                                statusClassMap[item.status] ||
                                "bg-gray-50 text-gray-700 border-gray-200"
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => fetchAppointmentDetails(item.id)}
                              className="text-xs px-3 py-1.5 border rounded-md hover:border-primary"
                            >
                              Details
                            </button>
                            {!["cancelled", "completed"].includes(item.status) && (
                              <button
                                onClick={() => handleCancelAppointment(item.id)}
                                className="text-xs px-3 py-1.5 border rounded-md text-rose-600 border-rose-200 hover:bg-rose-50"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No appointments found.</p>
                    )}
                  </div>
                </div>

                <div className="bg-white border rounded-xl p-4">
                  <h3 className="font-semibold">Appointment Details</h3>
                  {selectedAppointment ? (
                    <div className="mt-3">
                      <p className="text-sm">
                        <span className="text-gray-500">Doctor:</span>{" "}
                        {selectedAppointment.doctor?.user?.name}
                      </p>
                      <p className="text-sm mt-1">
                        <span className="text-gray-500">Specialty:</span>{" "}
                        {selectedAppointment.doctor?.specialty || "-"}
                      </p>
                      <p className="text-sm mt-1">
                        <span className="text-gray-500">Scheduled:</span>{" "}
                        {formatDateTime(selectedAppointment.scheduledAt)}
                      </p>
                      <p className="text-sm mt-1">
                        <span className="text-gray-500">Status:</span>{" "}
                        {selectedAppointment.status}
                      </p>

                      <form onSubmit={handleRescheduleAppointment} className="mt-5 space-y-3">
                        <h4 className="font-medium">Reschedule Appointment</h4>
                        <input
                          type="datetime-local"
                          value={rescheduleValues.scheduledAt}
                          min={new Date(Date.now() + 60 * 1000)
                            .toISOString()
                            .slice(0, 16)}
                          onChange={(e) =>
                            setRescheduleValues((prev) => ({
                              ...prev,
                              scheduledAt: e.target.value,
                            }))
                          }
                          className="w-full border rounded-lg p-2 text-sm"
                          required
                        />
                        <textarea
                          value={rescheduleValues.patientNotes}
                          onChange={(e) =>
                            setRescheduleValues((prev) => ({
                              ...prev,
                              patientNotes: e.target.value,
                            }))
                          }
                          className="w-full border rounded-lg p-2 text-sm"
                          rows={3}
                          placeholder="Optional notes"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 bg-primary text-white rounded-lg"
                        >
                          Confirm Reschedule
                        </button>
                      </form>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mt-3">
                      Select an appointment to view details.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "queries" && (
            <div>
              <SectionTitle
                title="My Health Queries"
                description="Create, update, close, and delete unresolved health queries."
              />
              <div className="grid lg:grid-cols-2 gap-4">
                <div className="bg-white border rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Filter</label>
                    <select
                      value={queryResolvedFilter}
                      onChange={(e) => setQueryResolvedFilter(e.target.value)}
                      className="border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="all">all</option>
                      <option value="open">open</option>
                      <option value="resolved">resolved</option>
                    </select>
                  </div>

                  <div className="mt-3 space-y-3 max-h-[360px] overflow-y-auto pr-1">
                    {queries.length ? (
                      queries.map((item) => (
                        <div key={item.id} className="border rounded-lg p-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-gray-900">{item.title}</p>
                            <QueryBadge isResolved={item.isResolved} />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Responses: {item._count?.responses || 0}
                          </p>
                          <button
                            onClick={() => fetchQueryDetails(item.id)}
                            className="mt-2 text-xs px-3 py-1.5 border rounded-md hover:border-primary"
                          >
                            View Details
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No queries found.</p>
                    )}
                  </div>

                  <form onSubmit={handleCreateQuery} className="mt-5 border-t pt-4 space-y-3">
                    <h4 className="font-medium">Create New Query</h4>
                    <input
                      type="text"
                      value={queryForm.title}
                      onChange={(e) =>
                        setQueryForm((prev) => ({ ...prev, title: e.target.value }))
                      }
                      className="w-full border rounded-lg p-2 text-sm"
                      placeholder="Query title"
                      minLength={3}
                      required
                    />
                    <textarea
                      value={queryForm.symptomText}
                      onChange={(e) =>
                        setQueryForm((prev) => ({
                          ...prev,
                          symptomText: e.target.value,
                        }))
                      }
                      className="w-full border rounded-lg p-2 text-sm"
                      rows={4}
                      placeholder="Describe symptoms"
                    />
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={queryForm.isAnonymous}
                        onChange={(e) =>
                          setQueryForm((prev) => ({
                            ...prev,
                            isAnonymous: e.target.checked,
                          }))
                        }
                      />
                      Ask anonymously
                    </label>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary text-white rounded-lg"
                    >
                      Submit Query
                    </button>
                  </form>
                </div>

                <div className="bg-white border rounded-xl p-4">
                  <h3 className="font-semibold">Query Details & Responses</h3>
                  {selectedQuery ? (
                    <div className="mt-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">{selectedQuery.title}</p>
                        <QueryBadge isResolved={selectedQuery.isResolved} />
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        {selectedQuery.symptomText || "No symptom details added."}
                      </p>

                      <div className="mt-4">
                        <h4 className="text-sm font-medium">Doctor Responses</h4>
                        <div className="mt-2 space-y-2 max-h-40 overflow-y-auto pr-1">
                          {selectedQuery.responses?.length ? (
                            selectedQuery.responses.map((response) => (
                              <div key={response.id} className="border rounded-lg p-2">
                                <p className="text-sm text-gray-700">{response.responseText}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {response.doctor?.user?.name || "Doctor"} •{" "}
                                  {response.doctor?.specialty || "Specialist"}
                                </p>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500">No doctor responses yet.</p>
                          )}
                        </div>
                      </div>

                      {selectedQueryEditable && (
                        <form onSubmit={handleUpdateQuery} className="mt-5 space-y-3">
                          <h4 className="font-medium">Edit Query</h4>
                          <input
                            type="text"
                            value={queryForm.title}
                            onChange={(e) =>
                              setQueryForm((prev) => ({
                                ...prev,
                                title: e.target.value,
                              }))
                            }
                            className="w-full border rounded-lg p-2 text-sm"
                            required
                          />
                          <textarea
                            value={queryForm.symptomText}
                            onChange={(e) =>
                              setQueryForm((prev) => ({
                                ...prev,
                                symptomText: e.target.value,
                              }))
                            }
                            className="w-full border rounded-lg p-2 text-sm"
                            rows={4}
                          />
                          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={queryForm.isAnonymous}
                              onChange={(e) =>
                                setQueryForm((prev) => ({
                                  ...prev,
                                  isAnonymous: e.target.checked,
                                }))
                              }
                            />
                            Anonymous query
                          </label>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="submit"
                              className="px-4 py-2 bg-primary text-white rounded-lg"
                            >
                              Save Changes
                            </button>
                            <button
                              type="button"
                              onClick={handleCloseQuery}
                              className="px-4 py-2 border border-emerald-300 text-emerald-700 rounded-lg"
                            >
                              Mark Resolved
                            </button>
                            <button
                              type="button"
                              onClick={handleDeleteQuery}
                              className="px-4 py-2 border border-rose-300 text-rose-700 rounded-lg"
                            >
                              Delete Query
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mt-3">
                      Select a query to view details and responses.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "medical" && (
            <div>
              <SectionTitle
                title="Medical History"
                description="Complete and recent medical records from completed consultations."
              />
              <div className="grid lg:grid-cols-2 gap-4">
                <div className="bg-white border rounded-xl p-4">
                  <h3 className="font-semibold">Full Medical History</h3>
                  <div className="mt-3 space-y-3 max-h-[460px] overflow-y-auto pr-1">
                    {medicalHistory.length ? (
                      medicalHistory.map((item) => (
                        <div key={item.id} className="border rounded-lg p-3">
                          <p className="font-medium">{item.doctor?.user?.name || "Doctor"}</p>
                          <p className="text-sm text-gray-600">{item.doctor?.specialty}</p>
                          <p className="text-sm mt-1 text-gray-800">
                            {item.consultationSummary?.diagnosis || "Diagnosis pending"}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDateTime(item.scheduledAt)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No history records found.</p>
                    )}
                  </div>
                </div>

                <div className="bg-white border rounded-xl p-4">
                  <h3 className="font-semibold">Recent Medical History</h3>
                  <div className="mt-3 space-y-3">
                    {quickActions.recentMedicalHistory?.length ? (
                      quickActions.recentMedicalHistory.map((item) => (
                        <div key={item.id} className="border rounded-lg p-3">
                          <p className="font-medium text-gray-900">
                            {item.consultationSummary?.diagnosis || "No diagnosis"}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Prescription: {item.consultationSummary?.prescription || "-"}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDateTime(item.scheduledAt)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No recent records available.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "iot" && (
            <div>
              <SectionTitle
                title="IoT Device Tests"
                description="Submit IoT test readings and monitor all recorded entries."
              />
              <div className="grid lg:grid-cols-2 gap-4">
                <div className="bg-white border rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <label className="text-sm text-gray-600">Type filter</label>
                    <select
                      className="border rounded-lg px-3 py-2 text-sm"
                      value={iotTypeFilter}
                      onChange={(e) => setIotTypeFilter(e.target.value)}
                    >
                      <option value="">all</option>
                      {IOT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                    {iotReadings.length ? (
                      iotReadings.map((item) => (
                        <div key={item.id} className="border rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{item.testType}</p>
                              <p className="text-sm text-gray-600">
                                Score: {formatNumber(item.resultScore)}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDateTime(item.recordedAt)}
                              </p>
                            </div>
                            <button
                              onClick={() => fetchReadingDetails(item.id)}
                              className="text-xs px-3 py-1.5 border rounded-md hover:border-primary"
                            >
                              Details
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No IoT readings found.</p>
                    )}
                  </div>

                  {selectedReading && (
                    <div className="mt-4 border-t pt-3">
                      <h4 className="font-medium">Selected Reading Details</h4>
                      <p className="text-sm mt-2 text-gray-700">
                        <span className="text-gray-500">Type:</span> {selectedReading.testType}
                      </p>
                      <p className="text-sm mt-1 text-gray-700">
                        <span className="text-gray-500">Score:</span>{" "}
                        {formatNumber(selectedReading.resultScore)}
                      </p>
                      <p className="text-sm mt-1 text-gray-700 whitespace-pre-wrap break-all">
                        <span className="text-gray-500">Sensor Data:</span>{" "}
                        {JSON.stringify(selectedReading.sensorData)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-white border rounded-xl p-4">
                  <h3 className="font-semibold">Submit IoT Test</h3>
                  <form onSubmit={handleSubmitIot} className="mt-3 space-y-3">
                    <select
                      className="w-full border rounded-lg p-2 text-sm"
                      value={iotForm.testType}
                      onChange={(e) =>
                        setIotForm((prev) => ({ ...prev, testType: e.target.value }))
                      }
                    >
                      {IOT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <textarea
                      value={iotForm.sensorData}
                      onChange={(e) =>
                        setIotForm((prev) => ({ ...prev, sensorData: e.target.value }))
                      }
                      rows={6}
                      className="w-full border rounded-lg p-2 text-sm font-mono"
                      placeholder='{"systolic":120,"diastolic":80}'
                      required
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={iotForm.resultScore}
                      onChange={(e) =>
                        setIotForm((prev) => ({
                          ...prev,
                          resultScore: e.target.value,
                        }))
                      }
                      className="w-full border rounded-lg p-2 text-sm"
                      placeholder="Result score (optional)"
                    />
                    <textarea
                      value={iotForm.notes}
                      onChange={(e) =>
                        setIotForm((prev) => ({ ...prev, notes: e.target.value }))
                      }
                      rows={3}
                      className="w-full border rounded-lg p-2 text-sm"
                      placeholder="Notes (optional)"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary text-white rounded-lg"
                    >
                      Submit Reading
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {activeTab === "doctors" && (
            <div>
              <SectionTitle
                title="Available Doctors"
                description="Discover verified and available doctors for appointment booking."
              />
              <div className="bg-white border rounded-xl p-4">
                <div className="flex flex-wrap gap-2 items-center mb-4">
                  <input
                    type="text"
                    value={doctorSpecialtyFilter}
                    onChange={(e) => setDoctorSpecialtyFilter(e.target.value)}
                    className="border rounded-lg p-2 text-sm min-w-[220px]"
                    placeholder="Filter by specialty"
                  />
                  <button
                    onClick={refreshDoctors}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
                  >
                    Apply Filter
                  </button>
                </div>

                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {doctorItems.length ? (
                    doctorItems.map((doctor) => (
                      <div key={doctor.id} className="border rounded-xl p-4">
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
                            onClick={() => fetchDoctorDetails(doctor.id)}
                            className="text-xs px-3 py-1.5 border rounded-md hover:border-primary"
                          >
                            Profile
                          </button>
                          <button
                            onClick={() =>
                              navigate(`/patient-portal/book-appointment?doctorId=${doctor.id}`)
                            }
                            className="text-xs px-3 py-1.5 bg-primary text-white rounded-md"
                          >
                            Book
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No doctors found.</p>
                  )}
                </div>

                {selectedDoctor && (
                  <div className="mt-5 border-t pt-4">
                    <h3 className="font-semibold">Doctor Profile</h3>
                    <p className="text-sm mt-2 text-gray-700">
                      <span className="text-gray-500">Name:</span>{" "}
                      {selectedDoctor.user?.name || "Doctor"}
                    </p>
                    <p className="text-sm mt-1 text-gray-700">
                      <span className="text-gray-500">Specialty:</span>{" "}
                      {selectedDoctor.specialty || "-"}
                    </p>
                    <p className="text-sm mt-1 text-gray-700">
                      <span className="text-gray-500">Bio:</span> {selectedDoctor.bio || "-"}
                    </p>
                    <p className="text-sm mt-1 text-gray-700">
                      <span className="text-gray-500">Qualifications:</span>{" "}
                      {selectedDoctor.qualifications || "-"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PatientPortal;
