import { useState } from "react";
import { createContext } from "react";
import axios from "axios";
import { toast } from "react-toastify";
export const AdminContext = createContext();

export const AdminContextProvider = ({ children }) => {
  const [aToken, setAToken] = useState(localStorage.getItem("aToken") || "");
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [dashData, setDashData] = useState(false);

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const getAllDoctors = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/admin/all-doctors", {
        headers: {
          Authorization: `Bearer ${aToken}`,
        },
      });
      if (data.success) {
        setDoctors(data.doctors);
        // console.log(data.doctors);

        toast.success(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch doctors");
    }
  };

  const changeAvailability = async (docId) => {
    try {
      const { data } = await axios.post(
        backendUrl + "/api/admin/change-availability",
        { docId },
        { headers: { Authorization: `Bearer ${aToken}` } }
      );
      if (data.success) {
        toast.success(data.message);
        getAllDoctors();
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to change availability"
      );
    }
  };

  const getAllAppointments = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/admin/appointments", {
        headers: { Authorization: `Bearer ${aToken}` },
      });

      if (data.success) {
        setAppointments(data.appointments);
        // console.log(data.appointments);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "An error occurred");
    }
  };

  const cancelAppointment = async (appointmentId) => {
    try {
      const { data } = await axios.post(
        backendUrl + "/api/admin/cancel-appointment",
        { appointmentId },
        { headers: { Authorization: `Bearer ${aToken}` } }
      );

      if (data.success) {
        toast.success(data.message);
        getAllAppointments();
        getDashData();
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to cancel appointment"
      );
    }
  };

  const getDashData = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/admin/dashboard", {
        headers: { Authorization: `Bearer ${aToken}` },
      });

      if (data.success) {
        setDashData(data.dashData);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to load Dashboard data"
      );
    }
  };

  const [users, setUsers] = useState([]);

  const getAllUsers = async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/admin/all-users", {
        headers: { Authorization: `Bearer ${aToken}` },
      });
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch users");
    }
  };

  const addUser = async (userData) => {
    try {
      const { data } = await axios.post(
        backendUrl + "/api/admin/add-user",
        userData,
        { headers: { Authorization: `Bearer ${aToken}` } }
      );
      if (data.success) {
        toast.success(data.message);
        getAllUsers();
        return true;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add user");
      return false;
    }
  };

  const updateUser = async (userId, updateData) => {
    try {
      const { data } = await axios.put(
        backendUrl + `/api/admin/update-user/${userId}`,
        updateData,
        { headers: { Authorization: `Bearer ${aToken}` } }
      );
      if (data.success) {
        toast.success(data.message);
        getAllUsers();
        return true;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update user");
      return false;
    }
  };

  const deleteUser = async (userId) => {
    try {
      const { data } = await axios.delete(
        backendUrl + `/api/admin/delete-user/${userId}`,
        { headers: { Authorization: `Bearer ${aToken}` } }
      );
      if (data.success) {
        toast.success(data.message);
        getAllUsers();
        return true;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete user");
      return false;
    }
  };

  const verifyDoctor = async (doctorId, status) => {
    try {
      const { data } = await axios.post(
        backendUrl + "/api/admin/verify-doctor",
        { doctorId, status },
        { headers: { Authorization: `Bearer ${aToken}` } }
      );
      if (data.success) {
        toast.success(data.message);
        setDoctors((prev) =>
          prev.map((doctor) =>
            doctor.id === doctorId
              ? {
                  ...doctor,
                  is_verified: status === "verified",
                  verification_status: status,
                  users: doctor.users
                    ? { ...doctor.users, is_active: status === "verified" }
                    : doctor.users,
                }
              : doctor
          )
        );
        await getAllDoctors(); // Refresh doctors list
        await getAllUsers(); // Refresh users list (since is_active changed)
        return true;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to verify doctor");
      return false;
    }
  };

  const value = {
    aToken,
    setAToken,
    backendUrl,
    doctors,
    getAllDoctors,
    changeAvailability,
    appointments,
    setAppointments,
    getAllAppointments,
    cancelAppointment,
    dashData,
    getDashData,
    users,
    getAllUsers,
    addUser,
    updateUser,
    deleteUser,
    verifyDoctor,
  };
  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
};
