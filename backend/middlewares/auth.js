import jwt from 'jsonwebtoken';
import getPool from '../config/postgres.js';

const JWT_SECRET = process.env.JWT_SECRET;

export const requireAuth = () => async (req, res, next) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, message: 'Missing token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, role: payload.role };
    // optionally load full user
    try {
      const pool = await getPool();
      if (pool) {
        const q = await pool.query('SELECT id,email,name,role,is_active FROM users WHERE id = $1', [payload.sub]);
        if (q.rows[0]) req.user = { ...req.user, ...q.rows[0] };
      }
    } catch (e) {
      // ignore load error
    }
    next();
  } catch (err) {
    console.error('auth verify error', err);
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};
