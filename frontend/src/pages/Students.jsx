import { useState } from "react";
import MCQSection from "../components/students/MCQSection";
import OrganViewer from "../components/students/OrganViewer";
import DiagnosticLab from "../components/students/DiagnosticLab";
import MedicineInfo from "../components/students/MedicineInfo";
import FdaLabel from "../components/students/FdaLabel";
import MRI from "../components/students/MRI";
import Pneumonia from "../components/students/Pneumonia";
import DiseaseGlossary from "../components/students/DiseaseGlossary";
import StudentDashboard from "../components/students/StudentDashboard";

const NAV = [
  { id: "dashboard", label: "Dashboard", desc: "Overview & activity" },
  { id: "mcq", label: "MCQs", desc: "Practice questions" },
  { id: "viewer", label: "3D Viewer", desc: "Explore organs" },
  { id: "diag", label: "Diagnostic", desc: "AI patient" },
  { id: "medicine", label: "Medicine", desc: "Drug info" },
  { id: "fda", label: "FDA Drug Labelling", desc: "Indications, Contraindications, Warnings, Pharmacology" },
  { id: "mri", label: "MRI", desc: "Model viewer" },
  { id: "pneumonia", label: "Pneumonia", desc: "Chest AI" },
  { id: "glossary", label: "EN-NE Disease Glossary", desc: "English ↔ Nepali translations" },
];

const ICONS = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M3 13h8V3H3v10zM3 21h8v-6H3v6zM13 21h8V11h-8v10zM13 3v6h8V3h-8z" fill="currentColor" />
    </svg>
  ),
  mcq: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M12 2l4 4H8l4-4zm6 6v10a2 2 0 01-2 2H8a2 2 0 01-2-2V8h12z" fill="currentColor" />
    </svg>
  ),
  viewer: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8S2 12 2 12z" fill="currentColor" />
    </svg>
  ),
  diag: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M12 2v10l3 3 1-1-2-2V2h-2zM5 13l-1 8h16l-1-8H5z" fill="currentColor" />
    </svg>
  ),
  medicine: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M7 2h10v4H7zM5 8h14v14H5z" fill="currentColor" />
    </svg>
  ),
  fda: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M12 2l3 6H9l3-6zm0 8a4 4 0 110 8 4 4 0 010-8z" fill="currentColor" />
    </svg>
  ),
  mri: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M4 6h16v12H4zM2 4v16M22 4v16" stroke="currentColor" strokeWidth="0" fill="currentColor" />
    </svg>
  ),
  pneumonia: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9-4-9-9-9z" fill="currentColor" />
    </svg>
  ),
  glossary: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M4 4h16v2H4zM4 10h16v2H4zM4 16h10v2H4z" fill="currentColor" />
    </svg>
  ),
};

const Students = () => {
  const [active, setActive] = useState("mcq");

  const renderActive = () => {
    switch (active) {
      case "dashboard":
        return <StudentDashboard />;
      case "mcq":
        return <MCQSection />;
      case "viewer":
        return <OrganViewer />;
      case "diag":
        return <DiagnosticLab />;
      case "medicine":
        return <MedicineInfo />;
      case "fda":
        return <FdaLabel apiKey={import.meta.env.VITE_OPENFDA_KEY} />;
      case "mri":
        return <MRI />;
      case "pneumonia":
        return <Pneumonia />;
      case "glossary":
        return <DiseaseGlossary />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50 py-8 px-4 md:px-10">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold">Students Lab</h1>
              <p className="mt-1 text-sm text-gray-500 max-w-2xl">Practice questions, interactive models, and diagnostic tools — built for focus.</p>
            </div>

            <div className="hidden md:flex items-center gap-3">
              {NAV.slice(0, 4).map((n) => (
                <button
                  key={n.id}
                  onClick={() => setActive(n.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-150 flex items-center gap-2 border 
                    ${active === n.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                >
                  <span className="text-white/90" style={{color: active === n.id ? 'inherit' : 'currentColor'}}>{ICONS[n.id]}</span>
                  <span>{n.label}</span>
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <nav className="md:col-span-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm sticky top-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Tools</h3>
              <div className="space-y-2">
                {NAV.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => setActive(n.id)}
                    className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 transition-colors duration-150 
                      ${active === n.id ? 'bg-indigo-50 border-l-4 border-indigo-600 text-indigo-700 shadow-sm' : 'hover:bg-gray-50 text-gray-700'}`}
                  >
                    <div className={`w-6 h-6 flex items-center justify-center text-gray-500 ${active === n.id ? 'text-indigo-600' : ''}`}>{ICONS[n.id]}</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{n.label}</div>
                      <div className="text-xs text-gray-400">{n.desc}</div>
                    </div>
                    <div className="text-xs text-gray-300">›</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 hidden md:block">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h4 className="text-sm font-semibold text-gray-700">Quick Tips</h4>
                <p className="text-xs text-gray-500 mt-2">Use the tools on the left to explore content. Switch to mobile view for compact tabs.</p>
              </div>
            </div>
          </nav>

          <section className="md:col-span-9">
            <div className="bg-white rounded-3xl p-6 shadow-lg min-h-[40vh]">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{NAV.find((n) => n.id === active)?.label}</h2>
                  <p className="text-sm text-gray-400">{NAV.find((n) => n.id === active)?.desc}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center text-sm text-gray-400">Quick • Minimal • Focused</div>
                </div>
              </div>

              <div className="mt-2">{renderActive()}</div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Students;
