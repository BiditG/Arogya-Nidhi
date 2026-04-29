import jwt from "jsonwebtoken";
import supabase from "../config/supabase.js";

// Doctor authentication middleware
const authDoctor = async (req, res, next) => {
  try {
    const { dtoken } = req.headers;
    if (!dtoken) {
      return res.status(401).json({ success: false, message: "Token is missing." });
    }

    // First try backend JWT (signed with JWT_SECRET)
    try {
      const token_decode = jwt.verify(dtoken, process.env.JWT_SECRET);
      req.user = { docId: token_decode.id };
      try { console.debug('authDoctor: validated backend JWT', { id: token_decode.id }); } catch(_) {}
      return next();
    } catch (jwtErr) {
      // not a backend JWT — fall through to try Supabase token
    }

    // Fall back: treat dtoken as Supabase access token and validate via Supabase
    if (!supabase) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    try {
      const { data, error } = await supabase.auth.getUser(dtoken);
      if (error || !data?.user) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
      }
      const sUser = data.user;
      try { console.debug('authDoctor: validated Supabase token', { id: sUser.id, metadata: sUser.user_metadata }); } catch(_) {}
      // For Supabase-backed doctor profiles, map supabase user id to docId
      req.user = { docId: sUser.id, role: sUser.user_metadata?.role || 'patient' };
      return next();
    } catch (supErr) {
      console.error('Supabase token validation error', supErr);
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('authDoctor middleware error', error);
    return res.status(401).json({ success: false, message: error.message });
  }
};

export default authDoctor;
