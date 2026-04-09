import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
<<<<<<< HEAD
import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
=======
>>>>>>> 81581cf1f1068226d743a0c9a01fcd5d18077ffe

export const AppContext = createContext();

const AppContextProvider = (props) => {
  const currencySymbol = "$";
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [doctors, setDoctors] = useState([]);

  const [token, setToken] = useState(localStorage.getItem("token") || false);
  const [userData, setUserData] = useState(false);

  const getDoctorsData = useCallback(async () => {
    try {
      if (supabase) {
        // Fetch doctor profiles directly from Supabase
        const { data, error } = await supabase
          .from("doctor_profiles")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Map DB rows to the shape expected by frontend components
        const mapped = (data || []).map((r) => ({
          _id: r.id,
          id: r.id,
          user_id: r.user_id,
          license_no: r.license_no,
          name: r.name || r.license_no || `Dr ${r.id?.slice(0, 8)}`,
          // frontend expects `speciality` (British spelling)
          speciality: r.specialty || r.sub_specialty || "General",
          specialty: r.specialty,
          sub_speciality: r.sub_specialty,
          consultation_fee: r.consultation_fee,
          qualifications: r.qualifications,
          is_verified: r.is_verified,
          available: !!r.is_available,
          // keep original boolean as well
          is_available: !!r.is_available,
          created_at: r.created_at,
          updated_at: r.updated_at,
          // placeholder image if none
          image: r.image || "/images/doctor-placeholder.png",
        }));

        setDoctors(mapped);
        return;
      }

      // Fallback: use backend API
      const { data } = await axios.get(backendUrl + "/api/doctor/list");
      if (data?.success) {
        setDoctors(data.doctors);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || "Failed to fetch doctors");
    }
  }, [backendUrl]);

  const loadUserProfileData = useCallback(async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/patient/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setUserData(data.data);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load user profile"
      );
    }
  }, [backendUrl, token]);

  useEffect(() => {
    getDoctorsData();
  }, [getDoctorsData]);

  useEffect(() => {
    if (token) {
      loadUserProfileData();
    } else {
      setUserData(false);
    }
  }, [token, loadUserProfileData]);

  const value = useMemo(
    () => ({
      doctors,
      currencySymbol,
      backendUrl,
      token,
      setToken,
      userData,
      setUserData,
      loadUserProfileData,
      getDoctorsData,
    }),
    [
      doctors,
      currencySymbol,
      backendUrl,
      token,
      userData,
      loadUserProfileData,
      getDoctorsData,
    ]
  );

  return (
    <AppContext.Provider value={value}>{props.children}</AppContext.Provider>
  );
};

export default AppContextProvider;
