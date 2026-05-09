import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { supabase } from "../lib/supabaseClient";
import { assets as adminAssets } from "../assets/assets_admin/assets";

export const AppContext = createContext();

const SPECIALTY_DISPLAY_NAMES = {
  cardiology: "Cardiologist",
  cardiologist: "Cardiologist",
  neurology: "Neurologist",
  neurologist: "Neurologist",
  dermatology: "Dermatologist",
  dermatologist: "Dermatologist",
  orthopedics: "Orthopedic",
  orthopedic: "Orthopedic",
  orthopedist: "Orthopedic",
  pediatrics: "Pediatricians",
  pediatrician: "Pediatricians",
  pediatricians: "Pediatricians",
  general: "General physician",
  "general physician": "General physician",
  "general medicine": "General physician",
  physician: "General physician",
  gastroenterology: "Gastroenterologist",
  gastroenterologist: "Gastroenterologist",
  gynecology: "Gynecologist",
  gynecologist: "Gynecologist",
};

const normalizeSpecialtyLabel = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "General physician";
  const key = raw.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  return SPECIALTY_DISPLAY_NAMES[key] || raw;
};

const getDoctorUserRow = (row) => {
  const relation = row?.users || row?.user || row?.profile || null;
  return Array.isArray(relation) ? relation[0] || null : relation;
};

const getDoctorLocation = (row) => {
  const address = row?.address;
  if (!address) return row?.location || "";
  if (typeof address === "string") return address;
  return [address.city, address.state, address.country].filter(Boolean).join(", ");
};

const normalizeDoctorForCards = (row = {}) => {
  const userRow = getDoctorUserRow(row);
  const specialty = normalizeSpecialtyLabel(row.specialty || row.speciality || row.sub_specialty);
  const fee = Number(row.consultation_fee ?? row.consultationFee ?? row.fee ?? row.fees ?? 0) || 0;
  const experienceYears = row.experience_years ?? row.experienceYears ?? row.experience;

  return {
    ...row,
    _id: row._id || row.id,
    id: row.id || row._id,
    user_id: row.user_id || row.userId,
    license_no: row.license_no || row.licenseNo || row.nmc_license_no || row.nmcLicenseNo,
    name:
      row.name ||
      userRow?.name ||
      userRow?.email ||
      row.license_no ||
      row.nmc_license_no ||
      `Dr ${String(row.id || "").slice(0, 8)}`,
    speciality: specialty,
    specialty,
    sub_speciality: row.sub_specialty || row.subSpecialty || row.sub_speciality,
    consultation_fee: fee,
    consultationFee: fee,
    fee,
    qualifications: row.qualifications || row.degree,
    experience:
      experienceYears === undefined || experienceYears === null || experienceYears === ""
        ? row.experience
        : String(experienceYears).toLowerCase().includes("year")
          ? String(experienceYears)
          : `${experienceYears} years`,
    is_verified: row.is_verified ?? row.isVerified ?? false,
    available: Boolean(row.available ?? row.is_available ?? row.isAvailable),
    is_available: Boolean(row.is_available ?? row.isAvailable ?? row.available),
    image:
      row.image ||
      row.avatar_url ||
      row.avatarUrl ||
      row.profile_image ||
      userRow?.avatar_url ||
      userRow?.avatarUrl ||
      adminAssets.doctor_icon,
    location: getDoctorLocation(row),
    fallbackImage: adminAssets.doctor_icon,
    users: row.users || row.user || userRow || {},
    user: row.user || row.users || userRow || {},
    raw: row.raw || row,
  };
};

