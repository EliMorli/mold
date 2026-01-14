import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Search, User, Mail, Shield, CheckCircle, Clock, Copy, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import UserModal from "../components/users/UserModal";

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showVerificationInfo, setShowVerificationInfo] = useState(null);

  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date'),
    staleTime: 0,
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      // Generate a 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      return base44.entities.User.create({
        ...data,
        status: 'Pending',
        verification_code: verificationCode,
      });
    },
    onSuccess: (newUser) => {
      queryClient.invalidateQueries(['users']);
      setShowModal(false);
      setSelectedUser(null);
      // Show verification info for the new user
      setShowVerificationInfo(newUser);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setShowModal(false);
      setSelectedUser(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.User.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
    },
  });

  const resendVerification = (user) => {
    // Generate new verification code
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    updateMutation.mutate({
      id: user.id,
      data: { verification_code: newCode }
    });
    setShowVerificationInfo({ ...user, verification_code: newCode });
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusColors = {
    'Verified': 'bg-green-100 text-green-700',
    'Pending': 'bg-yellow-100 text-yellow-700',
    'Suspended': 'bg-red-100 text-red-700',
  };

  const roleColors = {
    'Admin': 'from-purple-400 to-purple-500',
    'Technician': 'from-blue-400 to-blue-500',
    'Viewer': 'from-gray-400 to-gray-500',
    'Manager': 'from-orange-400 to-orange-500',
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="clay-card rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
              User Management
            </h1>
            <p className="text-gray-500 mt-1">{users.length} total users</p>
          </div>
          <Button
            onClick={() => {
              setSelectedUser(null);
              setShowModal(true);
            }}
            className="clay-button rounded-2xl px-6 py-3 flex items-center gap-2 font-semibold text-purple-600 hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            New User
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="clay-card rounded-3xl p-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 clay-button rounded-2xl border-0 h-12 text-gray-700"
          />
        </div>
      </div>

      {/* Verification Info Modal */}
      {showVerificationInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="clay-card rounded-3xl p-8 max-w-md mx-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-500 flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Verification Email Sent!</h3>
              <p className="text-gray-500 mb-4">
                (Demo Mode: In production, an email would be sent to {showVerificationInfo.email})
              </p>

              <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                <p className="text-sm text-gray-500 mb-2">Verification Code:</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl font-mono font-bold text-purple-600 tracking-widest">
                    {showVerificationInfo.verification_code}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(showVerificationInfo.verification_code)}
                    className="p-2"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 rounded-2xl p-4 mb-6 text-left">
                <p className="text-sm text-blue-700">
                  <strong>Demo Instructions:</strong><br />
                  The user would receive an email with a link to:<br />
                  <code className="text-xs bg-blue-100 px-1 rounded">/verify</code><br />
                  Where they enter their email and this code to activate their account.
                </p>
              </div>

              <Button
                onClick={() => setShowVerificationInfo(null)}
                className="clay-button rounded-2xl px-6 py-2 font-semibold text-purple-600"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((user) => (
          <div
            key={user.id}
            className="clay-card clay-card-hover rounded-3xl p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${roleColors[user.role] || 'from-gray-400 to-gray-500'} flex items-center justify-center shadow-inner`}>
                <User className="w-7 h-7 text-white" />
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className={`${statusColors[user.status]} rounded-xl px-3 py-1 font-medium text-xs`}>
                  {user.status === 'Verified' ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      {user.status}
                    </span>
                  ) : user.status === 'Pending' ? (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {user.status}
                    </span>
                  ) : (
                    user.status
                  )}
                </Badge>
                <Badge className="bg-purple-100 text-purple-700 rounded-xl px-2 py-0.5 text-xs">
                  <span className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    {user.role}
                  </span>
                </Badge>
              </div>
            </div>

            <h3 className="font-bold text-gray-800 text-lg mb-1">{user.name}</h3>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4 text-purple-400" />
                <span className="truncate">{user.email}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
              {user.status === 'Pending' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => resendVerification(user)}
                  className="text-yellow-600 hover:text-yellow-700 text-xs"
                >
                  <Send className="w-3 h-3 mr-1" />
                  Resend Code
                </Button>
              ) : (
                <span className="text-xs text-gray-400">
                  Created: {new Date(user.created_date).toLocaleDateString()}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedUser(user);
                  setShowModal(true);
                }}
                className="text-purple-600 hover:text-purple-700 text-xs"
              >
                Edit
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredUsers.length === 0 && !isLoading && (
        <div className="clay-card rounded-3xl p-12 text-center">
          <User className="w-16 h-16 text-purple-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">No users found</h3>
          <p className="text-gray-500">Try adjusting your search or add a new user</p>
        </div>
      )}

      {/* User Modal */}
      {showModal && (
        <UserModal
          user={selectedUser}
          onClose={() => {
            setShowModal(false);
            setSelectedUser(null);
          }}
          onSave={(data) => {
            if (selectedUser) {
              updateMutation.mutate({ id: selectedUser.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
          onDelete={selectedUser ? () => {
            deleteMutation.mutate(selectedUser.id);
            setShowModal(false);
            setSelectedUser(null);
          } : null}
        />
      )}
    </div>
  );
}
