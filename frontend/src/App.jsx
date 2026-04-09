import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Chat from "./pages/Chat";
import Doctors from "./pages/Doctors";
import Students from "./pages/Students";
import Quiz from "./pages/Quiz";
import Login from "./pages/Login";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Profile from "./pages/Profile";
import Appointments from "./pages/Appointments";
import Appointment from "./pages/Appointment";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import { ToastContainer } from "react-toastify";
import NotFound from "./pages/NotFound";
import IoTPage from "./pages/IoT";
import PatientPortal from "./pages/PatientPortal";
import BookAppointment from "./pages/BookAppointment";

const App = () => {
  return (
    <div className="mx-4 sm:mx-[10%]">
      <ToastContainer />
      <Navbar />
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/doctors" element={<Doctors />} />
        <Route path="/doctors/:slug" element={<Doctors />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/login" element={<Login />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/students" element={<Students />} />
        <Route path="/students/quiz" element={<Quiz />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/my-appointments" element={<Appointments />} />
        <Route path="/appointment/:docId" element={<Appointment />} />
        <Route path="/iot" element={<IoTPage />} />
        <Route path="/patient-portal" element={<PatientPortal />} />
        <Route
          path="/patient-portal/book-appointment"
          element={<BookAppointment />}
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </div>
  );
};

export default App;
