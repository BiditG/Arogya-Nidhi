import { useContext } from "react";
import { useState } from "react";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { getDashboardPathForRole, getUserRole } from "../utils/roleDashboard";

const Login = () => {
  const { backendUrl, setToken, token, userData, getDoctorsData } = useContext(AppContext);
  const navigate = useNavigate();
  const [state, setState] = useState("Login");
  const [role, setRole] = useState("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [gender, setGender] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [allergies, setAllergies] = useState("");
  const [institution, setInstitution] = useState("");
  const [faculty, setFaculty] = useState("");
  const [nmcLicenseNo, setNmcLicenseNo] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [subSpecialty, setSubSpecialty] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [experience, setExperience] = useState("");
  const [consultationFee, setConsultationFee] = useState("");
  const [loading, setLoading] = useState(false);
  const roles = ["patient", "student", "doctor", "admin"];
  const inputClass = "mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-gray-50 disabled:text-gray-400";
  const labelClass = "text-xs font-semibold uppercase tracking-wide text-gray-500";

  const syncPortalTokenForRole = (nextRole, accessToken) => {
    const normalizedRole = String(nextRole || "").toLowerCase();

    localStorage.removeItem("aToken");
    localStorage.removeItem("dToken");

    if (normalizedRole === "admin") {
      localStorage.setItem("aToken", accessToken);
    } else if (normalizedRole === "doctor") {
      localStorage.setItem("dToken", accessToken);
    }
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use Supabase auth only. Backend will accept Supabase tokens via middleware.
      if (!supabase) {
        toast.error("Supabase is not configured");
        return;
      }

      if (state === "Sign Up") {
        // Register via backend to create local user and role-specific profile immediately
        const payload = { email, password, role, name };
        if (role === 'patient') {
          payload.dateOfBirth = dateOfBirth;
          payload.bloodGroup = bloodGroup;
          payload.gender = gender;
          payload.medicalHistory = medicalHistory;
          payload.allergies = allergies;
        } else if (role === 'student') {
          payload.institution = institution;
          payload.faculty = faculty;
        } else if (role === 'doctor') {
          payload.nmcLicenseNo = nmcLicenseNo;
          payload.specialty = specialty;
          payload.subSpecialty = subSpecialty;
          payload.qualifications = qualifications;
          payload.experienceYears = experience ? parseInt(experience) : 0;
          payload.consultationFee = consultationFee ? parseFloat(consultationFee) : 0;
        }

        try {
          const { data } = await axios.post(backendUrl + "/api/auth/register", payload);
          if (data?.success) {
            const accessToken = data.data?.accessToken || data.data?.access_token || data.data?.accessToken;
            if (accessToken) {
              localStorage.setItem("token", accessToken);
              syncPortalTokenForRole(role, accessToken);
              setToken(accessToken);
            }
            // Refresh doctor list immediately for newly-registered doctors
            if (role === 'doctor' && typeof getDoctorsData === 'function') {
              try { getDoctorsData(); } catch (_) {}
            }
            toast.success("Account created successfully");
            navigate(getDashboardPathForRole(role), { replace: true });
          } else {
            toast.error(data?.message || "Failed to create account");
          }
        } catch (err) {
          toast.error(err.response?.data?.message || err.message || "Registration failed");
        }
        } else {
        const { data: sData, error: sError } = await supabase.auth.signInWithPassword({ email, password });
        if (sError) {
          toast.error(sError.message || "Login failed");
          setLoading(false);
          return;
        }

        const accessToken = sData?.session?.access_token;
        if (!accessToken) {
          toast.error("Login failed: no access token received");
          setLoading(false);
          return;
        }

        const loggedRole = sData?.user?.user_metadata?.role || 'patient';

        setToken(accessToken);
        syncPortalTokenForRole(loggedRole, accessToken);

        toast.success("Logged in successfully!");
        navigate(getDashboardPathForRole(loggedRole), { replace: true });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && userData) {
      navigate(getDashboardPathForRole(getUserRole(userData)), { replace: true });
    }
  }, [navigate, token, userData]);

  return (
    <main className="min-h-[calc(100vh-140px)] bg-gray-50/70 px-4 pb-10 pt-28 sm:px-6 sm:pt-32 lg:px-12">
      <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl shadow-primary/10 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="hidden bg-[#3b82f6] px-10 py-12 text-white lg:flex lg:items-center lg:justify-center">
          <div className="max-w-md text-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60">
                ArogyaNidhi Access
              </p>
              <h1 className="mt-4 text-4xl font-bold leading-tight">
                Book care, manage records, and stay connected.
              </h1>
              <p className="mt-5 text-sm leading-7 text-white/75">
                Sign in to continue to your healthcare dashboard, appointments, and role-specific tools.
              </p>
            </div>
          </div>

        </section>

        <form onSubmit={onSubmitHandler} className="flex flex-col px-5 py-8 sm:px-10 lg:px-12">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                Secure Portal
              </p>
              <h2 className="mt-2 text-3xl font-bold text-gray-900">
                {state === "Sign Up" ? "Create Account" : "Welcome back"}
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Please {state === "Sign Up" ? "sign up" : "log in"} to book appointments and manage your care.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <p className={labelClass}>Role</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {roles.map((r) => (
                  <button
                    type="button"
                    key={r}
                    onClick={() => setRole(r)}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
                      role === r
                        ? "border-primary bg-primary text-white shadow-md shadow-primary/20"
                        : "border-gray-200 bg-gray-50 text-gray-600 hover:border-primary/40 hover:bg-primary/5"
                    }`}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {state === "Sign Up" && (
              <div>
                <p className={labelClass}>Full Name</p>
                <input className={inputClass} type="text" onChange={(e) => setName(e.target.value)} value={name} required />
              </div>
            )}

            {state === "Sign Up" && role === "patient" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className={labelClass}>Date of Birth</p>
                  <input className={inputClass} type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
                </div>
                <div>
                  <p className={labelClass}>Blood Group</p>
                  <select className={inputClass} value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <p className={labelClass}>Gender</p>
                  <select className={inputClass} value={gender} onChange={(e) => setGender(e.target.value)}>
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <p className={labelClass}>Medical History</p>
                  <textarea className={`${inputClass} min-h-24 resize-none`} placeholder="E.g. Diabetes, Hypertension" value={medicalHistory} onChange={(e) => setMedicalHistory(e.target.value)} />
                </div>
                <div>
                  <p className={labelClass}>Allergies</p>
                  <textarea className={`${inputClass} min-h-24 resize-none`} placeholder="E.g. Penicillin, Peanuts" value={allergies} onChange={(e) => setAllergies(e.target.value)} />
                </div>
              </div>
            )}

            {state === "Sign Up" && role === "student" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className={labelClass}>Institution</p>
                  <input className={inputClass} value={institution} onChange={(e) => setInstitution(e.target.value)} />
                </div>
                <div>
                  <p className={labelClass}>Faculty</p>
                  <input className={inputClass} value={faculty} onChange={(e) => setFaculty(e.target.value)} />
                </div>
              </div>
            )}

            {state === "Sign Up" && role === "doctor" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className={labelClass}>NMC License No</p>
                  <input className={inputClass} value={nmcLicenseNo} onChange={(e) => setNmcLicenseNo(e.target.value)} />
                </div>
                <div>
                  <p className={labelClass}>Specialty</p>
                  <input className={inputClass} value={specialty} onChange={(e) => setSpecialty(e.target.value)} />
                </div>
                <div>
                  <p className={labelClass}>Sub Specialty</p>
                  <input className={inputClass} value={subSpecialty} onChange={(e) => setSubSpecialty(e.target.value)} />
                </div>
                <div>
                  <p className={labelClass}>Qualifications</p>
                  <textarea className={`${inputClass} min-h-24 resize-none`} value={qualifications} onChange={(e) => setQualifications(e.target.value)} />
                </div>
                <div>
                  <p className={labelClass}>Experience (Yrs)</p>
                  <input type="number" className={inputClass} value={experience} onChange={(e) => setExperience(e.target.value)} />
                </div>
                <div>
                  <p className={labelClass}>Fee (NPR)</p>
                  <input type="number" className={inputClass} value={consultationFee} onChange={(e) => setConsultationFee(e.target.value)} />
                </div>
              </div>
            )}

            <div className="grid gap-4">
              <div>
                <p className={labelClass}>Email</p>
                <input className={inputClass} type="email" onChange={(e) => setEmail(e.target.value)} value={email} required disabled={loading} />
              </div>
              <div>
                <p className={labelClass}>Password</p>
                <input className={inputClass} type="password" onChange={(e) => setPassword(e.target.value)} value={password} required disabled={loading} />
              </div>
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-base font-semibold text-white shadow-lg shadow-primary/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={loading}
            >
              {loading && (
                <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
              )}
              <span>{state === "Sign Up" ? (loading ? "Creating..." : "Create Account") : (loading ? "Logging in..." : "Login")}</span>
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-5 text-center text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:text-left">
            {state === "Sign Up" ? (
              <p>
                Already have an account?{" "}
                <button type="button" onClick={() => setState("Login")} className="font-semibold text-primary underline underline-offset-2">
                  Login here
                </button>
              </p>
            ) : (
              <p>
                Don't have an account?{" "}
                <button type="button" onClick={() => setState("Sign Up")} className="font-semibold text-primary underline underline-offset-2">
                  Sign-up here
                </button>
              </p>
            )}

            <p>Use this same login for patients, students, doctors, and admins.</p>
          </div>
        </form>
      </div>
    </main>
  );
};

export default Login;
