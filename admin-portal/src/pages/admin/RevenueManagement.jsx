import { useState } from "react";
import { toast } from "react-toastify";

const RevenueManagement = () => {
  const [transactions, setTransactions] = useState([
    { id: "T001", date: "2026-04-28", type: "Subscription", amount: "₹299", status: "Completed", user: "Raj Kumar" },
    { id: "T002", date: "2026-04-27", type: "Consultation", amount: "₹500", status: "Completed", user: "Priya Sharma" },
    { id: "T003", date: "2026-04-26", type: "Subscription", amount: "₹99", status: "Completed", user: "Amit Singh" },
    { id: "T004", date: "2026-04-25", type: "Refund", amount: "-₹300", status: "Pending", user: "Neha Gupta" },
  ]);

  const [refunds, setRefunds] = useState([
    { id: "R001", transactionId: "T005", amount: "₹500", reason: "Unsatisfied service", status: "Pending", date: "2026-04-27" },
    { id: "R002", transactionId: "T006", amount: "₹200", reason: "Technical issue", status: "Approved", date: "2026-04-26" },
  ]);

  const [filterStatus, setFilterStatus] = useState("All");

  const handleApproveRefund = (refundId) => {
    setRefunds(prev => prev.map(r =>
      r.id === refundId ? { ...r, status: "Approved" } : r
    ));
    toast.success("Refund approved!");
  };

  const handleRejectRefund = (refundId) => {
    setRefunds(prev => prev.map(r =>
      r.id === refundId ? { ...r, status: "Rejected" } : r
    ));
    toast.error("Refund rejected!");
  };

  return (
    <div>
      <h1 className="ap-page-title">Revenue Management</h1>

      {/* Revenue Stats */}
      <section className="ap-section">
        <h2 className="ap-section-title">Revenue Overview</h2>
        <div className="ap-stats-grid">
          <div className="ap-stat-card">
            <div className="ap-stat-content">
              <p className="ap-stat-label">Total Revenue</p>
              <p className="ap-stat-value">₹45,230</p>
            </div>
          </div>
          <div className="ap-stat-card">
            <div className="ap-stat-content">
              <p className="ap-stat-label">This Month</p>
              <p className="ap-stat-value">₹12,450</p>
            </div>
          </div>
          <div className="ap-stat-card">
            <div className="ap-stat-content">
              <p className="ap-stat-label">Pending Refunds</p>
              <p className="ap-stat-value">₹500</p>
            </div>
          </div>
          <div className="ap-stat-card">
            <div className="ap-stat-content">
              <p className="ap-stat-label">Net Revenue</p>
              <p className="ap-stat-value">₹44,730</p>
            </div>
          </div>
        </div>
      </section>

      {/* Transactions */}
      <section className="ap-section">
        <h2 className="ap-section-title">Recent Transactions</h2>
        <div className="ap-table">
          <table>
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Date</th>
                <th>Type</th>
                <th>User</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((trans) => (
                <tr key={trans.id}>
                  <td className="ap-list-title">{trans.id}</td>
                  <td className="ap-list-meta">{trans.date}</td>
                  <td>{trans.type}</td>
                  <td className="ap-list-meta">{trans.user}</td>
                  <td className="ap-list-title">{trans.amount}</td>
                  <td>
                    <span className={`ap-badge ap-badge-${trans.status.toLowerCase()}`}>
                      {trans.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Refund Requests */}
      <section className="ap-section">
        <h2 className="ap-section-title">Refund Requests</h2>
        <div className="ap-card" style={{ marginBottom: '1rem' }}>
          <div className="ap-filter-buttons">
            {["All", "Pending", "Approved", "Rejected"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`ap-filter-btn ${filterStatus === status ? 'active' : ''}`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="ap-table">
          <table>
            <thead>
              <tr>
                <th>Refund ID</th>
                <th>Transaction</th>
                <th>Amount</th>
                <th>Reason</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {refunds.map((refund) => (
                <tr key={refund.id}>
                  <td className="ap-list-title">{refund.id}</td>
                  <td>{refund.transactionId}</td>
                  <td className="ap-list-title">{refund.amount}</td>
                  <td className="ap-list-meta">{refund.reason}</td>
                  <td className="ap-list-meta">{refund.date}</td>
                  <td>
                    <span className={`ap-badge ap-badge-${refund.status.toLowerCase()}`}>
                      {refund.status}
                    </span>
                  </td>
                  <td>
                    {refund.status === "Pending" && (
                      <div className="ap-button-group">
                        <button
                          onClick={() => handleApproveRefund(refund.id)}
                          className="ap-btn ap-btn-success ap-btn-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectRefund(refund.id)}
                          className="ap-btn ap-btn-danger ap-btn-sm"
                        >
                          Reject
                        </button>
                      </div>
                    )}
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

export default RevenueManagement;
