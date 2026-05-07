import React from 'react';

const StudentsSidebar = ({ active, setActive }) => {
  return (
    <aside className="w-full md:w-60 bg-white border rounded p-3">
      <nav className="flex flex-col gap-2">
        <button onClick={() => setActive('mcq')} className={`text-left px-3 py-2 rounded ${active==='mcq' ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}>MCQ Practice</button>
        <button onClick={() => setActive('viewer')} className={`text-left px-3 py-2 rounded ${active==='viewer' ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}>3D Organ Viewer</button>
        <button onClick={() => setActive('diag')} className={`text-left px-3 py-2 rounded ${active==='diag' ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}>Diagnostic Lab</button>
        <button onClick={() => setActive('medicine')} className={`text-left px-3 py-2 rounded ${active==='medicine' ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}>Medicine Information</button>
        <button onClick={() => setActive('mri')} className={`text-left px-3 py-2 rounded ${active==='mri' ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}>MRI</button>
        <button onClick={() => setActive('pneumonia')} className={`text-left px-3 py-2 rounded ${active==='pneumonia' ? 'bg-primary text-white' : 'hover:bg-gray-100'}`}>Pneumonia</button>
      </nav>
    </aside>
  );
};

export default StudentsSidebar;
