import { useContext, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import NotAuthorized from "./pages/auth/NotAuthorized";
import NotFound from "./pages/auth/NotFound";

import { AdminContext } from "./context/AdminContext";
import { DoctorContext } from "./context/DoctorContext";
import { AppContext } from "../context/AppContext";
import { getUserRole } from "../utils/roleDashboard";

import AdminLayout from "./layouts/AdminLayout";
import DoctorLayout from "./layouts/DoctorLayout";

const App = () => {
  const { token, userData } = useContext(AppContext);
  const { aToken, setAToken } = useContext(AdminContext);
  const { dToken, setDToken } = useContext(DoctorContext);

  const mainRole = getUserRole(userData);

  useEffect(() => {
    if (!token || !userData) return;

    if (mainRole === "admin" && aToken !== token) {
      setAToken(token);
      localStorage.setItem("aToken", token);
      localStorage.removeItem("dToken");
      setDToken("");
    }

    if (mainRole === "doctor" && dToken !== token) {
      setDToken(token);
      localStorage.setItem("dToken", token);
      localStorage.removeItem("aToken");
      setAToken("");
    }
  }, [aToken, dToken, mainRole, setAToken, setDToken, token, userData]);

  const isAdmin = !!aToken;
  const isDoctor = !!dToken;
  const isLoadingMainSession = !!token && !userData && !isAdmin && !isDoctor;

  if (isLoadingMainSession) {
    return null;
  }

  return (
    <Routes>
      <Route
        index
        element={
          isAdmin ? (
            <Navigate to="admin/dashboard" />
          ) : isDoctor ? (
            <Navigate to="doctor/dashboard" />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Admin Routes */}
      <Route
        path="admin/*"
        element={
          isAdmin ? (
            <AdminLayout />
          ) : isDoctor ? (
            <NotAuthorized />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Doctor Routes */}
      <Route
        path="doctor/*"
        element={
          isDoctor ? (
            <DoctorLayout />
          ) : isAdmin ? (
            <NotAuthorized />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Catch-All */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;
