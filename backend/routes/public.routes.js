import { Router } from 'express';
import * as ctrl from '../controllers/dashboard.controller.js';

const router = Router();

// Public queries listing
router.get('/queries', ctrl.getPublicQueries);
router.get('/queries/:id', ctrl.getPublicQuery);

export default router;
