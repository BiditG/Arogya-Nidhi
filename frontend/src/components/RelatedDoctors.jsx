import { useContext, useEffect, useState } from "react";
import { AppContext } from "../context/AppContext";
import DoctorCard from "./DoctorCard";
import { useLanguage } from "../utils/language";
import { getDoctorNameForLanguage } from "../utils/nepaliNames";

const RelatedDoctors = ({ docId, speciality }) => {
  const [relDoc, setRelDoc] = useState([]);
  const { doctors } = useContext(AppContext);
  const [language] = useLanguage();
  const localizeDoctor = (doctor) => ({
    ...doctor,
    name: getDoctorNameForLanguage(doctor, language),
    englishName: getDoctorNameForLanguage(doctor, "en"),
  });

  useEffect(() => {
    if (doctors.length > 0 && speciality) {
      const doctorsData = doctors.filter(
        (doc) => doc.speciality === speciality && doc._id !== docId
      );
      setRelDoc(doctorsData);
    }
  }, [doctors, speciality, docId]);

  return (
    relDoc.length > 0 && (
      <div className="flex flex-col items-center gap-4 my-16 text-gray-900 md:mx-10">
        <h1 className="text-3xl font-medium">Top Doctors to Book</h1>
        <p className="sm:w-1/3 text-center text-sm">
          Simply browse through our extensive list of trusted doctors.
        </p>
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-5 px-3 sm:px-0">
          {relDoc.slice(0, 5).map((doctor, index) => (
            <DoctorCard key={doctor._id || doctor.id || index} doctor={localizeDoctor(doctor)} />
          ))}
        </div>
      </div>
    )
  );
};

export default RelatedDoctors;
