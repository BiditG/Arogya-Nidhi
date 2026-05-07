import { useEffect, useState } from "react";

export const LANGUAGE_STORAGE_KEY = "arogyanidhi-language";
export const LANGUAGE_CHANGE_EVENT = "arogyanidhi-language-change";

export const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "ne", label: "Nepali" },
];

export const getSavedLanguage = () => {
  if (typeof window === "undefined") return "en";
  const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return savedLanguage === "ne" ? "ne" : "en";
};

export const setSavedLanguage = (language) => {
  const nextLanguage = language === "ne" ? "ne" : "en";
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    window.dispatchEvent(new CustomEvent(LANGUAGE_CHANGE_EVENT, { detail: nextLanguage }));
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = nextLanguage;
  }
  return nextLanguage;
};

export const useLanguage = () => {
  const [language, setLanguageState] = useState(getSavedLanguage);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
    }
  }, [language]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleLanguageChange = (event) => {
      setLanguageState(event.detail === "ne" ? "ne" : "en");
    };
    const handleStorage = (event) => {
      if (event.key === LANGUAGE_STORAGE_KEY) {
        setLanguageState(event.newValue === "ne" ? "ne" : "en");
      }
    };

    window.addEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(LANGUAGE_CHANGE_EVENT, handleLanguageChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const setLanguage = (languageValue) => {
    setLanguageState(setSavedLanguage(languageValue));
  };

  return [language, setLanguage];
};
