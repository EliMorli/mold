import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User } from "@/api/entities";
import { useAuth } from "@/components/useAuth";
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  X,
  Eye,
  EyeOff,
  Shield,
  Check,
  AlertCircle,
  UserPlus,
  Search,
} from "lucide-react";

// Available resources for permissions
const RESOURCES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "tests", label: "Tests" },
  { key: "clients", label: "Clients" },
  { key: "technicians", label: "Technicians" },
  { key: "labs", label: "Labs" },
  { key: "invoices", label: "Invoices" },
  { key: "payments", label: "Payments" },
  { key: "expenses", label: "Expenses" },
  { key: "calendar", label: "Calendar" },
  { key: "map", label: "Map" },
  { key: "documents", label: "Documents" },
  { key: "reports", label: "Reports" },
  { key: "communications", label: "Communications" },
  { key: "automation", label: "Automation" },
  { key: "owner-view", label: "Owner View" },
  { key: "settings", label: "Settings" },
  { key: "users", label: "User Management" },
];

// Default permissions templates by role
const ROLE_TEMPLATES = {
  Admin: RESOURCES.reduce((acc, r) => {
    acc[r.key] = { view: true, edit: true, create: true, delete: true };
    return acc;
  }, {}),
  Technician: {
    dashboard: { view: true, edit: true },
    tests: { view: true, edit: true, create: true, delete: false },
    clients: { view: true, edit: false, create: false, delete: false },
    technicians: { view: true, edit: false, create: false, delete: false },
    labs: { view: true, edit: false, create: false, delete: false },
    calendar: { view: true, edit: true },
    map: { view: true, edit: true },
    documents: { view: true, edit: false, create: false, delete: false },
    reports: { view: true, edit: false },
  },
  Client: {
    dashboard: { view: true, edit: false },
    tests: { view: true, edit: false },
    invoices: { view: true, edit: false },
    payments: { view: true, edit: false },
    reports: { view: true, edit: false },
  },
  "View Only": {
    dashboard: { view: true, edit: false },
    reports: { view: true, edit: false },
  },
};

