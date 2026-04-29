import repo from '../repository/auth.repository.js';
import supabase from '../config/supabase.js';
import { hashPassword, comparePassword } from '../util/password.util.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  hashToken,
  getRefreshTokenExpiry,
} from '../util/token.util.js';

const ALLOWED_ROLES = ['patient', 'doctor', 'student', 'admin'];

// ─── Register ─────────────────────────────────────────────────────────────────

async function register(body, meta = {}) {
  const { email, password, role, name, phone, ...profileData } = body;

  if (!ALLOWED_ROLES.includes(role)) {
    throw { status: 400, message: `Invalid role. Allowed: ${ALLOWED_ROLES.join(', ')}` };
  }

  const existing = await repo.findUserByEmail(email);
  if (existing) throw { status: 409, message: 'Email already in use' };

  const passwordHash = await hashPassword(password);

  const user = await repo.createUser({ email, passwordHash, role, name, phone });

  // Create role-specific profile
  if (role === 'patient') {
    const { dateOfBirth, bloodGroup, gender, address } = profileData;
    if (typeof repo.createPatient !== 'function') throw { status: 500, message: 'createPatient repository method not implemented' };
    await repo.createPatient({ user_id: user.id, date_of_birth: dateOfBirth, blood_group: bloodGroup, gender, address });
  } else if (role === 'doctor') {
    const { nmcLicenseNo, specialty, subSpecialty, qualifications, experienceYears, consultationFee, bio } = profileData;
    if (!nmcLicenseNo) throw { status: 400, message: 'nmcLicenseNo is required for doctors' };
    if (typeof repo.createDoctorProfile !== 'function') throw { status: 500, message: 'createDoctorProfile repository method not implemented' };
    await repo.createDoctorProfile({ user_id: user.id, license_no: nmcLicenseNo, specialty, sub_specialty: subSpecialty, qualifications, experience: experienceYears, consultation_fee: consultationFee, bio });
  } else if (role === 'student') {
    const { institution, yearOfStudy, faculty } = profileData;
    if (typeof repo.createStudentProfile !== 'function') throw { status: 500, message: 'createStudentProfile repository method not implemented' };
    await repo.createStudentProfile({ user_id: user.id, institution, year_of_study: yearOfStudy, faculty });
  }

  // If backend has Supabase service role configured, also create the Supabase user server-side
  try {
    if (supabase) {
      const { data: sData, error: sError } = await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: { name, role },
        email_confirm: true,
      });
      if (sError) {
        console.warn('Supabase admin.createUser warning:', sError);
      }
    }
  } catch (err) {
    console.warn('Supabase createUser exception:', err?.message || err);
  }

  const tokens = await _issueTokens(user, meta);

  return { user: _safeUser(user), ...tokens };
}

// ─── Login ────────────────────────────────────────────────────────────────────

async function login(email, password, meta = {}) {
  const user = await repo.findUserByEmail(email);
  if (!user) throw { status: 401, message: 'Invalid credentials' };

  if (!user.isActive) throw { status: 403, message: 'Account is deactivated' };

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) throw { status: 401, message: 'Invalid credentials' };

  const tokens = await _issueTokens(user, meta);

  return { user: _safeUser(user), ...tokens };
}

// ─── Refresh ──────────────────────────────────────────────────────────────────

async function refresh(rawToken, meta = {}) {
  let payload;
  try {
    payload = verifyRefreshToken(rawToken);
  } catch {
    throw { status: 401, message: 'Invalid or expired refresh token' };
  }

  const tokenHash = hashToken(rawToken);
  const storedToken = await repo.findRefreshTokenByHash(tokenHash);

  if (!storedToken || storedToken.isRevoked) {
    throw { status: 401, message: 'Refresh token revoked or not found' };
  }

  if (new Date() > storedToken.expiresAt) {
    throw { status: 401, message: 'Refresh token expired' };
  }

  // Rotate: revoke old, issue new
  await repo.revokeRefreshToken(storedToken.id);
  const tokens = await _issueTokens(storedToken.user, meta);

  return tokens;
}

// ─── Logout ───────────────────────────────────────────────────────────────────

async function logout(rawToken) {
  if (!rawToken) throw { status: 400, message: 'Refresh token required' };

  const tokenHash = hashToken(rawToken);
  const storedToken = await repo.findRefreshTokenByHash(tokenHash);

  if (storedToken) {
    await repo.revokeRefreshToken(storedToken.id);
  }
  // Fail silently if token not found (already revoked or expired)
}

async function logoutAll(userId) {
  await repo.revokeAllUserRefreshTokens(userId);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function _issueTokens(user, meta) {
  const payload = { userId: user.id, role: user.role, email: user.email };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await repo.createRefreshToken({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: getRefreshTokenExpiry(),
    ipAddress: meta.ip || null,
    userAgent: meta.userAgent || null,
  });

  return { accessToken, refreshToken };
}

function _safeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

export default { register, login, refresh, logout, logoutAll };