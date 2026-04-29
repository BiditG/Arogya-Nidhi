import { sendError, sendSuccess } from '../util/response.util.js';
import authRepo from '../repository/auth.repository.js';
import patientRepo from '../repository/patient.repository.js';

export async function getPublicProfileByBarcode(req, res) {
  try {
    const { barcode } = req.params;
    if (!barcode) return sendError(res, 'Barcode is required', 400);

    const user = await authRepo.findUserByBarcode(barcode);
    if (!user) return sendError(res, 'Profile not found', 404);

    let patient = null;
    let address = null;
    try {
      patient = await patientRepo.findPatientByUserId(user.id);
      if (patient?.id) {
        address = await patientRepo.findAddressByPatient(patient.id);
      }
    } catch {
      patient = null;
      address = null;
    }

    const resolvedAddress = address || {
      streetAddress: user.street_address || null,
      city: user.city || null,
      state: user.state || null,
      pinCode: user.pin_code || null,
      country: user.country || null,
    };

    const profile = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl || user.avatar_url || null,
      barcode: user.barcode,
      role: user.role,
      gender: user.gender || patient?.gender || null,
      dateOfBirth: user.date_of_birth || patient?.dateOfBirth || null,
      address: resolvedAddress,
    };

    return sendSuccess(res, { profile }, 'Public profile');
  } catch (err) {
    return sendError(res, err.message || 'Failed to fetch profile', err.status || 500);
  }
}
