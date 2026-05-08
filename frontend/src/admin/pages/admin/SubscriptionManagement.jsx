import { useState } from "react";
import { toast } from "react-toastify";

const SubscriptionManagement = () => {
  const [plans] = useState([
    { id: 1, name: "Basic", price: "₹99/mo", features: "5 consultations", subscribers: 120, status: "Active" },
    { id: 2, name: "Professional", price: "₹299/mo", features: "Unlimited consultations", subscribers: 340, status: "Active" },
    { id: 3, name: "Premium", price: "₹599/mo", features: "Priority support + Analytics", subscribers: 85, status: "Active" },
  ]);

  const [subscriptions, setSubscriptions] = useState([
    { id: "S001", user: "Raj Kumar", plan: "Professional", startDate: "2026-03-15", endDate: "2026-05-15", status: "Active" },
    { id: "S002", user: "Priya Sharma", plan: "Basic", startDate: "2026-04-01", endDate: "2026-05-01", status: "Active" },
    { id: "S003", user: "Amit Singh", plan: "Premium", startDate: "2026-02-20", endDate: "2026-08-20", status: "Active" },
    { id: "S004", user: "Neha Gupta", plan: "Professional", startDate: "2026-03-01", endDate: "2026-04-01", status: "Expired" },
  ]);

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [newPlan, setNewPlan] = useState({ name: "", price: "", features: "" });

  const handleSavePlan = () => {
    if (!newPlan.name || !newPlan.price) {
      toast.error("Please fill all plan details");
      return;
    }
    toast.success("Plan saved successfully!");
    setShowPlanModal(false);
    setNewPlan({ name: "", price: "", features: "" });
  };

  const handleCancelSubscription = (subId) => {
    setSubscriptions(prev => prev.map(sub =>
      sub.id === subId ? { ...sub, status: "Cancelled" } : sub
    ));
    toast.success("Subscription cancelled!");
  };

  return (
    <div>
      <h1 className="ap-page-title">Subscription Management</h1>

      {/* Subscription Stats */}
      <section className="ap-section">
        <h2 className="ap-section-title">Subscription Overview</h2>
        <div className="ap-stats-grid">
          <div className="ap-stat-card">
            <div className="ap-stat-content">
              <p className="ap-stat-label">Total Subscribers</p>
              <p className="ap-stat-value">545</p>
            </div>
          </div>
          <div className="ap-stat-card">
            <div className="ap-stat-content">
              <p className="ap-stat-label">Monthly Revenue</p>
              <p className="ap-stat-value">₹2,18,000</p>
            </div>
          </div>
          <div className="ap-stat-card">
            <div className="ap-stat-content">
              <p className="ap-stat-label">Active Plans</p>
              <p className="ap-stat-value">{plans.length}</p>
            </div>
          </div>
          <div className="ap-stat-card">
            <div className="ap-stat-content">
              <p className="ap-stat-label">Churn Rate</p>
              <p className="ap-stat-value">2.3%</p>
            </div>
          </div>
        </div>
      </section>

      {/* Subscription Plans */}
      <section className="ap-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 className="ap-section-title" style={{ margin: 0 }}>Subscription Plans</h2>
          <button
            onClick={() => {
              setSelectedPlan(null);
              setNewPlan({ name: "", price: "", features: "" });
              setShowPlanModal(true);
            }}
            className="ap-btn ap-btn-primary"
          >
            + New Plan
          </button>
        </div>
        <div className="ap-grid ap-grid-3">
          {plans.map((plan) => (
            <div key={plan.id} className="ap-card">
              <h3 className="ap-card-title" style={{ marginBottom: '0.5rem' }}>{plan.name}</h3>
              <p className="ap-card-subtitle" style={{ fontSize: '1.25rem', color: 'var(--ap-primary)', marginBottom: '1rem' }}>
                {plan.price}
              </p>
              <div className="ap-form-group">
                <p className="ap-list-meta">{plan.features}</p>
              </div>
              <div className="ap-form-group">
                <p className="ap-list-meta">{plan.subscribers} subscribers</p>
              </div>
              <div className="ap-button-group">
                <button
                  onClick={() => {
                    setSelectedPlan(plan);
                    setNewPlan({ name: plan.name, price: plan.price, features: plan.features });
                    setShowPlanModal(true);
                  }}
                  className="ap-btn ap-btn-secondary"
                >
                  Edit
                </button>
                <button
                  onClick={() => toast.success("Plan deleted!")}
                  className="ap-btn ap-btn-danger"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Active Subscriptions */}
      <section className="ap-section">
        <h2 className="ap-section-title">Active Subscriptions</h2>
        <div className="ap-table">
          <table>
            <thead>
              <tr>
                <th>Subscription ID</th>
                <th>User</th>
                <th>Plan</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => (
                <tr key={sub.id}>
                  <td className="ap-list-title">{sub.id}</td>
                  <td>{sub.user}</td>
                  <td className="ap-list-meta">{sub.plan}</td>
                  <td className="ap-list-meta">{sub.startDate}</td>
                  <td className="ap-list-meta">{sub.endDate}</td>
                  <td>
                    <span className={`ap-badge ap-badge-${sub.status.toLowerCase()}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td>
                    {sub.status === "Active" && (
                      <button
                        onClick={() => handleCancelSubscription(sub.id)}
                        className="ap-btn ap-btn-danger ap-btn-sm"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Plan Modal */}
      {showPlanModal && (
        <div className="ap-modal">
          <div className="ap-modal-content">
            <div className="ap-modal-header">
              <h3 className="ap-modal-title">
                {selectedPlan ? "Edit Plan" : "Create New Plan"}
              </h3>
            </div>
            <div className="ap-modal-body">
              <div className="ap-form-group">
                <label className="ap-form-label">Plan Name</label>
                <input
                  type="text"
                  value={newPlan.name}
                  onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                  className="ap-form-input"
                  placeholder="e.g., Premium"
                />
              </div>
              <div className="ap-form-group">
                <label className="ap-form-label">Price</label>
                <input
                  type="text"
                  value={newPlan.price}
                  onChange={(e) => setNewPlan({ ...newPlan, price: e.target.value })}
                  className="ap-form-input"
                  placeholder="e.g., ₹299/mo"
                />
              </div>
              <div className="ap-form-group">
                <label className="ap-form-label">Features</label>
                <textarea
                  value={newPlan.features}
                  onChange={(e) => setNewPlan({ ...newPlan, features: e.target.value })}
                  className="ap-form-textarea"
                  placeholder="Comma-separated features"
                />
              </div>
            </div>
            <div className="ap-modal-footer">
              <button
                onClick={() => setShowPlanModal(false)}
                className="ap-btn ap-btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePlan}
                className="ap-btn ap-btn-primary"
              >
                Save Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManagement;
