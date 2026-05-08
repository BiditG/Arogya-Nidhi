import { createContext } from "react";

export const AppContext = createContext();

export const AppContextProvider = ({ children }) => {
  const currencySymbol = "$";
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const calculateAge = (dob) => {
    const today = new Date();
    const birthDate = new Date(dob);

    let age = today.getFullYear() - birthDate.getFullYear();

    return age;
  };

  const formatDateString = (dateStr) => {
    const [day, month, year] = dateStr.split("_");
    const date = new Date(`${year}-${month}-${day}`);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const value = {
    currencySymbol,
    backendUrl,
    calculateAge,
    formatDateString,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
