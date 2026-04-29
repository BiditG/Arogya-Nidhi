import { useContext } from "react";
import { DoctorContext } from "../../context/DoctorContext";
import { useEffect } from "react";
import { AppContext } from "../../context/AppContext";
import { assets } from "../../assets/assets";

const DoctorAppointments = () => {
  const { dToken, appointments, getAppointments, cancelAppointment, completeAppointment } = useContext(DoctorContext);
  const { currencySymbol, calculateAge, formatDateString } =
    useContext(AppContext);

  useEffect(() => {
    if (dToken) {
      getAppointments();
    }
  }, [dToken]);

  return (
    <div className="w-full max-w-6xl m-5">
      <p className="mb-3 text-lg font-medium">All Appointments</p>
      <div className="bg-white border border-gray-400 rounded text-sm min-h-[60vh] max-h-[80vh] overflow-y-scroll">
        <div className="max-sm:hidden grid grid-cols-[0.5fr_2fr_1fr_1fr_3fr_1fr_1fr] gap-1 py-3 px-6 border-b border-gray-400">
          <p>#</p>
          <p>Patient</p>
          <p>Payment</p>
          <p>Age</p>
          <p>Date & Time</p>
          <p>Fees</p>
          <p>Actions</p>
        </div>
        {appointments.map((item, index) => (
          <div
            key={index}
            className="flex flex-wrap justify-between max-sm:gap-5 max-sm:text-base sm:grid sm:grid-cols-[0.5fr_2fr_1fr_1fr_3fr_1fr_1fr] gap-1 items-center text-gray-500 py-3 px-6 border-b border-gray-400 hover:bg-gray-50"
          >
            <p className="max-sm:hidden">{index + 1}</p>
            <div className="flex items-center gap-2">
              <img
                className="w-8 rounded-full"
                src={item.patient.avatarUrl || item.patient.avatar_url || assets.person_icon}
                alt=""
              />
              <p>{item.patient.name}</p>
            </div>
            <p
              className={`text-xs w-fit border px-2 rounded-full ${
                item.payment && item.payment.length > 0 && item.payment[0].status === 'COMPLETED'
                  ? "bg-green-400 text-white border-green-600"
                  : "text-primary border-primary"
              }`}
            >
              {item.payment && item.payment.length > 0 && item.payment[0].status === 'COMPLETED' ? "PAID" : "UNPAID"}
            </p>
            <p className="max-sm:hidden">{calculateAge(item.patient.dateOfBirth)}</p>
            <p>
              {formatDateString(item.appointment_date)}, {item.appointment_time}
            </p>
            <p>
              {currencySymbol}
              {item.doctor?.doctor_profile?.[0]?.consultation_fee || "-"}
            </p>

            {item.status === 'CANCELLED' ? (
              <p className="text-red-400 text-xs font-medium">Cancelled</p>
            ) : item.status === 'COMPLETED' ? (
              <p className="text-green-500 text-xs font-medium">Completed</p>
            ) : (
              <div className="flex">
                <img
                  onClick={() => cancelAppointment(item.id)}
                  className="w-10 cursor-pointer"
                  src={assets.cancel_icon}
                  alt=""
                />
                <img
                  onClick={() => completeAppointment(item.id)}
                  className="w-10 cursor-pointer"
                  src={assets.tick_icon}
                  alt=""
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DoctorAppointments;
