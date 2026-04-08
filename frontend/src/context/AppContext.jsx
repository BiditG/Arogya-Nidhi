import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export const AppContext = createContext();

const AppContextProvider = (props) => {
  const currencySymbol = "$";
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [doctors, setDoctors] = useState([]);

  const [token, setToken] = useState(localStorage.getItem("token") || false);
  const [userData, setUserData] = useState(false);

  const getDoctorsData = useCallback(async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/doctor/list");
      if (data.success) {
        setDoctors(data.doctors);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch doctors");
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
