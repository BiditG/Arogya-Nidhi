import { useState } from "react";
import { toast } from "react-toastify";

const ManageUsers = () => {
  const [activeFilter, setActiveFilter] = useState("ALL USERS");
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState([
    {
      id: "U001",
      name: "Raj Kumar",
      type: "Patient",
      email: "raj.kumar@email.com",
      status: "Active",
      joined: "2026-01-15",
    },
    {
      id: "U002",
      name: "Dr. Priya Sharma",
      type: "Doctor",
      email: "priya.sharma@hospital.com",
      status: "Active",
      joined: "2026-02-20",
    },
    {
      id: "U003",
      name: "Amit Singh",
      type: "Patient",
      email: "amit.singh@email.com",
      status: "Active",
      joined: "2026-01-28",
    },
    {
      id: "U004",
      name: "Dr. John Smith",
      type: "Doctor",
      email: "john.smith@hospital.com",
      status: "Pending",
      joined: "2026-04-01",
    },
    {
      id: "U005",
      name: "Neha Gupta",
      type: "Student",
      email: "neha.gupta@university.edu",
      status: "Active",
      joined: "2026-03-10",
    },
    {
      id: "U006",
      name: "Admin User",
      type: "Admin",
      email: "admin@system.com",
      status: "Active",
      joined: "2025-01-01",
    },
  ]);

  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", type: "Patient", status: "Active" });

  const filters = ["ALL USERS", "PATIENTS", "DOCTORS", "STUDENTS", "ADMIN"];

  const filteredUsers = users.filter((user) => {
    const matchesFilter =
      activeFilter === "ALL USERS" ||
      (activeFilter === "PATIENTS" && user.type === "Patient") ||
      (activeFilter === "DOCTORS" && user.type === "Doctor") ||
      (activeFilter === "STUDENTS" && user.type === "Student") ||
      (activeFilter === "ADMIN" && user.type === "Admin");

    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const handleDeleteUser = (userId) => {
    setUsers(users.filter(u => u.id !== userId));
    toast.error("User deleted successfully");
    setShowDeleteModal(null);
  };

  const handleToggleStatus = (userId) => {
    setUsers(users.map(u =>
      u.id === userId
        ? { ...u, status: u.status === "Active" ? "Inactive" : "Active" }
        : u
    ));
    const user = users.find(u => u.id === userId);
    toast.success(`${user.name} status updated`);
  };

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) {
      toast.error("Please fill all fields");
      return;
    }
    const userId = `U${String(users.length + 1).padStart(3, "0")}`;
    setUsers([...users, {
      id: userId,
      ...newUser,
      joined: new Date().toISOString().split('T')[0]
    }]);
    toast.success("User added successfully");
    setShowAddModal(false);
    setNewUser({ name: "", email: "", type: "Patient", status: "Active" });
  };

  return (
    <div>
      <h1 className="ap-page-title">User Management</h1>

      {/* Search and Filters */}
      <section className="ap-section ap-card">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 ap-search-box"
          />
          <button 
            onClick={() => setShowAddModal(true)}
            className="ap-btn ap-btn-primary"
          >
            + Add User
          </button>
        </div>

        {/* Filter Buttons */}
        <div className="ap-filter-buttons">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`ap-filter-btn ${activeFilter === filter ? 'active' : ''}`}
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      {/* Users Table */}
      <section className="ap-section ap-table">
        <table>
          <thead>
            <tr>
              <th>User ID</th>
              <th>Name</th>
              <th>Type</th>
              <th>Email</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td className="ap-list-title">{user.name}</td>
                  <td>
                    <span className="ap-badge">
                      {user.type}
                    </span>
                  </td>
                  <td className="ap-list-meta">{user.email}</td>
                  <td>
                    <span className={`ap-badge ap-badge-${user.status.toLowerCase()}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="ap-list-meta">{user.joined}</td>
                  <td>
                    <div className="ap-button-group">
                      <button 
                        onClick={() => toast.info(`Viewing ${user.name}`)}
                        className="ap-btn ap-btn-outline ap-btn-sm"
                      >
                        View
                      </button>
                      <button 
                        onClick={() => handleToggleStatus(user.id)}
                        className="ap-btn ap-btn-warning ap-btn-sm"
                      >
                        {user.status === "Active" ? "Deactivate" : "Activate"}
                      </button>
                      <button 
                        onClick={() => setShowDeleteModal(user.id)}
                        className="ap-btn ap-btn-danger ap-btn-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* Pagination */}
      <section className="ap-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p className="ap-list-meta">
          Showing {filteredUsers.length} of {users.length} users
        </p>
        <div className="ap-button-group">
          <button className="ap-btn ap-btn-outline ap-btn-sm">Previous</button>
          <button className="ap-btn ap-btn-primary ap-btn-sm">1</button>
          <button className="ap-btn ap-btn-outline ap-btn-sm">2</button>
          <button className="ap-btn ap-btn-outline ap-btn-sm">Next</button>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="ap-modal">
          <div className="ap-modal-content">
            <div className="ap-modal-header">
              <h3 className="ap-modal-title">Delete User</h3>
            </div>
            <div className="ap-modal-body">
              <p className="ap-list-meta">Are you sure you want to delete this user? This action cannot be undone.</p>
            </div>
            <div className="ap-modal-footer">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="ap-btn ap-btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(showDeleteModal)}
                className="ap-btn ap-btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="ap-modal">
          <div className="ap-modal-content">
            <div className="ap-modal-header">
              <h3 className="ap-modal-title">Add New User</h3>
            </div>
            <div className="ap-modal-body">
              <div className="ap-form-group">
                <label className="ap-form-label">Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="ap-form-input"
                  placeholder="Full Name"
                />
              </div>
              <div className="ap-form-group">
                <label className="ap-form-label">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="ap-form-input"
                  placeholder="user@email.com"
                />
              </div>
              <div className="ap-form-group">
                <label className="ap-form-label">User Type</label>
                <select
                  value={newUser.type}
                  onChange={(e) => setNewUser({ ...newUser, type: e.target.value })}
                  className="ap-form-select"
                >
                  <option>Patient</option>
                  <option>Doctor</option>
                  <option>Student</option>
                  <option>Admin</option>
                </select>
              </div>
            </div>
            <div className="ap-modal-footer">
              <button
                onClick={() => setShowAddModal(false)}
                className="ap-btn ap-btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                className="ap-btn ap-btn-primary"
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;
