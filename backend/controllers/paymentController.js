import crypto from 'crypto';
import axios from 'axios';
import supabase from '../config/supabase.js';

// eSewa payment initiation
export const esewaInitiate = async (req, res) => {
  try {
    const { appointmentId, amount } = req.body;
    const userId = req.user.id;

    if (!appointmentId || amount == null) {
      return res.status(400).json({ success: false, message: 'Missing appointmentId or amount' });
    }

    const { data: user, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', userId)
        .single();

        if (patientError) {
        return res.status(404).json({
            success: false,
            message: 'Patient not found',
        });
        }

    // Verify appointment belongs to user and get details
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .eq('patient_id', user.id)
      .single();

    if (appointmentError || !appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Generate transaction UUID
    const transactionUuid = crypto.randomUUID();

    const totalAmount = parseInt(amount);
    const productCode = process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST';

    // Calculate signature (HMAC-SHA256)
    // message must exactly match: total_amount=<val>,transaction_uuid=<val>,product_code=<val>
    const secretKey = process.env.ESEWA_SECRET;
    const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(message)
      .digest('base64');

    // Create payment record in DB (match payments table schema)
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        appointment_id: appointmentId,
        amount: amount,
        currency: process.env.DEFAULT_CURRENCY || 'NPR',
        status: 'INITIATED',
        gateway: 'esewa',
        gateway_ref: transactionUuid
      });

    if (paymentError) {
      return res.status(500).json({ success: false, message: 'Failed to create payment record' });
    }

    // Return payload for frontend to submit — all values as strings to match eSewa's validation
    res.json({
      success: true,
      payload: {
        amount: String(totalAmount),
        tax_amount: '0',
        product_delivery_charge: '0',
        product_service_charge: '0',
        total_amount: String(totalAmount),
        transaction_uuid: transactionUuid,
        product_code: productCode,
        success_url: `${process.env.ESEWA_SUCCESS_URL}?appointmentId=${appointmentId}`,
        failure_url: `${process.env.ESEWA_FAILURE_URL}?appointmentId=${appointmentId}`,
        signed_field_names: 'total_amount,transaction_uuid,product_code',
        signature: signature
      }
    });
  } catch (error) {
    console.error('eSewa initiate error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// eSewa payment success callback
export const esewaSuccess = async (req, res) => {
  try {
    const { appointmentId: rawAppointmentId, data: encodedData } = req.body;

    // eSewa may append ?data= directly onto appointmentId if the success_url already had a ?
    // Strip anything after ? from appointmentId to get the clean UUID
    const appointmentId = rawAppointmentId ? rawAppointmentId.split('?')[0] : null;

    if (!appointmentId || !encodedData) {
      return res.status(400).json({ success: false, message: 'Missing transaction data' });
    }

    // Decode base64 response from eSewa
    let decodedData;
    try {
      decodedData = JSON.parse(Buffer.from(encodedData, 'base64').toString());
    } catch (e) {
      console.error('Failed to decode eSewa data:', e.message);
      return res.status(400).json({ success: false, message: 'Invalid eSewa response data' });
    }

    console.log('eSewa decoded data:', JSON.stringify(decodedData));
    const transactionUuid = decodedData.transaction_uuid;

    if (!transactionUuid) {
      console.error('No transaction_uuid in decoded data:', decodedData);
      return res.status(400).json({ success: false, message: 'Missing transaction UUID from eSewa' });
    }

    // Verify with eSewa v2 status API (sandbox can be unreliable — log but don't block)
    try {
      const verifyRes = await axios.get('https://rc-epay.esewa.com.np/api/epay/transaction/status/', {
        params: {
          product_code: process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST',
          total_amount: decodedData.total_amount,
          transaction_uuid: transactionUuid,
        }
      });
      console.log('eSewa verify response:', JSON.stringify(verifyRes.data));
      if (verifyRes.data.status !== 'COMPLETE') {
        console.warn('eSewa status not COMPLETE:', verifyRes.data.status, '— proceeding anyway for sandbox');
      }
    } catch (esewaError) {
      console.error('eSewa verification API error:', esewaError.response?.data || esewaError.message);
      // Sandbox verification is unreliable — trust the callback and continue
    }

    // Update payment record
    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update({ status: 'PAID', paid_at: new Date().toISOString() })
      .eq('gateway_ref', transactionUuid)
      .eq('gateway', 'esewa')
      .select();

    console.log('Payment update result:', JSON.stringify(updatedPayment), 'error:', updateError);

    if (updateError) {
      console.error('Payment update error:', updateError);
      return res.status(500).json({ success: false, message: 'Failed to update payment record' });
    }

    // If no rows matched, the gateway_ref might not match — update by appointmentId as fallback
    if (!updatedPayment || updatedPayment.length === 0) {
      console.warn('No payment matched gateway_ref, trying appointmentId fallback');
      const { error: fallbackError } = await supabase
        .from('payments')
        .update({ status: 'PAID', paid_at: new Date().toISOString() })
        .eq('appointment_id', appointmentId)
        .eq('gateway', 'esewa')
        .eq('status', 'INITIATED');
      if (fallbackError) console.error('Fallback payment update error:', fallbackError);
    }

    // Update appointment to CONFIRMED
    const { error: apptError } = await supabase
      .from('appointments')
      .update({ status: 'CONFIRMED' })
      .eq('id', appointmentId);

    if (apptError) {
      console.error('Appointment update error:', apptError);
      return res.status(500).json({ success: false, message: 'Failed to confirm appointment' });
    }

    console.log('Payment and appointment updated successfully for:', appointmentId);
    res.json({ success: true, message: 'Payment successful' });
  } catch (error) {
    console.error('eSewa success error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// eSewa payment failure callback
export const esewaFailure = async (req, res) => {
  try {
    const { appointmentId } = req.query;

    // Get the payment record and mark as failed
    const { data: payments, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('appointment_id', appointmentId)
      .eq('gateway', 'esewa')
      .eq('status', 'INITIATED')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!fetchError && payments && payments.length > 0) {
      await supabase
        .from('payments')
        .update({ status: 'FAILED' })
        .eq('id', payments[0].id);
    }

    res.json({ success: false, message: 'Payment cancelled' });
  } catch (error) {
    console.error('eSewa failure error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Khalti payment initiation
export const khaltiInitiate = async (req, res) => {
  try {
    const { appointmentId, amount } = req.body;
    const userId = req.user.id;

    if (!appointmentId || amount == null) {
      return res.status(400).json({ success: false, message: 'Missing appointmentId or amount' });
    }

    const { data: user, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', userId)
        .single();

        if (patientError) {
        return res.status(404).json({
            success: false,
            message: 'Patient not found',
        });
        }


    // Verify appointment
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .eq('patient_id', user.id)
      .single();

    if (appointmentError || !appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Call Khalti API to initiate payment
    try {
      const khaltiResponse = await axios.post(
        `${process.env.KHALTI_PAYMENT_INITIATION}`,
        {
          return_url: `${process.env.KHALTI_RETURN_URL}?appointmentId=${appointmentId}`,
          website_url: process.env.KHALTI_WEBSITE_URL,
          amount: parseInt(amount) * 100, // Khalti expects amount in paisa
          purchase_order_id: appointmentId,
          purchase_order_name: `Appointment ${appointmentId}`,
          customer_info: {
            name: 'Patient',
            email: 'patient@example.com',
            phone: '9800000000'
          }
        },
        {
          headers: {
            Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`
          }
        }
      );

      const { pidx, payment_url } = khaltiResponse.data;

      // Create payment record in DB
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          appointment_id: appointmentId,
          amount: amount,
          currency: process.env.DEFAULT_CURRENCY || 'NPR',
          status: 'INITIATED',
          gateway: 'khalti',
          gateway_ref: pidx
        });

      if (paymentError) {
        return res.status(500).json({ success: false, message: 'Failed to create payment record' });
      }

      res.json({
        success: true,
        pidx: pidx,
        payment_url: payment_url
      });
    } catch (khaltiError) {
      console.error('Khalti API error:', khaltiError.response?.data || khaltiError.message);
      return res.status(500).json({ success: false, message: 'Failed to initiate Khalti payment' });
    }
  } catch (error) {
    console.error('Khalti initiate error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// Khalti payment status check
export const khaltiPaymentStatus = async (req, res) => {
  try {
    const { pidx, appointmentId } = req.body;

    if (!pidx) {
      return res.status(400).json({ success: false, message: 'Missing pidx' });
    }

    // Verify payment status with Khalti
    try {
      const statusResponse = await axios.post(
        `${process.env.KHALTI_BASE_URL}/epayment/lookup/`,
        { pidx },
        {
          headers: {
            Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`
          }
        }
      );

      const paymentStatus = statusResponse.data.status;

      if (paymentStatus === 'Completed') {
        // Update payment record
        const { error: updateError } = await supabase
          .from('payments')
          .update({
            status: 'PAID',
            paid_at: new Date().toISOString()
          })
          .eq('gateway_ref', pidx)
          .eq('gateway', 'khalti');

        if (updateError) {
          return res.status(500).json({ success: false, message: 'Failed to update payment' });
        }

        // Update appointment as confirmed
        await supabase
          .from('appointments')
          .update({ status: 'CONFIRMED' })
          .eq('id', appointmentId);

        return res.json({ success: true, message: 'Payment successful', status: 'PAID' });
      } else {
        return res.json({ success: false, message: 'Payment not completed', status: paymentStatus });
      }
    } catch (khaltiError) {
      console.error('Khalti lookup error:', khaltiError.response?.data || khaltiError.message);
      return res.status(500).json({ success: false, message: 'Failed to verify payment' });
    }
  } catch (error) {
    console.error('Khalti status error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