const AppContextProvider = (props) => {
  // Use Nepali Rupee sign
  const currencySymbol = "रु";
  // Use the local backend in development and the deployed backend route in production.
  const backendUrl = (
    (import.meta.env.VITE_BACKEND_URL && import.meta.env.VITE_BACKEND_URL.trim()) ||
    (import.meta.env.DEV ? "http://localhost:3001" : "/_/backend")
  ).replace(/\/+$/, "");

  const [doctors, setDoctors] = useState([]);
  const [token, setTokenState] = useState(localStorage.getItem("token") || false);
  const [userData, setUserData] = useState(false);

  const syncPortalTokenForRole = useCallback((nextRole, accessToken) => {
    const normalizedRole = String(nextRole || "").toLowerCase();

    localStorage.removeItem("aToken");
    localStorage.removeItem("dToken");

    if (!accessToken) return;

    if (normalizedRole === "admin") {
      localStorage.setItem("aToken", accessToken);
    } else if (normalizedRole === "doctor") {
      localStorage.setItem("dToken", accessToken);
    }
  }, []);

  const setToken = useCallback((nextToken) => {
    if (nextToken) {
      localStorage.setItem("token", nextToken);
      setTokenState(nextToken);
      return;
    }
    localStorage.removeItem("token");
    setTokenState(false);
  }, []);

  const syncSupabaseSessionToken = useCallback(async () => {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        return null;
      }

      const sessionToken = data?.session?.access_token || null;
      if (sessionToken) {
        setToken(sessionToken);
      }
      return sessionToken;
    } catch {
      return null;
    }
  }, [setToken]);

  // =========================
  // GET DOCTORS DATA
  // =========================
  const getDoctorsData = useCallback(async () => {
    try {
      const { data } = await axios.get(backendUrl + "/api/doctor/list");
      if (data?.success) {
        setDoctors((data.doctors || []).map(normalizeDoctorForCards));
        return;
      }
    } catch (backendErr) {
      console.warn("Backend doctor list failed, trying Supabase directly", backendErr);
    }

    try {
      // 🔹 Supabase (Primary) - include linked `users` row when available
      if (supabase) {
        // select doctor_profiles plus the related users record (name, email, avatar)
        const { data, error } = await supabase
          .from("doctor_profiles")
          .select("*, users!doctor_profiles_user_id_fkey(name, email, avatar_url)")
          .order("created_at", { ascending: false });

        if (error) {
          const plain = await supabase
            .from("doctor_profiles")
            .select("*")
            .order("created_at", { ascending: false });
          if (plain.error) throw error;
          setDoctors((plain.data || []).map(normalizeDoctorForCards));
          return;
        }

        const mapped = (data || []).map((r) => {
          // Supabase returns related row under the relation name (usually 'users')
          const userRow = r.users || r.user || null;
          const displayName = (userRow && (userRow.name || userRow.email)) || r.name || r.license_no || `Dr ${r.id?.slice(0, 8)}`;
          const image = (userRow && (userRow.avatar_url || userRow.avatarUrl || userRow.avatar)) || r.image || r.avatar_url || null;

          return {
            _id: r.id,
            id: r.id,
            user_id: r.user_id,
            license_no: r.license_no,
            name: displayName,
            speciality: r.specialty || r.sub_specialty || "General",
            specialty: r.specialty,
            sub_speciality: r.sub_specialty,
            consultation_fee: r.consultation_fee,
            qualifications: r.qualifications,
            is_verified: r.is_verified,
            available: !!r.is_available,
            is_available: !!r.is_available,
            created_at: r.created_at,
            updated_at: r.updated_at,
            image,
            fallbackImage: adminAssets.doctor_icon,
            raw: r,
          };
        });

        setDoctors(mapped.map(normalizeDoctorForCards));
        return;
      }

      // 🔹 Fallback API
      const { data } = await axios.get(backendUrl + "/api/doctor/list");
      if (data?.success) {
        setDoctors((data.doctors || []).map(normalizeDoctorForCards));
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || "Failed to fetch doctors");
    }
  }, [backendUrl]);

  // =========================
  // LOAD USER PROFILE
  // =========================
  const loadUserProfileData = useCallback(async () => {
    try {
      // Prefer Supabase client session/user when available (client-side)
      if (supabase) {
        try {
          const { data: sData, error: sError } = await supabase.auth.getUser();
          if (!sError && sData?.user) {
            const sUser = sData.user;
            const metadata = sUser.user_metadata || {};
            const payload = {
              id: sUser.id,
              email: sUser.email,
              user: sUser,
              role: metadata.role || metadata?.role || 'patient',
              name: metadata.name || sUser.email?.split('@')?.[0] || '',
              image: metadata.avatar_url || metadata.avatarUrl || sUser?.user_metadata?.avatar_url || null,
            };
            syncPortalTokenForRole(payload.role, token);
            setUserData(payload);
            return;
          }
        } catch (supErr) {
          // fallthrough to backend
        }
      }

      // Fallback: call backend /api/auth/me
      const { data } = await axios.get(backendUrl + "/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        const payload = data.data?.user || {};
        const avatar = payload?.avatarUrl || payload?.avatar_url || payload?.avatar || payload?.image || null;
        payload.image = avatar || payload.image || (payload.user ? payload.user.avatarUrl : null);
        syncPortalTokenForRole(payload.role || payload?.user?.role, token);
        setUserData(payload);
      }
    } catch (error) {
      if (error?.response?.status === 401) {
        localStorage.removeItem("token");
        setToken(false);
        setUserData(false);
        return;
      }
      toast.error(error.response?.data?.message || "Failed to load user profile");
    }
  }, [backendUrl, syncPortalTokenForRole, token]);

  // =========================
  // EFFECTS
  // =========================
  useEffect(() => {
    getDoctorsData();
  }, [getDoctorsData]);

  useEffect(() => {
    if (!supabase) return undefined;

    let mounted = true;

    const syncSessionToken = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted || error) return;
      const accessToken = data?.session?.access_token;
      if (accessToken) {
        setToken(accessToken);
      }
    };

    syncSessionToken();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const accessToken = session?.access_token;
      if (accessToken) {
        setToken(accessToken);
      } else {
        setToken(false);
        setUserData(false);
      }
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [setToken]);

  useEffect(() => {
    if (supabase) {
      syncSupabaseSessionToken().finally(() => {
        if (token) {
          loadUserProfileData();
        } else {
          setUserData(false);
        }
      });
      return;
    }

    if (token) {
      loadUserProfileData();
    } else {
      setUserData(false);
    }
  }, [token, loadUserProfileData, syncSupabaseSessionToken]);

  // =========================
  // CONTEXT VALUE
  // =========================
  const logout = async () => {
    setToken(false);
    setUserData(false);
    localStorage.removeItem("aToken");
    localStorage.removeItem("dToken");

    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn("Supabase signOut failed", err);
    }
  };
  const value = useMemo(
    () => ({
      doctors,
      currencySymbol,
      backendUrl,
      token,
      setToken,
      logout,
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
    <AppContext.Provider value={value}>
      {props.children}
    </AppContext.Provider>
  );
};

export default AppContextProvider;
