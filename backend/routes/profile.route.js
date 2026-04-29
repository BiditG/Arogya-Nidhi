import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { updateProfileSchema } from '../validations/profile.validation.js';
import { uploadAvatar, handleMulterError } from '../config/multer.config.js';
import { getProfile, updateProfile, updateAvatar } from '../controllers/profile.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', getProfile);
router.patch('/', validate(updateProfileSchema), updateProfile);
router.patch(
  '/avatar',
  (req, res, next) => uploadAvatar(req, res, (err) => err ? handleMulterError(err, req, res, next) : next()),
  updateAvatar
);

export default router;