export default function UserManagement() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    full_name: "",
    email: "",
    role: "Technician",
    permissions: ROLE_TEMPLATES["Technician"],
    status: "Active",
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => User.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => User.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      closeModal();
    },
    onError: (err) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
      closeModal();
    },
    onError: (err) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => User.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["users"]);
    },
  });

  const openModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        password: "", // Don't show existing password
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        permissions: user.permissions || ROLE_TEMPLATES[user.role] || {},
        status: user.status,
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: "",
        password: "",
        full_name: "",
        email: "",
        role: "Technician",
        permissions: ROLE_TEMPLATES["Technician"],
        status: "Active",
      });
    }
    setError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setError("");
    setShowPassword(false);
  };

  const handleRoleChange = (role) => {
    setFormData({
      ...formData,
      role,
      permissions: ROLE_TEMPLATES[role] || {},
    });
  };

  const handlePermissionChange = (resource, permission, value) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [resource]: {
          ...(formData.permissions[resource] || {}),
          [permission]: value,
        },
      },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.username || !formData.full_name) {
      setError("Username and full name are required");
      return;
    }

    if (!editingUser && !formData.password) {
      setError("Password is required for new users");
      return;
    }

    // Check for duplicate username
    const existingUser = users.find(
      (u) => u.username === formData.username && u.id !== editingUser?.id
    );
    if (existingUser) {
      setError("Username already exists");
      return;
    }

    const userData = {
      ...formData,
      // Only include password if it's set (for new users or password changes)
      ...(formData.password ? { password: formData.password } : {}),
    };

    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: userData });
    } else {
      createMutation.mutate(userData);
    }
  };

  const handleDelete = (user) => {
    if (user.id === currentUser?.id) {
      alert("You cannot delete your own account");
      return;
    }
    if (confirm(`Are you sure you want to delete user "${user.full_name}"?`)) {
      deleteMutation.mutate(user.id);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "Admin":
        return "bg-purple-100 text-purple-700";
      case "Technician":
        return "bg-blue-100 text-blue-700";
      case "Client":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <Shield className="w-7 h-7 text-purple-500" />
            User Management
          </h1>
          <p className="text-gray-500 mt-1">
            Create and manage user accounts and permissions
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="clay-card clay-card-hover px-6 py-3 rounded-2xl flex items-center gap-2 text-purple-600 font-medium"
        >
          <UserPlus className="w-5 h-5" />
          Add User
        </button>
      </div>

      {/* Search */}
      <div className="clay-card rounded-2xl p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/50 border-0 focus:ring-2 focus:ring-purple-400 outline-none"
          />
        </div>
      </div>

      {/* Users List */}
      <div className="clay-card rounded-3xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchTerm ? "No users found matching your search" : "No users found"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    Username
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center">
                          <span className="text-white font-bold">
                            {user.full_name?.[0]?.toUpperCase() || "U"}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            {user.full_name}
                          </p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{user.username}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(
                          user.role
                        )}`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          user.status === "Active"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openModal(user)}
                          className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 hover:text-purple-600 transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          disabled={user.id === currentUser?.id}
                          className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 hover:text-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="clay-card rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingUser ? "Edit User" : "Create New User"}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 rounded-xl hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:ring-2 focus:ring-purple-400 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:ring-2 focus:ring-purple-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:ring-2 focus:ring-purple-400 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Password {editingUser ? "(leave blank to keep current)" : "*"}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-white/50 border border-gray-200 focus:ring-2 focus:ring-purple-400 outline-none"
                      required={!editingUser}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:ring-2 focus:ring-purple-400 outline-none"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Technician">Technician</option>
                    <option value="Client">Client</option>
                    <option value="View Only">View Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:ring-2 focus:ring-purple-400 outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Permissions */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-500" />
                  Permissions
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Customize what this user can access and do
                </p>
                <div className="bg-gray-50/50 rounded-2xl p-4 space-y-3 max-h-64 overflow-y-auto">
                  <div className="grid grid-cols-5 gap-2 text-xs font-medium text-gray-500 pb-2 border-b border-gray-200">
                    <div className="col-span-1">Resource</div>
                    <div className="text-center">View</div>
                    <div className="text-center">Edit</div>
                    <div className="text-center">Create</div>
                    <div className="text-center">Delete</div>
                  </div>
                  {RESOURCES.map((resource) => (
                    <div
                      key={resource.key}
                      className="grid grid-cols-5 gap-2 items-center"
                    >
                      <div className="col-span-1 text-sm text-gray-700">
                        {resource.label}
                      </div>
                      {["view", "edit", "create", "delete"].map((perm) => (
                        <div key={perm} className="text-center">
                          <button
                            type="button"
                            onClick={() =>
                              handlePermissionChange(
                                resource.key,
                                perm,
                                !formData.permissions[resource.key]?.[perm]
                              )
                            }
                            className={`w-6 h-6 rounded-lg transition ${
                              formData.permissions[resource.key]?.[perm]
                                ? "bg-purple-500 text-white"
                                : "bg-gray-200 text-gray-400"
                            }`}
                          >
                            {formData.permissions[resource.key]?.[perm] && (
                              <Check className="w-4 h-4 mx-auto" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-6 py-2.5 rounded-xl bg-purple-500 text-white hover:bg-purple-600 transition disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingUser
                    ? "Update User"
                    : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .clay-card {
          background: linear-gradient(145deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7));
          box-shadow:
            8px 8px 20px rgba(139, 92, 246, 0.08),
            -8px -8px 20px rgba(255, 255, 255, 0.9),
            inset 2px 2px 4px rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(10px);
        }

        .clay-card-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .clay-card-hover:hover {
          transform: translateY(-2px);
          box-shadow:
            12px 12px 28px rgba(139, 92, 246, 0.12),
            -12px -12px 28px rgba(255, 255, 255, 1),
            inset 2px 2px 4px rgba(255, 255, 255, 0.6);
        }
      `}</style>
    </div>
  );
}
