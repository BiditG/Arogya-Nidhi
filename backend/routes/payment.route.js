import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import {
  esewaInitiate,
  esewaSuccess,
  esewaFailure,
  khaltiInitiate,
  khaltiPaymentStatus
} from '../controllers/paymentController.js';

const router = express.Router();

// eSewa payment routes
router.post('/esewa/initiate', authenticate, esewaInitiate);
router.post('/esewa/success', esewaSuccess);
router.post('/esewa/failure', esewaFailure);

// Khalti payment routes
router.post('/khalti/initiate', authenticate, khaltiInitiate);
router.post('/khalti/payment-status', khaltiPaymentStatus);

export default router;
