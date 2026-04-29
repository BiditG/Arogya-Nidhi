import { sendError, sendSuccess } from '../util/response.util.js';
import { generateBarcodeValue } from '../util/barcode.util.js';
import authRepo from '../repository/auth.repository.js';
import patientRepo from '../repository/patient.repository.js';

const normalizeAddress = (source = {}) => ({
  streetAddress: source.streetAddress || source.street_address || null,
  city: source.city || null,
  state: source.state || null,
  pinCode: source.pinCode || source.pin_code || null,
  country: source.country || null,
});

async function ensureBarcode(userId, user) {
  if (user?.barcode) return user;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const candidate = generateBarcodeValue();
    try {
      return await authRepo.updateUserById(userId, { barcode: candidate });
    } catch (err) {
      const message = String(err?.message || '').toLowerCase();
      if (!message.includes('duplicate') && !message.includes('unique')) {
        throw err;
      }
    }
  }
  return user;
}

export async function getProfile(req, res) {
  try {
    const id = req.user?.userId || req.user?.sub || req.user?.id || null;
    if (!id) return sendError(res, 'User id not found in token', 400);

    let user = await authRepo.findUserById(id);
    if (!user) return sendError(res, 'User not found', 404);

    user = await ensureBarcode(id, user);

    let patient = null;
    let address = null;
    try {
      patient = await patientRepo.findPatientByUserId(id);
      if (patient?.id) {
        address = await patientRepo.findAddressByPatient(patient.id);
      }
    } catch {
      patient = null;
      address = null;
    }

    const resolvedGender = user.gender ?? patient?.gender ?? null;
    const resolvedDob = user.date_of_birth ?? user.dateOfBirth ?? patient?.dateOfBirth ?? null;
    const userAddress = normalizeAddress({
      streetAddress: user.street_address,
      city: user.city,
      state: user.state,
      pinCode: user.pin_code,
      country: user.country,
    });
    const hasUserAddress = Object.values(userAddress).some((v) => v);
    const resolvedAddress = hasUserAddress ? userAddress : normalizeAddress(address || {});

    return sendSuccess(res, {
      profile: {
        user,
        gender: resolvedGender,
        dateOfBirth: resolvedDob,
        address: resolvedAddress,
      },
    }, 'Profile');
  } catch (err) {
    return sendError(res, err.message || 'Failed to fetch profile', err.status || 500);
  }
}

export async function updateProfile(req, res) {
  try {
    const id = req.user?.userId || req.user?.sub || req.user?.id || null;
    if (!id) return sendError(res, 'User id not found in token', 400);

    const {
      name,
      phone,
      gender,
      dateOfBirth,
      streetAddress,
      city,
      state,
      pinCode,
      country,
    } = req.body;

    const userUpdates = {};
    if (name !== undefined) userUpdates.name = name;
    if (phone !== undefined) userUpdates.phone = phone;
    // Only update `users` table fields that exist in the canonical users schema.
    // Profile-specific fields (gender, dateOfBirth, address) are persisted in patient tables below.
    if (name !== undefined) userUpdates.name = name;
    if (phone !== undefined) userUpdates.phone = phone;

    let updatedUser = null;
    if (Object.keys(userUpdates).length) {
      updatedUser = await authRepo.updateUserById(id, userUpdates);
    } else {
      updatedUser = await authRepo.findUserById(id);
    }

    // Keep patient profile in sync when applicable
    try {
      const patient = await patientRepo.findPatientByUserId(id);
      if (patient?.id) {
        if (gender !== undefined || dateOfBirth !== undefined) {
          await patientRepo.updatePatientProfile(id, {
            gender: gender !== undefined ? gender : patient.gender,
            dateOfBirth: dateOfBirth !== undefined ? (dateOfBirth ? new Date(dateOfBirth) : null) : patient.dateOfBirth,
          });
        }
        if (
          streetAddress !== undefined ||
          city !== undefined ||
          state !== undefined ||
          pinCode !== undefined ||
          country !== undefined
        ) {
          await patientRepo.upsertAddress(patient.id, {
            streetAddress: streetAddress !== undefined ? streetAddress : null,
            city: city !== undefined ? city : null,
            state: state !== undefined ? state : null,
            pinCode: pinCode !== undefined ? pinCode : null,
            country: country !== undefined ? country : null,
          });
        }
      }
    } catch {
      // ignore patient sync failures
    }

    return sendSuccess(res, { user: updatedUser }, 'Profile updated');
  } catch (err) {
    return sendError(res, err.message || 'Failed to update profile', err.status || 500);
  }
}

export async function updateAvatar(req, res) {
  try {
    const id = req.user?.userId || req.user?.sub || req.user?.id || null;
    if (!id) return sendError(res, 'User id not found in token', 400);
    if (!req.file) return sendError(res, 'No image file provided', 400);

    const avatarUrl = req.file.path.replace(/\\/g, '/');
    const updated = await authRepo.updateUserById(id, { avatarUrl });

    return sendSuccess(res, { user: updated }, 'Avatar updated');
  } catch (err) {
    return sendError(res, err.message || 'Failed to update avatar', err.status || 500);
  }
}
