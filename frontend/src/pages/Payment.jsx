import React, { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AppContext } from '../context/AppContext';
import './Payment.css';

const Payment = () => {
  const { backendUrl, token } = useContext(AppContext);
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        const { data } = await axios.get(`${backendUrl}/api/appointments/${appointmentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAppointment(data);
      } catch (error) {
        toast.error('Failed to fetch appointment details');
        navigate('/patient-portal/appointments');
      }
    };

    if (token && appointmentId) {
      fetchAppointment();
    }
  }, [token, appointmentId, backendUrl, navigate]);

  const handlePayment = async () => {
    setProcessing(true);
    try {
      // 1. Simulate creating a payment record
      // In a real app, you would integrate with a payment gateway here
      // and create a payment record in your 'payments' table.
      // For now, we'll just assume the payment is successful.

      // 2. Update the appointment status and add a meeting link
      const meetingLink = 'https://meet.google.com/lookup/fake-meeting-code'; // Dummy link
      await axios.patch(
        `${backendUrl}/api/appointments/${appointmentId}`,
        {
          status: 'CONFIRMED',
          meeting_link: meetingLink,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success('Payment successful! Your appointment is confirmed.');
      navigate('/patient-portal/appointments');
    } catch (error) {
      toast.error('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (!appointment) {
    return <div className="payment-container">Loading...</div>;
  }

  return (
    <div className="payment-container">
      <div className="payment-card">
        <h2>Confirm Your Appointment</h2>
        <div className="appointment-details">
          <p><strong>Doctor:</strong> {appointment.doctor?.name}</p>
          <p><strong>Specialty:</strong> {appointment.doctor?.doctor_profile?.[0]?.specialty || "General"}</p>
          <p><strong>Date:</strong> {new Date(appointment.appointment_date).toLocaleDateString()}</p>
          <p><strong>Time:</strong> {appointment.appointment_time}</p>
          <p className="fee"><strong>Consultation Fee:</strong> ${appointment.doctor?.doctor_profile?.[0]?.consultation_fee || "-"}</p>
        </div>
        <button onClick={handlePayment} disabled={processing} className="pay-button">
          {processing ? 'Processing...' : `Pay $${appointment.doctor?.doctor_profile?.[0]?.consultation_fee || "-"}`}
        </button>
      </div>
    </div>
  );
};

export default Payment;
