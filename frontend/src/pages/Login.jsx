import { useContext } from "react";
import { useState } from "react";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

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
  const [institution, setInstitution] = useState("");
  const [faculty, setFaculty] = useState("");
  const [nmcLicenseNo, setNmcLicenseNo] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [subSpecialty, setSubSpecialty] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [loading, setLoading] = useState(false);

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
        } else if (role === 'student') {
          payload.institution = institution;
          payload.faculty = faculty;
        } else if (role === 'doctor') {
          payload.nmcLicenseNo = nmcLicenseNo;
          payload.specialty = specialty;
          payload.subSpecialty = subSpecialty;
          payload.qualifications = qualifications;
        }

        try {
          const { data } = await axios.post(backendUrl + "/api/auth/register", payload);
          if (data?.success) {
            const accessToken = data.data?.accessToken || data.data?.access_token || data.data?.accessToken;
            if (accessToken) {
              localStorage.setItem("token", accessToken);
              setToken(accessToken);
            }
            // Refresh doctor list immediately for newly-registered doctors
            if (role === 'doctor' && typeof getDoctorsData === 'function') {
              try { getDoctorsData(); } catch (_) {}
            }
            toast.success("Account created successfully");
            if (role === 'doctor') navigate('/doctor-portal');
            else if (role === 'student') navigate('/student-portal');
            else if (role === 'admin') navigate('/admin-portal');
            else navigate('/patient-portal');
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

        // For doctors, obtain the backend JWT via backend doctor login endpoint
        if (loggedRole === 'doctor') {
          try {
            const { data } = await axios.post(backendUrl + '/api/doctor/login', { email, password });
            if (data?.success && data?.token) {
              localStorage.setItem('token', data.token);
              setToken(data.token);
            } else {
              // fallback to Supabase token if backend login didn't return JWT
              localStorage.setItem('token', accessToken);
              setToken(accessToken);
            }
          } catch (err) {
            // fallback: keep Supabase token
            localStorage.setItem('token', accessToken);
            setToken(accessToken);
          }
        } else {
          localStorage.setItem("token", accessToken);
          setToken(accessToken);
        }

        toast.success("Logged in successfully!");
        if (loggedRole === 'doctor') navigate('/doctor-portal');
        else if (loggedRole === 'student') navigate('/student-portal');
        else if (loggedRole === 'admin') navigate('/admin-portal');
        else navigate('/patient-portal');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && userData) {
      if (userData.user?.role === 'patient' || userData.role === 'patient') navigate("/patient-portal");
      else navigate("/");
    }
  }, [token, userData]);

  return (
    <form
      onSubmit={onSubmitHandler}
      className="min-h-[80vh] flex flex-col items-center"
    >
      {/* <div className="flex flex-col items-center w-full"> */}
      <div className="flex flex-col gap-3 m-auto items-start p-8 min-w-[340] sm:min-w-96 border rounded-xl text-zinc-600 text-sm shadow-lg">
        <p className="text-2xl font-semibold">
          {state === "Sign Up" ? "Create Account" : "Login"}
        </p>
        <div className="w-full">
          <p className="mb-2">Role</p>
          <div className="flex gap-2">
            {['patient','student','doctor','admin'].map(r => (
              <button
                type="button"
                key={r}
                onClick={() => setRole(r)}
                className={`px-3 py-1 rounded ${role===r? 'bg-primary text-white' : 'bg-gray-100 text-zinc-700'}`}
              >
                {r.charAt(0).toUpperCase()+r.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <p>
          Please {state === "Sign Up" ? "sign up" : "log in"} to book
          appointment!
        </p>
        {state === "Sign Up" && (
          <div className="w-full">
            <p>Full Name</p>
            <input
              className="border border-zinc-300 rounded w-full p-2 mt-1"
              type="text"
              onChange={(e) => setName(e.target.value)}
              value={name}
              required
            />
          </div>
        )}
        {state === "Sign Up" && role === 'patient' && (
          <div className="w-full">
            <p>Date of Birth</p>
            <input className="border border-zinc-300 rounded w-full p-2 mt-1" type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
            <p className="mt-2">Blood Group</p>
            <input className="border border-zinc-300 rounded w-full p-2 mt-1" value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} />
            <p className="mt-2">Gender</p>
            <select className="border border-zinc-300 rounded w-full p-2 mt-1" value={gender} onChange={e => setGender(e.target.value)}>
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        )}
        {state === "Sign Up" && role === 'student' && (
          <div className="w-full">
            <p>Institution</p>
            <input className="border border-zinc-300 rounded w-full p-2 mt-1" value={institution} onChange={e => setInstitution(e.target.value)} />
            <p className="mt-2">Faculty</p>
            <input className="border border-zinc-300 rounded w-full p-2 mt-1" value={faculty} onChange={e => setFaculty(e.target.value)} />
          </div>
        )}
        {state === "Sign Up" && role === 'doctor' && (
          <div className="w-full">
            <p>NMC License No</p>
            <input className="border border-zinc-300 rounded w-full p-2 mt-1" value={nmcLicenseNo} onChange={e => setNmcLicenseNo(e.target.value)} />
            <p className="mt-2">Specialty</p>
            <input className="border border-zinc-300 rounded w-full p-2 mt-1" value={specialty} onChange={e => setSpecialty(e.target.value)} />
            <p className="mt-2">Sub Specialty</p>
            <input className="border border-zinc-300 rounded w-full p-2 mt-1" value={subSpecialty} onChange={e => setSubSpecialty(e.target.value)} />
            <p className="mt-2">Qualifications</p>
            <textarea className="border border-zinc-300 rounded w-full p-2 mt-1" value={qualifications} onChange={e => setQualifications(e.target.value)} />
          </div>
        )}
        <div className="w-full">
          <p>Email</p>
          <input
            className="border border-zinc-300 rounded w-full p-2 mt-1"
            type="email"
            onChange={(e) => setEmail(e.target.value)}
            value={email}
            required
            disabled={loading}
          />
        </div>

        <div className="w-full">
          <p>Password</p>
          <input
            className="border border-zinc-300 rounded w-full p-2 mt-1"
            type="password"
            onChange={(e) => setPassword(e.target.value)}
            value={password}
            required
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          className="bg-primary text-white w-full py-2 rounded-md text-base flex items-center justify-center gap-2"
          disabled={loading}
        >
          {loading && (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
          )}
          <span>{state === "Sign Up" ? (loading ? "Creating..." : "Create Account") : (loading ? "Logging in..." : "Login")}</span>
        </button>
        {state === "Sign Up" ? (
          <p>
            Already have an account?{" "}
            <span
              onClick={() => setState("Login")}
              className="text-primary underline cursor-pointer"
            >
              Login here
            </span>
          </p>
        ) : (
          <p>
            Don't have an account?{" "}
            <span
              onClick={() => setState("Sign Up")}
              className="text-primary underline cursor-pointer"
            >
              Sign-up here
            </span>
          </p>
        )}
      </div>
      {/* ----- ADMIN PORTAL LOGIN LINK ----- */}
      <p className="mt-10 text-zinc-600 text-center w-full">
        Are you a Doctor or Admin?{" "}
        <a
          href="http://localhost:5174/"
          className="text-primary underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Login here
        </a>
      </p>
      {/* </div> */}
    </form>
  );
};

export default Login;
