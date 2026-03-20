import { useState } from "react";
import MCQSection from "../components/students/MCQSection";
import OrganViewer from "../components/students/OrganViewer";
import DiagnosticLab from "../components/students/DiagnosticLab";
import MedicineInfo from "../components/students/MedicineInfo";
import FdaLabel from "../components/students/FdaLabel";
import MRI from "../components/students/MRI";
import Pneumonia from "../components/students/Pneumonia";

const NAV = [
  { id: "mcq", label: "MCQs", desc: "Practice questions" },
  { id: "viewer", label: "3D Viewer", desc: "Explore organs" },
  { id: "diag", label: "Diagnostic", desc: "AI patient" },
  { id: "medicine", label: "Medicine", desc: "Drug info" },
  { id: "fda", label: "FDA Drug Labelling", desc: "Indications, Contraindications, Warnings, Pharmacology" },
  { id: "mri", label: "MRI", desc: "Model viewer" },
  { id: "pneumonia", label: "Pneumonia", desc: "Chest AI" },
];

const Students = () => {
  const [active, setActive] = useState("mcq");

  const renderActive = () => {
    switch (active) {
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
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 py-12 px-4 md:px-10">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-400 text-white rounded-2xl p-8 shadow-lg">
            <h1 className="text-3xl md:text-4xl font-bold leading-tight">Students Lab</h1>
            <p className="mt-2 text-indigo-100 max-w-2xl">A clean playground for learning — quick practice, interactive models, and diagnostic tools.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {NAV.slice(0, 3).map((n) => (
                <button
                  key={n.id}
                  onClick={() => setActive(n.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-shadow duration-200
                    ${active === n.id ? "bg-white text-indigo-700 shadow" : "bg-white/20 text-white/95 hover:bg-white/30"}`}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <nav className="md:col-span-1">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700">Tools</h3>
              <div className="mt-3 space-y-2">
                {NAV.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => setActive(n.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors duration-150
                      ${active === n.id ? "bg-indigo-50 border border-indigo-100 text-indigo-700" : "hover:bg-gray-50 text-gray-700"}`}
                  >
                    <div>
                      <div className="text-sm font-medium">{n.label}</div>
                      <div className="text-xs text-gray-400">{n.desc}</div>
                    </div>
                    <div className="text-xs text-gray-300">›</div>
                  </button>
                ))}
              </div>
            </div>
          </nav>

          <section className="md:col-span-3">
            <div className="bg-white rounded-2xl p-6 shadow-lg min-h-[40vh]">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">{NAV.find((n) => n.id === active)?.label}</h2>
                  <p className="text-sm text-gray-400">{NAV.find((n) => n.id === active)?.desc}</p>
                </div>
                <div className="text-sm text-gray-400">Quick • Minimal • Focused</div>
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
