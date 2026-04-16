import { useState } from "react";
import { X, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function UserModal({ user, onClose, onSave, onDelete, saving = false }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Viewer',
    status: user ? user.status : 'Pending',
    ...user
  });
  const [showPassword, setShowPassword] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Don't send password for existing users unless it was changed
    const dataToSave = { ...formData };
    if (user && !formData.password) {
      delete dataToSave.password;
    }
    onSave(dataToSave);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="clay-card rounded-3xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {user ? 'Edit User' : 'Create New User'}
          </h2>
          <button
            onClick={onClose}
            className="clay-button rounded-2xl p-2 hover:scale-110 transition-transform"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {!user && (
          <div className="bg-blue-50 rounded-2xl p-4 mb-6">
            <p className="text-sm text-blue-700">
              <strong>Admin-Controlled Registration:</strong><br />
              You set the user's email and password. After creation, a verification
              email will be sent to the user. They must verify their email before
              they can log in.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label className="text-gray-700 font-medium mb-2 block">Full Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="clay-button rounded-2xl border-0"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <Label className="text-gray-700 font-medium mb-2 block">Email Address *</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="clay-button rounded-2xl border-0"
              placeholder="user@example.com"
              required
            />
          </div>

          <div>
            <Label className="text-gray-700 font-medium mb-2 block">
              {user ? 'New Password (leave blank to keep current)' : 'Password *'}
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={formData.password || ''}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="clay-button rounded-2xl border-0 pr-10"
                placeholder={user ? "Leave blank to keep current" : "Secure password"}
                required={!user}
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {!user && (
              <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
            )}
          </div>

          <div>
            <Label className="text-gray-700 font-medium mb-2 block">Role *</Label>
            <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
              <SelectTrigger className="clay-button rounded-2xl border-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Admin">Admin - Full access</SelectItem>
                <SelectItem value="Manager">Manager - Manage tests & staff</SelectItem>
                <SelectItem value="Technician">Technician - Field work</SelectItem>
                <SelectItem value="Viewer">Viewer - Read only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {user && (
            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                <SelectTrigger className="clay-button rounded-2xl border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Verified">Verified</SelectItem>
                  <SelectItem value="Pending">Pending Verification</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-3 justify-between pt-4">
            <div>
              {user && onDelete && (
                confirmDelete ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-red-600">Confirm delete?</span>
                    <Button
                      type="button"
                      onClick={onDelete}
                      className="bg-red-500 hover:bg-red-600 text-white rounded-xl px-3 py-1 text-sm"
                    >
                      Yes
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="clay-button rounded-xl px-3 py-1 text-sm text-gray-600"
                    >
                      No
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="clay-button rounded-2xl px-4 py-2 text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                )
              )}
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={onClose}
                className="clay-button rounded-2xl px-6 py-3 font-medium text-gray-600"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="clay-button rounded-2xl px-6 py-3 font-semibold text-purple-600 hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : (user ? 'Update User' : 'Create & Send Verification')}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
