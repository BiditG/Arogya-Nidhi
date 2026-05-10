import { useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AdminContext } from "../../context/AdminContext";

const formatCurrency = (value) => `Rs ${Number(value || 0).toLocaleString()}`;
const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "-");

const RevenueManagement = () => {
  const { dashData, getDashData } = useContext(AdminContext);
  const [refunds, setRefunds] = useState([
    { id: "R001", transactionId: "T005", amount: "Rs 500", reason: "Unsatisfied service", status: "Pending", date: "2026-04-27" },
    { id: "R002", transactionId: "T006", amount: "Rs 200", reason: "Technical issue", status: "Approved", date: "2026-04-26" },
  ]);
  const [filterStatus, setFilterStatus] = useState("All");

  useEffect(() => {
    getDashData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const transactions = dashData?.revenueTransactions || [];
  const totalRevenue = Number(dashData?.totalEarnings || 0);
  const thisMonthRevenue = Number(dashData?.thisMonthEarnings || 0);
  const pendingRefundAmount = 0;
  const netRevenue = totalRevenue - pendingRefundAmount;
  const visibleRefunds = filterStatus === "All"
    ? refunds
    : refunds.filter((refund) => refund.status === filterStatus);

  const handleApproveRefund = (refundId) => {
    setRefunds((prev) => prev.map((r) =>
      r.id === refundId ? { ...r, status: "Approved" } : r
    ));
    toast.success("Refund approved!");
  };

  const handleRejectRefund = (refundId) => {
    setRefunds((prev) => prev.map((r) =>
      r.id === refundId ? { ...r, status: "Rejected" } : r
    ));
    toast.error("Refund rejected!");
  };

  return (
    <div>
      <h1 className="ap-page-title">Revenue Management</h1>

      <section className="ap-section">
        <h2 className="ap-section-title">Revenue Overview</h2>
        <div className="ap-stats-grid">
          <div className="ap-stat-card">
            <div className="ap-stat-content">
              <p className="ap-stat-label">Total Revenue</p>
              <p className="ap-stat-value">{formatCurrency(totalRevenue)}</p>
            </div>
          </div>
          <div className="ap-stat-card">
            <div className="ap-stat-content">
              <p className="ap-stat-label">This Month</p>
              <p className="ap-stat-value">{formatCurrency(thisMonthRevenue)}</p>
            </div>
          </div>
          <div className="ap-stat-card">
            <div className="ap-stat-content">
              <p className="ap-stat-label">Paid Bookings</p>
              <p className="ap-stat-value">{dashData?.paidBookingCount || 0}</p>
            </div>
          </div>
          <div className="ap-stat-card">
            <div className="ap-stat-content">
              <p className="ap-stat-label">Net Revenue</p>
              <p className="ap-stat-value">{formatCurrency(netRevenue)}</p>
            </div>
          </div>
        </div>
      </section>

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
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="ap-list-meta">No paid confirmed bookings found.</td>
                </tr>
              ) : transactions.map((trans) => (
                <tr key={trans.id || trans.appointmentId}>
                  <td className="ap-list-title">{trans.id || trans.appointmentId}</td>
                  <td className="ap-list-meta">{formatDate(trans.date)}</td>
                  <td>{trans.specialty || "Consultation"}</td>
                  <td className="ap-list-meta">{trans.patient || "Patient"} with {trans.doctor || "Doctor"}</td>
                  <td className="ap-list-title">{formatCurrency(trans.amount)}</td>
                  <td>
                    <span className="ap-badge ap-badge-verified">
                      {String(trans.status || "PAID").toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ap-section">
        <h2 className="ap-section-title">Refund Requests</h2>
        <div className="ap-card" style={{ marginBottom: "1rem" }}>
          <div className="ap-filter-buttons">
            {["All", "Pending", "Approved", "Rejected"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`ap-filter-btn ${filterStatus === status ? "active" : ""}`}
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
              {visibleRefunds.map((refund) => (
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
