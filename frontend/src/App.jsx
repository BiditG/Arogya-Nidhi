import { useContext } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import Doctors from "./pages/Doctors";
import Students from "./pages/Students";
import Quiz from "./pages/Quiz";
import Login from "./pages/Login";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Profile from "./pages/Profile";
import PublicProfile from "./pages/PublicProfile";
import Appointments from "./pages/Appointments";
import Appointment from "./pages/Appointment";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import { ToastContainer } from "react-toastify";
import NotFound from "./pages/NotFound";
import IoTPage from "./pages/IoT";
import PatientPortal from "./pages/PatientPortal";
import PatientPortalAiAssistant from "./pages/PatientPortalAiAssistant";
import BookAppointment from "./pages/BookAppointment";
import MedicalHistory from "./pages/MedicalHistory";
import HealthQueries from "./pages/HealthQueries";
import DiscussionDetail from "./pages/DiscussionDetail";
import PublicChat from "./pages/PublicChat";
import PublicChatDetail from "./pages/PublicChatDetail";
import EditProfile from "./pages/EditProfile";
import DoctorDashboard from "./pages/DoctorDashboard";
import DoctorAppointments from "./pages/DoctorAppointments";
import DoctorConsultations from "./pages/DoctorConsultations";
import DoctorEarnings from "./pages/DoctorEarnings";
import DoctorPatientHistory from "./pages/DoctorPatientHistory";
import DoctorAISummaries from "./pages/DoctorAISummaries";
import DoctorQueries from "./pages/DoctorQueries";
import DoctorQueryDetail from "./pages/DoctorQueryDetail";
import DoctorProfile from "./pages/DoctorProfile";
import DoctorArticle from "./pages/DoctorArticle";
import StudentPortal from "./pages/StudentPortal";
import AdminPortalApp from "./admin/App";
import Payment from "./pages/Payment";
import PatientPrescriptions from "./pages/PatientPrescriptions";
import { AppContext } from "./context/AppContext";
import { getDashboardPathForRole, getUserRole } from "./utils/roleDashboard";

const RoleAwareHome = () => {
  const { token, userData } = useContext(AppContext);

  if (token && userData) {
    return (
      <Navigate
        to={getDashboardPathForRole(getUserRole(userData))}
        replace
      />
    );
  }

  return <Home />;
};

const App = () => {
  const location = useLocation();
  const isAdminPortalRoute = location.pathname.startsWith("/admin-portal");
  const isPatientPortalRoute =
    location.pathname.startsWith("/patient-portal") ||
    location.pathname.startsWith("/doctor-portal") ||
    location.pathname.startsWith("/student-portal") ||
    isAdminPortalRoute ||
    location.pathname.startsWith("/public-queries") ||
    location.pathname === "/iot";
  const isIntegratedAdminRoute = location.pathname.startsWith("/admin-portal");



  return (
    <div className="min-h-screen w-full">
      <ToastContainer />
      {!isIntegratedAdminRoute && <Navbar />}
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<RoleAwareHome />} />
        <Route path="/doctors" element={<Doctors />} />
        <Route path="/doctors/:slug" element={<Doctors />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/public-queries" element={<PublicChat />} />
        <Route path="/public-queries/:id" element={<PublicChatDetail />} />
        <Route
          path="/patient-portal/prescriptions"
          element={<PatientPrescriptions />}/>
        <Route path="/login" element={<Login />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/students" element={<Students />} />
        <Route path="/students/quiz" element={<Quiz />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/public-profile/:barcode" element={<PublicProfile />} />
        <Route path="/my-appointments" element={<Appointments />} />
        <Route path="/appointment/:docId" element={<Appointment />} />
        <Route path="/iot" element={<IoTPage />} />
        <Route path="/patient-portal/profile" element={<EditProfile />} />
        <Route path="/patient-portal" element={<PatientPortal />} />
        <Route
          path="/patient-portal/ai-assistant"
          element={<PatientPortalAiAssistant />}
        />
        <Route
          path="/patient-portal/book-appointment"
          element={<BookAppointment />}
        />
        <Route
          path="/patient-portal/medical-history"
          element={<MedicalHistory />}
        />
        <Route
          path="/patient-portal/health-queries"
          element={<HealthQueries mode="patient" />}
        />
        <Route
          path="/patient-portal/health-queries/:id"
          element={<DiscussionDetail mode="patient" />}
        />
        <Route
          path="/doctor-portal/health-queries"
          element={<HealthQueries mode="doctor" />}
        />
        <Route
          path="/doctor-portal/health-queries/:id"
          element={<DiscussionDetail mode="doctor" />}
        />
        <Route
          path="/student-portal/health-queries"
          element={<HealthQueries mode="student" />}
        />
        <Route
          path="/student-portal/health-queries/:id"
          element={<DiscussionDetail mode="student" />}
        />
        <Route path="/payment/:appointmentId" element={<Payment />} />

        <Route path="/doctor-portal" element={<DoctorDashboard />} />
        <Route path="/doctor-portal/appointments" element={<DoctorAppointments />} />
        <Route path="/doctor-portal/consultations" element={<DoctorConsultations />} />
        <Route path="/doctor-portal/patient-history" element={<DoctorPatientHistory />} />
        <Route path="/doctor-portal/ai-summaries" element={<DoctorAISummaries />} />
        <Route path="/doctor-portal/earnings" element={<DoctorEarnings />} />
        <Route path="/doctor-portal/article" element={<DoctorArticle />} />
        <Route path="/doctor-portal/queries" element={<DoctorQueries />} />
        <Route path="/doctor-portal/queries/:id" element={<DoctorQueryDetail />} />
        <Route path="/doctor-portal/profile" element={<DoctorProfile />} />
        <Route path="/student-portal" element={<StudentPortal />} />
        <Route path="/admin-portal/*" element={<AdminPortalApp />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
      {(!isPatientPortalRoute || location.pathname.startsWith("/public-queries")) && <Footer />}

    </div>
  );
};

export default App;
