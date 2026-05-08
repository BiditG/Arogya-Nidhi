import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { AppContext } from '../../context/AppContext';

const StatCard = ({ label, value, icon }) => (
  <div className="sp-stat-card">
    <div className="sp-stat-icon">{icon}</div>
    <div className="sp-stat-label">{label}</div>
    <div className="sp-stat-value">{value}</div>
  </div>
);

const ResourceCard = ({ title, desc, icon, target }) => {
  const navigate = useNavigate();
  const handleAccess = () => {
    try { if (target) localStorage.setItem('studentPortalInitialTab', target); } catch {}
    // include navigation state as well so Students can react even when already on the route
    navigate('/student-portal', { state: { initialTab: target } });
  };

  return (
    <div className="sp-resource-card">
      <div className="sp-resource-img">{icon}</div>
      <div>
        <div className="sp-resource-title">{title}</div>
        <div className="sp-resource-desc">{desc}</div>
      </div>
      <div className="sp-resource-footer">
        <button className="sp-btn-primary" onClick={handleAccess}>Access</button>
      </div>
    </div>
  );
};

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
  const { backendUrl } = useContext(AppContext);
  const [progress, setProgress] = useState({ totalAttempts: 0, uniqueMcqs: 0, correctAnswers: 0 });
  const [resourceCount, setResourceCount] = useState(0);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`${backendUrl}/api/students/progress`, { headers });
        if (!res.ok) return;
        const payload = await res.json();
        if (payload.success && payload.data) {
          const data = payload.data;
          setProgress({
            totalAttempts: data.totalAttempts ?? data.total_attempts ?? 0,
            uniqueMcqs: data.uniqueMcqs ?? data.unique_mcqs ?? 0,
            correctAnswers: data.correctAnswers ?? data.correct_count ?? 0,
          });
        }
      } catch (err) {
        console.error('Failed to load progress', err);
      }
    };
    const fetchLearningResources = async () => {
      if (!supabase) return;
      try {
        const { count, error } = await supabase
          .from('learning_resources')
          .select('id', { count: 'exact', head: true })
          .eq('is_published', true);
        if (error) throw error;
        setResourceCount(count || 0);
      } catch (err) {
        console.error('Failed to load learning resources count', err);
      }
    };

    fetchProgress();
    fetchLearningResources();
  }, []);

  return (
    <div>
      <section className="sp-section">
        <div className="sp-section-header">
          <h3 className="sp-section-title">Overview</h3>
          <span style={{ fontSize: '0.8125rem', color: 'var(--pp-text-muted)' }}>Quick snapshot of your learning progress</span>
        </div>

        <div className="sp-stats-grid">
          <StatCard label="Total Articles"  value={resourceCount}           icon={BOOK_ICON} />
          <StatCard label="MCQs Completed" value={progress.uniqueMcqs}   icon={MCQ_ICON} />
          <StatCard label="Correct MCQs"   value={progress.correctAnswers} icon={CHECK_ICON} />
          <StatCard label="Attempts"        value={progress.totalAttempts} icon={ATTEMPT_ICON} />
        </div>
      </section>

      <section className="sp-section">
        <div className="sp-section-header">
          <h3 className="sp-section-title">Learning Resources</h3>
          <button className="sp-section-action">View All</button>
        </div>

        <div className="sp-resources-grid">
          <ResourceCard title="Study Materials"  desc="Curated notes and PDFs to support learning."              icon={RESOURCE_ICONS.study} target="medicine" />
          <ResourceCard title="MCQ Practice"     desc="Practice multiple choice questions and track progress."  icon={RESOURCE_ICONS.mcq} target="mcq" />
          <ResourceCard title="3D Organ Models"  desc="Interactive 3D anatomical models for study."            icon={RESOURCE_ICONS.organ} target="viewer" />
          <ResourceCard title="Diagnostic Lab"   desc="AI patient simulator & diagnostics."                    icon={RESOURCE_ICONS.study} target="diag" />
          <ResourceCard title="Medicine Info"    desc="Drug information & FDA labels."                         icon={RESOURCE_ICONS.study} target="medicine" />
          <ResourceCard title="MRI Viewer"       desc="MRI prediction models and tools."                      icon={RESOURCE_ICONS.organ} target="mri" />
        </div>
      </section>

    </div>
  );
};

export default StudentDashboard;
