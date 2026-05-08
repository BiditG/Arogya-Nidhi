import axios from "axios";
import { useEffect, useState } from "react";
import { createContext } from "react";
import { toast } from "react-toastify";
import { supabase } from "../lib/supabaseClient";

export const DoctorContext = createContext();

export const DoctorContextProvider = ({ children }) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [dToken, setDToken] = useState(localStorage.getItem("dToken") || "");
  const [appointments, setAppointments] = useState([]);
  const [dashData, setDashData] = useState(false);
  const [profileData, setProfileData] = useState(false);

  const persistDoctorToken = (token) => {
    if (token) {
      localStorage.setItem("dToken", token);
      setDToken(token);
      return;
    }
    localStorage.removeItem("dToken");
    setDToken("");
  };

  const getDoctorAuthHeaders = () => {
    if (!dToken) return {};
    return {
      Authorization: `Bearer ${dToken}`,
      dtoken: dToken,
    };
  };

  const handleDoctorAuthError = (error) => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message || "";
    const isAuthError = status === 401 || /invalid|expired|token/i.test(message);

    if (isAuthError) {
      persistDoctorToken("");
      setAppointments([]);
      setDashData(false);
      setProfileData(false);
      toast.error("Session expired. Please login again.");
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (!supabase) return undefined;

    let mounted = true;

    const syncSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted || error) return;

      const session = data?.session;
      const role = session?.user?.user_metadata?.role;
      if (role === "doctor" && session?.access_token) {
        persistDoctorToken(session.access_token);
      }
    };

    syncSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const role = session?.user?.user_metadata?.role;
      if (role === "doctor" && session?.access_token) {
        persistDoctorToken(session.access_token);
      }
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const getAppointments = async () => {
    try {
      const { data } = await axios.get(
        backendUrl + "/api/doctor/appointments",
        { headers: getDoctorAuthHeaders() }
      );
      setAppointments(data.reverse());
    } catch (error) {
      if (handleDoctorAuthError(error)) return;
      toast.error(
        error.response?.data?.message || "Failed to fetch appointments"
      );
    }
  };

  const completeAppointment = async (appointmentId) => {
    try {
      const { data } = await axios.post(
        backendUrl + "/api/doctor/complete-appointment",
        { appointmentId },
        { headers: getDoctorAuthHeaders() }
      );

      if (data.success) {
        toast.success(data.message);
        getAppointments();
        getDashData();
      }
    } catch (error) {
      if (handleDoctorAuthError(error)) return;
      toast.error(
        error.response?.data?.message || "Failed to complete appointment"
      );
    }
  };

  const cancelAppointment = async (appointmentId) => {
    try {
      const { data } = await axios.post(
        backendUrl + "/api/doctor/cancel-appointment",
        { appointmentId },
        { headers: getDoctorAuthHeaders() }
      );

      if (data.success) {
        toast.success(data.message);
        getAppointments();
        getDashData();
      }
    } catch (error) {
      if (handleDoctorAuthError(error)) return;
      toast.error(
        error.response?.data?.message || "Failed to cancel appointments"
      );
    }
  };

  const getDashData = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/doctor/dashboard", {
        headers: getDoctorAuthHeaders(),
      });

      if (data.success) {
        setDashData(data.dashData);
      }
    } catch (error) {
      if (handleDoctorAuthError(error)) return;
      toast.error(
        error.response?.data?.message || "Failed to cancel appointments"
      );
    }
  };

  const getProfileData = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/doctor/profile", {
        headers: getDoctorAuthHeaders(),
      });

      if (data.success) {
        setProfileData(data.profileData || data.profile);
      }
    } catch (error) {
      if (handleDoctorAuthError(error)) return;
      toast.error(
        error.response?.data?.message || "Failed to cancel appointments"
      );
    }
  };

  const value = {
    dToken,
    setDToken: persistDoctorToken,
    appointments,
    getAppointments,
    completeAppointment,
    cancelAppointment,
    dashData,
    getDashData,
    profileData,
    setProfileData,
    getProfileData,
  };
  return (
    <DoctorContext.Provider value={value}>{children}</DoctorContext.Provider>
  );
};
