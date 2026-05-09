import React, { useEffect, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AppContext } from '../context/AppContext';
import './PaymentCallback.css';

const KhaltiReturn = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { backendUrl, token } = useContext(AppContext);

  useEffect(() => {
    const processKhaltiReturn = async () => {
      const pidx = searchParams.get('pidx');
      const appointmentId = searchParams.get('appointmentId');
      const status = searchParams.get('status');

      if (!pidx || !appointmentId) {
        toast.error('Invalid payment response');
        navigate('/patient-portal/appointments');
        return;
      }

      try {
        // Verify payment status with backend
        const response = await axios.post(
          `${backendUrl}/api/payments/khalti/payment-status`,
          {
            pidx,
            appointmentId
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (response.data.success && response.data.status === 'PAID') {
          toast.success('Payment successful! Your appointment is confirmed.');
          setTimeout(() => {
            navigate('/patient-portal/appointments');
          }, 2000);
        } else {
          toast.error('Payment verification failed');
          navigate('/patient-portal/appointments');
        }
      } catch (error) {
        console.error('Khalti return error:', error);
        toast.error('Failed to verify payment');
        navigate('/patient-portal/appointments');
      }
    };

    processKhaltiReturn();
  }, [searchParams, navigate, backendUrl, token]);

  return (
    <div className="payment-container">
      <div className="payment-card">
        <h2>Processing Khalti Payment...</h2>
        <p>Please wait while we confirm your payment.</p>
      </div>
    </div>
  );
};

export default KhaltiReturn;
