export const getUserRole = (userData) => {
  return (
    userData?.role ||
    userData?.user?.role ||
    userData?.user?.user_metadata?.role ||
    userData?.user_metadata?.role ||
    "patient"
  );
};

export const getDashboardPathForRole = (role) => {
  const normalizedRole = String(role || "patient").toLowerCase();

  if (normalizedRole === "doctor") return "/doctor-portal";
  if (normalizedRole === "student") return "/student-portal";
  if (normalizedRole === "admin") return "/admin-portal";

  return "/patient-portal";
};
