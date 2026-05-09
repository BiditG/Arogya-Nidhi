# Payment Integration Setup Guide - Arogya Nidhi

## Overview
This document provides instructions for setting up and testing the Khalti and eSewa payment gateway integration for the Arogya Nidhi telemedicine appointment system.

## Architecture

### Server-Side Payment Initiation Pattern
- **Frontend** initiates payment request to backend
- **Backend** creates INITIATED payment record in database
- **Backend** calls gateway API (Khalti/eSewa) to get payment details
- **Frontend** either redirects to payment URL or submits hidden form
- **Payment Gateway** processes transaction
- **Payment Gateway** redirects to callback URL with transaction details
- **Backend** verifies transaction with gateway API
- **Backend** updates payment record and confirms appointment

## Environment Variables

Add the following to your `.env` file in the `backend` directory:

```env
# eSewa Payment Gateway
ESEWA_MERCHANT_CODE=EPAYTEST
ESEWA_SECRET=8gBm/:&EnhH.1/q
ESEWA_SUCCESS_URL=http://localhost:5173/payment-success
ESEWA_FAILURE_URL=http://localhost:5173/payment-failure

# Khalti Payment Gateway
KHALTI_SECRET_KEY=872c42f43659411a905cdafe67d63b81
KHALTI_PAYMENT_INITIATION=https://a.khalti.com/api/v2/epayment/initiate/
KHALTI_BASE_URL=https://a.khalti.com
KHALTI_RETURN_URL=http://localhost:5173/khalti-return
KHALTI_WEBSITE_URL=http://localhost:5173
```

### Important Notes on URLs
- **Development**: Use `http://localhost:5173` (frontend dev server port)
- **Production**: Update to your production domain (e.g., `https://arogya-nidhi.vercel.app`)
- **Payment Gateway URLs** must be publicly accessible for callbacks
- For eSewa testing, use merchant code `EPAYTEST` (development only)
- For Khalti testing, credentials are hardcoded test keys (valid for development)

## File Structure

### Backend Files
```
backend/
├── controllers/
│   └── paymentController.js          # Payment processing logic
├── routes/
│   └── payment.route.js              # Payment endpoints
└── server.js                         # (Updated with payment routes)
```

### Frontend Files
```
frontend/src/
├── pages/
│   ├── Payment.jsx                   # Payment gateway selection
│   ├── Payment.css                   # Payment page styling
│   ├── PaymentSuccess.jsx            # eSewa success callback
│   ├── PaymentFailure.jsx            # eSewa failure callback
│   ├── KhaltiReturn.jsx              # Khalti return callback
│   └── PaymentCallback.css           # Callback page styling
└── App.jsx                           # (Updated with payment routes)
```

## Database Schema

### Payments Table (Supabase)
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id),
  patient_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  gateway VARCHAR(20) NOT NULL, -- 'esewa' or 'khalti'
  transaction_id VARCHAR(255),
  pidx VARCHAR(255), -- Khalti Payment Index
  status VARCHAR(20) NOT NULL, -- 'INITIATED', 'PAID', 'FAILED'
  metadata JSONB, -- Store gateway-specific data
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### eSewa Payment Flow

#### 1. Initiate Payment
```
POST /api/payments/esewa/initiate
Authorization: Bearer {token}
Content-Type: application/json

{
  "appointmentId": "uuid"
}

Response:
{
  "success": true,
  "payload": {
    "amt": 100,
    "psc": 0,
    "pdc": 0,
    "txAmt": 100,
    "tAmt": 100,
    "pid": "appointment-uuid",
    "scd": "EPAYTEST",
    "su": "http://localhost:5173/payment-success?appointmentId=uuid&transactionUuid=uuid",
    "fu": "http://localhost:5173/payment-failure?appointmentId=uuid"
  },
  "action": "https://rc-epay.esewa.com.np/api/epay/"
}
```

#### 2. eSewa Redirects to Success URL
```
GET /payment-success?appointmentId=uuid&transactionUuid=uuid&data=base64_data&ref_id=esewa_ref
```

#### 3. Success Handler Verifies Payment
```
POST /api/payments/esewa/success
Content-Type: application/json

{
  "appointmentId": "uuid",
  "data": "base64_encoded_data"
}

Response:
{
  "success": true,
  "message": "Payment verified and appointment confirmed"
}
```

### Khalti Payment Flow

#### 1. Initiate Payment
```
POST /api/payments/khalti/initiate
Authorization: Bearer {token}
Content-Type: application/json

{
  "appointmentId": "uuid"
}

Response:
{
  "success": true,
  "pidx": "khalti_payment_index",
  "payment_url": "https://khalti.com/pay?pidx=khalti_payment_index"
}
```

