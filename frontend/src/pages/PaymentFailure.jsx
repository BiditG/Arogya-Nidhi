import React, { useEffect, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AppContext } from '../context/AppContext';
import './PaymentCallback.css';

const PaymentFailure = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { backendUrl, token } = useContext(AppContext);

  useEffect(() => {
    const processEsewaFailure = async () => {
      const appointmentId = searchParams.get('appointmentId');

      if (!appointmentId) {
        navigate('/patient-portal/appointments');
        return;
      }

      try {
        // Notify backend of failed payment
        await axios.post(
          `${backendUrl}/api/payments/esewa/failure`,
          {},
          {
            params: { appointmentId },
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        toast.error('Payment failed. Please try again.');
        setTimeout(() => {
          navigate('/patient-portal/appointments');
        }, 2000);
      } catch (error) {
        console.error('Payment failure error:', error);
        navigate('/patient-portal/appointments');
      }
    };

    processEsewaFailure();
  }, [searchParams, navigate, backendUrl, token]);

  return (
    <div className="payment-container">
      <div className="payment-card">
        <h2>Payment Failed</h2>
        <p>Your payment could not be processed. Redirecting...</p>
      </div>
    </div>
  );
};

export default PaymentFailure;
