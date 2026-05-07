import { sendError, sendSuccess } from '../util/response.util.js';
import { generateBarcodeValue } from '../util/barcode.util.js';
import authRepo from '../repository/auth.repository.js';
import patientRepo from '../repository/patient.repository.js';
import supabase from '../config/supabase.js';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

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

    const { phone } = req.body;

    if (phone === undefined) {
      return sendError(res, 'Only phone can be updated from this profile page', 400);
    }

    const updatedUser = await authRepo.updateUserById(id, { phone });

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
    if (!supabase) return sendError(res, 'Supabase is not configured', 500);

    const ext = path.extname(req.file.originalname || '').toLowerCase() || '.jpg';
    const fileKey = `user-${id}/avatar-${uuidv4()}${ext}`;
    const fileBuffer = await fs.readFile(req.file.path);

    const { error: uploadError } = await supabase
      .storage
      .from('avatars')
      .upload(fileKey, fileBuffer, {
        contentType: req.file.mimetype || 'image/jpeg',
        upsert: true,
      });

    await fs.unlink(req.file.path).catch(() => {});

    if (uploadError) {
      return sendError(res, uploadError.message || 'Failed to upload avatar', 500);
    }

    const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(fileKey);
    const avatarUrl = publicData?.publicUrl || null;

    const updated = await authRepo.updateUserById(id, { avatar_url: avatarUrl });

    try {
      await supabase.auth.admin.updateUserById(id, {
        user_metadata: { avatar_url: avatarUrl },
      });
    } catch {
      // ignore metadata sync failures
    }

    return sendSuccess(res, { user: updated }, 'Avatar updated');
  } catch (err) {
    return sendError(res, err.message || 'Failed to update avatar', err.status || 500);
  }
}
