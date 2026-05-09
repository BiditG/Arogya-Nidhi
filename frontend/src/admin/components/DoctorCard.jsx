import { useContext } from "react";
import { AdminContext } from "../context/AdminContext";
import { assets } from "../assets/assets";

const DoctorCard = ({ doctor }) => {
  const { changeAvailability } = useContext(AdminContext);
  const doctorId = doctor?._id || doctor?.id;
  const imageSrc =
    doctor?.image ||
    doctor?.avatar_url ||
    doctor?.users?.avatar_url ||
    doctor?.user?.avatar_url ||
    assets.doctor_icon;
  const name = doctor?.name || doctor?.users?.name || doctor?.user?.name || "Doctor";
  const speciality = doctor?.speciality || doctor?.specialty || doctor?.sub_specialty || "General physician";
  const available = Boolean(doctor?.available ?? doctor?.is_available);

  return (
    <div className="border border-indigo-200 rounded-xl max-w-56 overflow-hidden cursor-pointer group">
      <img
        className="bg-indigo-50 group-hover:bg-primary transition-all duration-500"
        src={imageSrc}
        alt={name}
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = assets.doctor_icon;
        }}
      />
      <div className="p-4">
        <p className="text-neutral-800 text-lg font-medium">{name}</p>
        <p className="text-zinc-600 text-sm">{speciality}</p>
        <div className="flex items-center mt-2 gap-1 text-sm">
          <input
            onChange={() => doctorId && changeAvailability(doctorId)}
            type="checkbox"
            checked={available}
            readOnly={!doctorId}
          />
          <p>Available</p>
        </div>
      </div>
    </div>
  );
};

export default DoctorCard;
