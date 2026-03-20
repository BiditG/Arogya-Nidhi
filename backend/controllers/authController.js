import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import getPool from '../config/postgres.js';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TTL = process.env.ACCESS_TTL || '15m';
const REFRESH_TTL = process.env.REFRESH_TTL || '30d';

if (!JWT_SECRET) {
  console.warn('JWT_SECRET not set — auth endpoints will not work until JWT_SECRET is provided');
}

const hashToken = async (token) => {
  // use sha256 for refresh token hashing (fast, stable)
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const register = async (req, res) => {
  const { email, password, name, role = 'User' } = req.body;
  if (!email || !password || !name) return res.status(400).json({ success: false, message: 'Missing required fields' });
  try {
    const pool = await getPool();
    if (!pool) return res.status(500).json({ success: false, message: 'Database not configured' });

    // check existing
    const check = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (check.rows.length) return res.status(409).json({ success: false, message: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const insert = await pool.query(
      `INSERT INTO users (email, name, role, is_active, password_hash) VALUES ($1,$2,$3,TRUE,$4) RETURNING id,email,name,role`,
      [email, name, role, passwordHash]
    );
    const user = insert.rows[0];

    // create tokens
    const accessToken = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: ACCESS_TTL });
    const refreshToken = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: REFRESH_TTL });
    const refreshHash = await hashToken(refreshToken);
    await pool.query('INSERT INTO refresh_tokens (user_id, token_hash, expires_at, is_revoked) VALUES ($1,$2,now() + interval $3, false)', [user.id, refreshHash, REFRESH_TTL]);

    res.json({ success: true, data: { user, accessToken, refreshToken } });
  } catch (err) {
    console.error('register error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Missing email or password' });
  try {
    const pool = await getPool();
    if (!pool) return res.status(500).json({ success: false, message: 'Database not configured' });

    const q = await pool.query('SELECT id, email, name, role, password_hash, is_active FROM users WHERE email = $1', [email]);
    const user = q.rows[0];
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (!user.is_active) return res.status(403).json({ success: false, message: 'Account disabled' });

    const ok = user.password_hash ? await bcrypt.compare(password, user.password_hash) : false;
    if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const accessToken = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: ACCESS_TTL });
    const refreshToken = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: REFRESH_TTL });
    const refreshHash = await hashToken(refreshToken);

    await pool.query('INSERT INTO refresh_tokens (user_id, token_hash, expires_at, is_revoked) VALUES ($1,$2,now() + interval $3, false)', [user.id, refreshHash, REFRESH_TTL]);

    res.json({ success: true, data: { user: { id: user.id, email: user.email, name: user.name, role: user.role }, accessToken, refreshToken } });
  } catch (err) {
    console.error('login error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ success: false, message: 'Missing refreshToken' });
  try {
    const pool = await getPool();
    if (!pool) return res.status(500).json({ success: false, message: 'Database not configured' });
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    const tokenHash = await hashToken(refreshToken);
    const q = await pool.query('SELECT id, user_id, is_revoked FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
    if (!q.rows.length) return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    const tokenRow = q.rows[0];
    if (tokenRow.is_revoked) return res.status(401).json({ success: false, message: 'Refresh token revoked' });

    // issue new access token
    const userQ = await pool.query('SELECT id, role FROM users WHERE id = $1', [tokenRow.user_id]);
    const user = userQ.rows[0];
    if (!user) return res.status(401).json({ success: false, message: 'Invalid user' });

    const accessToken = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: ACCESS_TTL });
    res.json({ success: true, data: { accessToken } });
  } catch (err) {
    console.error('refresh error', err);
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

export const logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ success: false, message: 'Missing refreshToken' });
  try {
    const pool = await getPool();
    if (!pool) return res.status(500).json({ success: false, message: 'Database not configured' });
    const tokenHash = await hashToken(refreshToken);
    await pool.query('UPDATE refresh_tokens SET is_revoked = true WHERE token_hash = $1', [tokenHash]);
    res.json({ success: true });
  } catch (err) {
    console.error('logout error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
