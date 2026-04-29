import React, { useEffect, useState } from 'react';

const StatCard = ({ label, value }) => (
  <div className="flex-1 border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
    <div className="text-sm text-gray-500">{label}</div>
    <div className="text-2xl font-semibold mt-2">{value}</div>
  </div>
);

const ResourceCard = ({ title, desc }) => (
  <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm flex flex-col">
    <div className="h-28 bg-gray-50 rounded mb-3 flex items-center justify-center text-gray-300">Image</div>
    <div className="flex-1">
      <h4 className="font-semibold">{title}</h4>
      <p className="text-sm text-gray-500 mt-1">{desc}</p>
    </div>
    <div className="mt-3">
      <button className="px-3 py-1 bg-primary text-white rounded">Access</button>
    </div>
  </div>
);

const SmallCard = ({ title, desc, btn }) => (
  <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm flex flex-col justify-between">
    <div>
      <h4 className="font-semibold">{title}</h4>
      <p className="text-sm text-gray-500 mt-1">{desc}</p>
    </div>
    <div className="mt-3">
      <button className="px-3 py-1 bg-primary text-white rounded">{btn}</button>
    </div>
  </div>
);

const ActivityRow = ({ title, subtitle }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-100">
    <div>
      <div className="font-medium text-sm">{title}</div>
      <div className="text-xs text-gray-400">{subtitle}</div>
    </div>
    <div className="text-xs text-gray-500">●</div>
  </div>
);

const StudentDashboard = () => {
  const [progress, setProgress] = useState({ total_attempts: 0, unique_mcqs: 0, correct_count: 0 });

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch('/api/students/progress', { headers });
        if (!res.ok) return;
        const payload = await res.json();
        if (payload.success && payload.data) setProgress(payload.data);
      } catch (err) {
        console.error('Failed to load progress', err);
      }
    };
    fetchProgress();
  }, []);

  return (
    <div>
      <section className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Overview</h2>
            <p className="text-sm text-gray-500">Quick snapshot of your learning progress</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Total Courses" value={12} />
          <StatCard label="MCQ Completed" value={progress.unique_mcqs} />
          <StatCard label="Correct MCQs" value={progress.correct_count} />
          <StatCard label="Attempts" value={progress.total_attempts} />
        </div>
      </section>

      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Learning Resources</h3>
          <button className="text-sm text-primary">View All</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ResourceCard title="Study Materials" desc="Curated notes and PDFs to support learning." />
          <ResourceCard title="MCQ" desc="Practice multiple choice questions and track progress." />
          <ResourceCard title="3D Organ Models" desc="Interactive 3D anatomical models for study." />
        </div>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Recent AI Explanations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SmallCard title="MCQ Explanations" desc="Get step-by-step AI explanations for MCQs." btn="Get Explanation" />
          <SmallCard title="Concept Explanations" desc="Ask AI about medical concepts and reasoning." btn="Ask AI" />
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">Recent Activity</h3>
        <div className="border border-gray-200 rounded-lg bg-white shadow-sm p-2">
          <ActivityRow title="Completed: Cardiology basics" subtitle="2 hours ago" />
          <ActivityRow title="Attempted: Hypertension MCQ" subtitle="Yesterday" />
          <ActivityRow title="Viewed: Brain model" subtitle="2 days ago" />
          <ActivityRow title="Accessed: Study material — Pharmacology" subtitle="3 days ago" />
        </div>
      </section>
    </div>
  );
};

export default StudentDashboard;
