import { useState } from "react";
import { toast } from "react-toastify";

const AITriageSystem = () => {
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.75);
  const [selectedCase, setSelectedCase] = useState(null);
  const [aiModel, setAiModel] = useState("v2.1");
  const [flowType, setFlowType] = useState("standard");

  const [priorityQueue] = useState([
    { id: 1, patient: "Raj Kumar", symptoms: "High fever, cough", priority: "Critical", confidence: 0.92 },
    { id: 2, patient: "Priya Sharma", symptoms: "Mild headache", priority: "Low", confidence: 0.65 },
    { id: 3, patient: "Amit Singh", symptoms: "Chest pain", priority: "Critical", confidence: 0.88 },
    { id: 4, patient: "Neha Gupta", symptoms: "Skin rash", priority: "Medium", confidence: 0.75 },
  ]);

  const [triageDecisions] = useState([
    { id: 1, patient: "John Doe", condition: "Flu-like symptoms", decision: "Home care", confidence: 0.85 },
    { id: 2, patient: "Jane Smith", condition: "Severe chest pain", decision: "Emergency", confidence: 0.92 },
    { id: 3, patient: "Bob Johnson", condition: "Mild cough", decision: "Telemedicine", confidence: 0.78 },
  ]);

  const handleSelectCase = (caseId) => {
    setSelectedCase(caseId);
    toast.info(`Case ${caseId} selected for review`);
  };

  const handleAssignDoctor = () => {
    toast.success("Doctor assigned to the case!");
  };

  const handleUpdateSettings = () => {
    toast.success("AI settings updated successfully!");
  };

  const handleReviewDecision = (decisionId) => {
    toast.info(`Reviewing decision ${decisionId}`);
  };

  return (
    <div>
      <h1 className="ap-page-title">AI Triage System</h1>

      {/* AI Performance Stats */}
      <section className="ap-section">
        <h2 className="ap-section-title">System Performance</h2>
        <div className="ap-stats-grid">
          <div className="ap-stat-card">
            <div className="ap-stat-content">
              <p className="ap-stat-label">Accuracy</p>
              <p className="ap-stat-value">94.2%</p>
            </div>
          </div>
          <div className="ap-stat-card">
            <div className="ap-stat-content">
              <p className="ap-stat-label">Cases Processed</p>
              <p className="ap-stat-value">2,450</p>
            </div>
          </div>
          <div className="ap-stat-card">
            <div className="ap-stat-content">
              <p className="ap-stat-label">Avg Response Time</p>
              <p className="ap-stat-value">2.3s</p>
            </div>
          </div>
          <div className="ap-stat-card">
            <div className="ap-stat-content">
              <p className="ap-stat-label">Model Version</p>
              <p className="ap-stat-value">{aiModel}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Model Settings */}
      <section className="ap-section ap-card">
        <h2 className="ap-section-title" style={{ marginTop: 0, marginBottom: '1rem' }}>AI Model Settings</h2>
        
        <div className="ap-grid ap-grid-3">
          <div className="ap-form-group">
            <label className="ap-form-label">AI Model Version</label>
            <select value={aiModel} onChange={(e) => setAiModel(e.target.value)} className="ap-form-select">
              <option value="v2.0">v2.0</option>
              <option value="v2.1">v2.1</option>
              <option value="v3.0">v3.0</option>
            </select>
          </div>
          <div className="ap-form-group">
            <label className="ap-form-label">Flow Type</label>
            <select value={flowType} onChange={(e) => setFlowType(e.target.value)} className="ap-form-select">
              <option value="standard">Standard</option>
              <option value="fast">Fast</option>
              <option value="detailed">Detailed</option>
            </select>
          </div>
          <div className="ap-form-group">
            <label className="ap-form-label">Confidence Threshold: {(confidenceThreshold * 100).toFixed(0)}%</label>
            <input
              type="range"
              min="0.5"
              max="0.99"
              step="0.01"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
              className="ap-form-input"
              style={{ cursor: 'pointer' }}
            />
          </div>
        </div>

        <button onClick={handleUpdateSettings} className="ap-btn ap-btn-primary" style={{ marginTop: '1rem' }}>
          Update Settings
        </button>
      </section>

      {/* Priority Queue */}
      <section className="ap-section">
        <h2 className="ap-section-title">Priority Queue</h2>
        <div className="ap-list">
          {priorityQueue.map((item) => (
            <div
              key={item.id}
              className="ap-list-item"
              style={{ cursor: 'pointer', backgroundColor: selectedCase === item.id ? 'var(--ap-background)' : 'transparent' }}
              onClick={() => handleSelectCase(item.id)}
            >
              <div className="ap-list-icon">P</div>
              <div className="ap-list-content">
                <div className="ap-list-title">{item.patient}</div>
                <div className="ap-list-meta">{item.symptoms}</div>
                <div className="ap-list-meta" style={{ marginTop: '0.25rem' }}>
                  Confidence: {(item.confidence * 100).toFixed(0)}%
                </div>
              </div>
              <div>
                <span className={`ap-badge ap-badge-${item.priority.toLowerCase()}`}>
                  {item.priority}
                </span>
              </div>
              {selectedCase === item.id && (
                <button onClick={(e) => { e.stopPropagation(); handleAssignDoctor(); }} className="ap-btn ap-btn-primary ap-btn-sm">
                  Assign Doctor
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Triage Decisions */}
      <section className="ap-section">
        <h2 className="ap-section-title">Recent Decisions</h2>
        <div className="ap-table">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Condition</th>
                <th>AI Decision</th>
                <th>Confidence</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {triageDecisions.map((decision) => (
                <tr key={decision.id}>
                  <td className="ap-list-title">{decision.patient}</td>
                  <td className="ap-list-meta">{decision.condition}</td>
                  <td className="ap-list-title">{decision.decision}</td>
                  <td>
                    <span className={`ap-badge ${decision.confidence > 0.85 ? 'ap-badge-completed' : 'ap-badge-in-progress'}`}>
                      {(decision.confidence * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleReviewDecision(decision.id)}
                      className="ap-btn ap-btn-outline ap-btn-sm"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AITriageSystem;
