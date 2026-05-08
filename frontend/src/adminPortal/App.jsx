import { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import NotAuthorized from "./pages/auth/NotAuthorized";
import NotFound from "./pages/auth/NotFound";

import { AdminContext, AdminContextProvider } from "./context/AdminContext";
import { DoctorContextProvider, DoctorContext } from "./context/DoctorContext";
import { AppContextProvider } from "./context/AppContext";

import AdminLayout from "./layouts/AdminLayout";
import DoctorLayout from "./layouts/DoctorLayout";

const AdminPortalRoutes = () => {
  const { aToken } = useContext(AdminContext);
  const { dToken } = useContext(DoctorContext);

  const isAdmin = !!aToken;
  const isDoctor = !!dToken;

  return (
    <Routes>
      <Route
        index
        element={
          isAdmin ? (
            <Navigate to="/admin-portal/admin/dashboard" replace />
          ) : isDoctor ? (
            <Navigate to="/admin-portal/doctor/dashboard" replace />
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
            <Navigate to="/admin-portal" replace />
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
            <Navigate to="/admin-portal" replace />
          )
        }
      />

      {/* Catch-All */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <AdminContextProvider>
    <DoctorContextProvider>
      <AppContextProvider>
        <AdminPortalRoutes />
      </AppContextProvider>
    </DoctorContextProvider>
  </AdminContextProvider>
);

export default App;
