import jwt from "jsonwebtoken";
import supabase from "../config/supabase.js";

// Doctor authentication middleware
const authDoctor = async (req, res, next) => {
  try {
    const { dtoken } = req.headers;
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    const token = dtoken || bearerToken;

    if (!token) {
      return res.status(401).json({ success: false, message: "Token is missing." });
    }

    // First try backend JWT (signed with JWT_SECRET)
    try {
      const token_decode = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { docId: token_decode.id, userId: token_decode.id, id: token_decode.id, sub: token_decode.id };
      try { console.debug('authDoctor: validated backend JWT', { id: token_decode.id }); } catch(_) {}
      return next();
    } catch (jwtErr) {
      // not a backend JWT — fall through to try Supabase token
    }

    // Fall back: treat dtoken as Supabase access token and validate via Supabase
    if (!supabase) {
      console.log(`[authDoctor] ERROR: supabase is null`);
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data?.user) {
        console.log(`[authDoctor] ERROR: supabase.auth.getUser failed:`, error?.message || 'No user data');
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
      }
      const sUser = data.user;
      try { console.debug('authDoctor: validated Supabase token', { id: sUser.id, metadata: sUser.user_metadata }); } catch(_) {}
      // For Supabase-backed doctor profiles, map supabase user id to docId
      req.user = { docId: sUser.id, userId: sUser.id, id: sUser.id, sub: sUser.id, role: sUser.user_metadata?.role || 'patient' };
      console.log(`[authDoctor] Success: Authenticated doctor ${sUser.id}`);
      return next();
    } catch (supErr) {
      console.error('[authDoctor] Supabase token validation error', supErr);
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
  } catch (error) {
    console.error('[authDoctor] middleware error', error);
    return res.status(401).json({ success: false, message: error.message });
  }
};

export default authDoctor;
