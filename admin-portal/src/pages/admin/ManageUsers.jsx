import { useState, useContext, useEffect } from "react";
import { toast } from "react-toastify";
import { AdminContext } from "../../context/AdminContext";

const ManageUsers = () => {
  const { users, getAllUsers, addUser, updateUser, deleteUser, aToken } = useContext(AdminContext);
  
  const [activeFilter, setActiveFilter] = useState("ALL USERS");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", type: "Patient", status: "Active" });
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    if (aToken) {
      getAllUsers();
    }
  }, [aToken]);

  const filters = ["ALL USERS", "PATIENTS", "DOCTORS", "STUDENTS", "ADMIN"];

  const filteredUsers = users?.filter((user) => {
    const roleLower = user.role?.toLowerCase() || "";
    const matchesFilter =
      activeFilter === "ALL USERS" ||
      (activeFilter === "PATIENTS" && roleLower === "patient") ||
      (activeFilter === "DOCTORS" && roleLower === "doctor") ||
      (activeFilter === "STUDENTS" && roleLower === "student") ||
      (activeFilter === "ADMIN" && roleLower === "admin");

    const matchesSearch =
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  }) || [];

  const handleDeleteUser = async (userId) => {
    const success = await deleteUser(userId);
    if (success) {
      setShowDeleteModal(null);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    await updateUser(userId, { is_active: !currentStatus });
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email) {
      toast.error("Please fill all fields");
      return;
    }
    const success = await addUser({
      name: newUser.name,
      email: newUser.email,
      role: newUser.type.toLowerCase(),
      password: "password123" // default password
    });
    
    if (success) {
      setShowAddModal(false);
      setNewUser({ name: "", email: "", type: "Patient", status: "Active" });
    }
  };

  const openEditModal = (user) => {
    setEditingUser({ ...user });
    setShowEditModal(true);
  };

  const handleEditUser = async () => {
    if (!editingUser.name || !editingUser.email) {
      toast.error("Please fill all fields");
      return;
    }
    const success = await updateUser(editingUser.id, {
      name: editingUser.name,
      email: editingUser.email,
      role: editingUser.role
    });
    if (success) {
      setShowEditModal(false);
    }
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
                  <td>{user.id.substring(0,8)}...</td>
                  <td className="ap-list-title">{user.name}</td>
                  <td>
                    <span className="ap-badge" style={{textTransform: 'capitalize'}}>
                      {user.role}
                    </span>
                  </td>
                  <td className="ap-list-meta">{user.email}</td>
                  <td>
                    <span className={`ap-badge ap-badge-${user.is_active ? 'active' : 'inactive'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="ap-list-meta">{new Date(user.created_at).toISOString().split('T')[0]}</td>
                  <td>
                    <div className="ap-button-group">
                      <button 
                        onClick={() => openEditModal(user)}
                        className="ap-btn ap-btn-outline ap-btn-sm"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleToggleStatus(user.id, user.is_active)}
                        className="ap-btn ap-btn-warning ap-btn-sm"
                      >
                        {user.is_active ? "Deactivate" : "Activate"}
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
          Showing {filteredUsers.length} of {users?.length || 0} users
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

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="ap-modal">
          <div className="ap-modal-content">
            <div className="ap-modal-header">
              <h3 className="ap-modal-title">Edit User</h3>
            </div>
            <div className="ap-modal-body">
              <div className="ap-form-group">
                <label className="ap-form-label">Name</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="ap-form-input"
                />
              </div>
              <div className="ap-form-group">
                <label className="ap-form-label">Email</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="ap-form-input"
                />
              </div>
              <div className="ap-form-group">
                <label className="ap-form-label">User Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="ap-form-select"
                >
                  <option value="patient">Patient</option>
                  <option value="doctor">Doctor</option>
                  <option value="student">Student</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="ap-modal-footer">
              <button
                onClick={() => setShowEditModal(false)}
                className="ap-btn ap-btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleEditUser}
                className="ap-btn ap-btn-primary"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;
