import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { supabase } from "../lib/supabaseClient";
import { assets as adminAssets } from "../assets/assets_admin/assets";

export const AppContext = createContext();

const AppContextProvider = (props) => {
  // Use Nepali Rupee sign
  const currencySymbol = "रु";
  // Default to local backend when VITE_BACKEND_URL is not provided (prevents calls to dev server)
  const backendUrl = ((import.meta.env.VITE_BACKEND_URL && import.meta.env.VITE_BACKEND_URL.trim()) || "http://localhost:3000").replace(/\/+$/, "");

  const [doctors, setDoctors] = useState([]);
  const [token, setTokenState] = useState(localStorage.getItem("token") || false);
  const [userData, setUserData] = useState(false);

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
      // 🔹 Supabase (Primary) - include linked `users` row when available
      if (supabase) {
        // select doctor_profiles plus the related users record (name, email, avatar)
        const { data, error } = await supabase
          .from("doctor_profiles")
          .select("*, users(name, email, avatar_url)")
          .order("created_at", { ascending: false });

        if (error) throw error;

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

        setDoctors(mapped);
        return;
      }

      // 🔹 Fallback API
      const { data } = await axios.get(backendUrl + "/api/doctor/list");
      if (data?.success) {
        setDoctors(data.doctors);
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
  }, [backendUrl, token]);

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
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn("Supabase signOut failed", err);
    }
    setToken(false);
    setUserData(false);
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