#### 2. Frontend Redirects User to Payment URL
User is redirected to Khalti payment page, completes payment

#### 3. Khalti Redirects to Return URL
```
GET /khalti-return?pidx=khalti_payment_index&appointmentId=uuid&txnId=khalti_txn_id
```

#### 4. Return Handler Verifies Payment
```
POST /api/payments/khalti/payment-status
Content-Type: application/json

{
  "pidx": "khalti_payment_index",
  "appointmentId": "uuid"
}

Response:
{
  "success": true,
  "message": "Payment verified and appointment confirmed"
}
```

## Testing the Integration

### Prerequisites
1. Backend running: `cd backend && npm install && node server.js`
2. Frontend running: `cd frontend && npm install && npm run dev`
3. Database migrations applied for `payments` table

### Test eSewa Payment

1. **Create an Appointment**
   - Go to frontend, book an appointment
   - Note the appointment ID

2. **Initiate eSewa Payment**
   - Click "Pay with eSewa" button on Payment page
   - Review appointment details
   - Click "Proceed with eSewa"

3. **Complete Payment**
   - eSewa test page appears
   - Click "Complete Payment" (test mode)
   - You'll be redirected to success page

4. **Verify Success**
   - Check success toast notification
   - Confirm appointment status changed to "CONFIRMED" in database
   - Verify payment record created with status "PAID"

### Test Khalti Payment

1. **Create an Appointment**
   - Go to frontend, book an appointment
   - Note the appointment ID

2. **Initiate Khalti Payment**
   - Click "Pay with Khalti" button on Payment page
   - Review appointment details
   - Click "Proceed with Khalti"

3. **Complete Payment**
   - Khalti payment page appears (test mode)
   - Enter test credentials if prompted
   - Complete payment flow

4. **Verify Success**
   - Redirected back to app with success notification
   - Confirm appointment status changed to "CONFIRMED"
   - Verify payment record created with status "PAID"

### Test Payment Failure

1. **eSewa Failure**
   - Initiate eSewa payment
   - Click "Decline Payment" on eSewa page
   - Should redirect to failure page
   - Verify payment record has status "FAILED"

2. **Khalti Failure**
   - Initiate Khalti payment
   - Close payment page without completing
   - May need manual trigger of failure callback for testing

## Troubleshooting

### CORS Errors
- Verify frontend origin is in backend `CORS_ORIGIN` environment variable
- Check that credentials are set to `true` in CORS configuration
- Ensure OPTIONS requests are handled

### Payment Not Recording
- Check Supabase `payments` table exists
- Verify appointment ID is valid UUID format
- Check backend logs for API responses from payment gateways
- Verify gateway credentials in `.env` file

### Redirect Not Working
- Verify callback URLs in `.env` match actual frontend routes
- Check browser console for JavaScript errors
- Verify payment routes are registered in backend
- Ensure frontend App.jsx has payment callback routes

### Transaction Verification Failing
- Check gateway API response in backend logs
- Verify transaction ID/PIDX from gateway
- Confirm payment gateway credentials are correct
- Check timestamp alignment between requests

## Security Notes

1. **Never expose credentials on frontend**
   - All payment gateway credentials stay in backend `.env`
   - Frontend only receives payment URLs/payloads from backend

2. **Always verify transactions**
   - Backend verifies every transaction with payment gateway
   - Don't trust client-side confirmation alone

3. **Validate appointment ownership**
   - Verify authenticated user owns the appointment
   - Prevent payment bypass by directly calling success endpoint

4. **Test credentials only in development**
   - Use real credentials in production
   - Store credentials securely (e.g., environment secrets in hosting platform)

## Production Deployment

### Before Going Live

1. **Update .env Variables**
   ```env
   ESEWA_MERCHANT_CODE=YOUR_REAL_CODE
   ESEWA_SUCCESS_URL=https://your-domain.com/payment-success
   ESEWA_FAILURE_URL=https://your-domain.com/payment-failure
   KHALTI_RETURN_URL=https://your-domain.com/khalti-return
   KHALTI_WEBSITE_URL=https://your-domain.com
   ```

2. **Update CORS Origins**
   - Add production domain to CORS whitelist in `backend/server.js`

3. **Get Production Credentials**
   - Contact eSewa and Khalti for production merchant codes and API keys
   - Update credentials in `.env`

4. **Enable HTTPS**
   - Payment gateways require HTTPS for production
   - Get SSL certificate for your domain

5. **Update Database**
   - Ensure payments table exists in production database
   - Run migrations if needed

## Support

For issues or questions:
1. Check backend logs: `node server.js` output
2. Check frontend console: Developer Tools → Console
3. Verify gateway API responses in network requests
4. Consult payment gateway documentation:
   - eSewa: https://esewa.com.np
   - Khalti: https://khalti.com
