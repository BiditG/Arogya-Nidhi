import { useState } from "react";
import { assets } from "../../assets/assets";
import { useContext } from "react";
import { AdminContext } from "../../context/AdminContext";
import { toast } from "react-toastify";
import { DoctorContext } from "../../context/DoctorContext";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [state, setState] = useState("Admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const { setAToken } = useContext(AdminContext);
  const { setDToken } = useContext(DoctorContext);

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    try {
      if (!supabase) {
        toast.error("Supabase is not configured for admin portal");
        return;
      }

      const { data: sData, error: sError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (sError) {
        toast.error(sError.message || "Login failed");
        return;
      }

      const accessToken = sData?.session?.access_token;
      if (!accessToken) {
        toast.error("Login failed: no access token received");
        return;
      }

      const actualRole = (sData?.user?.user_metadata?.role || state).toLowerCase();

      if (actualRole === "admin") {
        localStorage.setItem("aToken", accessToken);
        localStorage.removeItem("dToken");
        setAToken(accessToken);
        setDToken("");
        toast.success("Admin logged in successfully");
        navigate("/admin-portal/admin/dashboard", { replace: true });
      } else if (actualRole === "doctor") {
        localStorage.removeItem("aToken");
        setAToken("");
        setDToken(accessToken);
        toast.success("Doctor logged in successfully");
        navigate("/admin-portal/doctor/dashboard", { replace: true });
      } else {
        toast.error("This portal is only for admins and doctors");
      }
    } catch (error) {
      toast.error(error.message || "Invalid credentials");
    }
  };

  return (
    <form onSubmit={onSubmitHandler} className="min-h-[80vh] flex items-center">
      <div className="flex flex-col gap-3 m-auto items-start p-8 min-w-[340px] sm:min-w-96 border border-gray-100 rounded-xl text-[#5E5E5E] text-sm shadow-lg">
        <p className="text-2xl font-semibold m-auto">
          <span className="text-primary">{state}</span> Login
        </p>
        <div className="w-full">
          <p>Email</p>
          <input
            className="border border-[#DADADA] rounded w-full p-2 mt-1"
            onChange={(e) => setEmail(e.target.value)}
            value={email}
            type="email"
            required
          />
        </div>
        <div className="w-full">
          <p>Password</p>
          <input
            className="border border-[#DADADA] rounded w-full p-2 mt-1"
            onChange={(e) => setPassword(e.target.value)}
            value={password}
            type="password"
            required
          />
        </div>
        <button className="bg-primary text-white w-full py-2 rounded-md text-base cursor-pointer">
          Login
        </button>
        {state === "Admin" ? (
          <p className="text-xs text-gray-500 mt-2">
            Are you a Doctor?{" "}
            <span
              className="text-primary underline cursor-pointer"
              onClick={() => setState("Doctor")}
            >
              Click here
            </span>
          </p>
        ) : (
          <p className="text-xs text-gray-500 mt-2">
            Are you an Admin?{" "}
            <span
              className="text-primary underline cursor-pointer"
              onClick={() => setState("Admin")}
            >
              Click here
            </span>
          </p>
        )}
      </div>
    </form>
  );
};

export default Login;
