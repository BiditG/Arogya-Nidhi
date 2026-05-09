import React, { useContext, useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AppContext } from '../context/AppContext';
import './PaymentCallback.css';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { backendUrl } = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // eSewa appends ?data= to our success_url, so the full URL is:
        // /payment-success?appointmentId=xxx&data=yyy
        // But if there was already a ? in our URL, eSewa uses ? again making it malformed.
        // Parse both searchParams and the raw hash/search to be safe.
        const appointmentId = searchParams.get('appointmentId');

        // eSewa may append data with & or ? — check both parsed params and raw URL
        let esewaData = searchParams.get('data');

        if (!esewaData) {
          // Fallback: parse raw search string manually in case of double-? issue
          // appointmentId=xxx?data=yyy — regex captures everything after data=
          const raw = window.location.href;
          const dataMatch = raw.match(/[?&]data=(.+?)(?:&|$)/s);
          if (dataMatch) esewaData = decodeURIComponent(dataMatch[1]);
        }

        console.log('PaymentSuccess params:', { appointmentId, esewaData: esewaData?.substring(0, 50) });

        if (!appointmentId || !esewaData) {
          console.error('Missing params. Full URL:', window.location.href);
          toast.error('Invalid payment callback — missing data');
          setLoading(false);
          return;
        }

        const response = await axios.post(
          `${backendUrl}/api/payments/esewa/success`,
          { appointmentId, data: esewaData }
        );

        console.log('Verification response:', response.data);

        if (response.data.success) {
          setVerified(true);
          toast.success('Payment confirmed! Appointment is now active.');
        } else {
          toast.error(response.data.message || 'Payment verification failed');
        }
      } catch (error) {
        console.error('Payment verification error:', error.response?.data || error.message);
        toast.error(error.response?.data?.message || 'Error verifying payment');
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, []);

  // Countdown after loading completes
  useEffect(() => {
    if (loading) return;
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          navigate('/my-appointments');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [loading]);

  if (loading) {
    return (
      <div className="callback-container">
        <div className="callback-card">
          <div className="loader"></div>
          <h2>Verifying Payment</h2>
          <p>Please wait while we confirm your payment with eSewa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="callback-container">
      <div className="callback-card">
        {verified ? (
          <>
            <div className="callback-icon success-icon">✓</div>
            <h2>Payment Successful</h2>
            <p>Your appointment has been confirmed.</p>
          </>
        ) : (
          <>
            <div className="callback-icon error-icon">!</div>
            <h2>Verification Issue</h2>
            <p>We received your payment but couldn't verify it automatically. Your appointment may still be confirmed — please check your appointments.</p>
          </>
        )}
        <p className="callback-redirect-note">Redirecting in {countdown}s...</p>
        <button className="callback-btn" onClick={() => navigate('/my-appointments')}>
          Go to My Appointments
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccess;
