import React, { useEffect, useState } from 'react';

const StatCard = ({ label, value, icon }) => (
  <div className="sp-stat-card">
    <div className="sp-stat-icon">{icon}</div>
    <div className="sp-stat-label">{label}</div>
    <div className="sp-stat-value">{value}</div>
  </div>
);

const ResourceCard = ({ title, desc, icon }) => (
  <div className="sp-resource-card">
    <div className="sp-resource-img">{icon}</div>
    <div>
      <div className="sp-resource-title">{title}</div>
      <div className="sp-resource-desc">{desc}</div>
    </div>
    <div className="sp-resource-footer">
      <button className="sp-btn-primary">Access</button>
    </div>
  </div>
);

const AICard = ({ title, desc, btn }) => (
  <div className="sp-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
    <div>
      <div className="sp-section-title" style={{ fontSize: '0.9375rem', marginBottom: '0.375rem' }}>{title}</div>
      <p style={{ fontSize: '0.8125rem', color: 'var(--pp-text-secondary)', marginTop: '0.25rem' }}>{desc}</p>
    </div>
    <div style={{ marginTop: '1rem' }}>
      <button className="sp-btn-primary">{btn}</button>
    </div>
  </div>
);

const BOOK_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M4 4h16v2H4zM4 9h12v2H4zM4 14h8v2H4z" fill="currentColor" />
  </svg>
);
const MCQ_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M9 12h6M12 9v6M5 5h14v14H5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const CHECK_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ATTEMPT_ICON = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
    <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const RESOURCE_ICONS = {
  study: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 4h16v2H4zM4 9h16v2H4zM4 14h10v2H4z" fill="currentColor" />
    </svg>
  ),
  mcq: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 12h6M12 9v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  organ: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3C7 3 3 7.582 3 12s4 9 9 9 9-4.418 9-9-4-9-9-9z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 12h18M12 3c-2.5 2.5-2.5 13.5 0 18" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
};

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
      <section className="sp-section">
        <div className="sp-section-header">
          <h3 className="sp-section-title">Overview</h3>
          <span style={{ fontSize: '0.8125rem', color: 'var(--pp-text-muted)' }}>Quick snapshot of your learning progress</span>
        </div>

        <div className="sp-stats-grid">
          <StatCard label="Total Courses"  value={12}                     icon={BOOK_ICON} />
          <StatCard label="MCQs Completed" value={progress.unique_mcqs}   icon={MCQ_ICON} />
          <StatCard label="Correct MCQs"   value={progress.correct_count} icon={CHECK_ICON} />
          <StatCard label="Attempts"        value={progress.total_attempts} icon={ATTEMPT_ICON} />
        </div>
      </section>

      <section className="sp-section">
        <div className="sp-section-header">
          <h3 className="sp-section-title">Learning Resources</h3>
          <button className="sp-section-action">View All</button>
        </div>

        <div className="sp-resources-grid">
          <ResourceCard title="Study Materials"  desc="Curated notes and PDFs to support learning."              icon={RESOURCE_ICONS.study} />
          <ResourceCard title="MCQ Practice"     desc="Practice multiple choice questions and track progress."  icon={RESOURCE_ICONS.mcq} />
          <ResourceCard title="3D Organ Models"  desc="Interactive 3D anatomical models for study."            icon={RESOURCE_ICONS.organ} />
        </div>
      </section>

      <section className="sp-section">
        <h3 className="sp-section-title" style={{ marginBottom: '1rem' }}>AI Tools</h3>
        <div className="sp-two-col">
          <AICard title="MCQ Explanations"    desc="Get step-by-step AI explanations for practice questions." btn="Get Explanation" />
          <AICard title="Concept Explanations" desc="Ask AI about medical concepts and clinical reasoning."   btn="Ask AI" />
        </div>
      </section>

      <section className="sp-section">
        <h3 className="sp-section-title" style={{ marginBottom: '0.75rem' }}>Recent Activity</h3>
        <div className="sp-activity-list">
          {[
            { title: 'Completed: Cardiology basics',              meta: '2 hours ago' },
            { title: 'Attempted: Hypertension MCQ',               meta: 'Yesterday' },
            { title: 'Viewed: Brain 3D model',                    meta: '2 days ago' },
            { title: 'Accessed: Study material — Pharmacology',   meta: '3 days ago' },
          ].map((row, i) => (
            <div className="sp-activity-item" key={i}>
              <div>
                <div className="sp-activity-title">{row.title}</div>
                <div className="sp-activity-meta">{row.meta}</div>
              </div>
              <div className="sp-activity-dot" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default StudentDashboard;
