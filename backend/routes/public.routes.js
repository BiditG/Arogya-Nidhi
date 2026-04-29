import { Router } from 'express';
import * as ctrl from '../controllers/dashboard.controller.js';
import { getPublicProfileByBarcode } from '../controllers/publicProfile.controller.js';

const router = Router();

// Public queries listing
router.get('/queries', ctrl.getPublicQueries);
router.get('/queries/:id', ctrl.getPublicQuery);

// Public profile by barcode
router.get('/public/profile/:barcode', getPublicProfileByBarcode);

export default router;
