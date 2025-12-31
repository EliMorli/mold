import { useState } from "react";
import { X, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function TechnicianModal({ technician, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    certification: '',
    certification_expiry: '',
    status: 'Active',
    specialization: [],
    rating: 5,
    notes: '',
    permission_level: 'Field Tech',
    is_field_tech: true,
    can_be_assigned_jobs: true,
    track_location: false,
    color_code: 'Blue',
    invitation_sent: false,
    ...technician
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const colorOptions = [
    { value: 'Pink', color: 'bg-pink-400' },
    { value: 'Blue', color: 'bg-blue-400' },
    { value: 'Green', color: 'bg-green-400' },
    { value: 'Orange', color: 'bg-orange-400' },
    { value: 'Purple', color: 'bg-purple-400' },
    { value: 'Red', color: 'bg-red-400' },
    { value: 'Cyan', color: 'bg-cyan-400' },
    { value: 'Yellow', color: 'bg-yellow-400' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="clay-card rounded-3xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {technician ? 'Edit Technician' : 'New Technician'}
          </h2>
          <button
            onClick={onClose}
            className="clay-button rounded-2xl p-2 hover:scale-110 transition-transform"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {!technician && (
          <div className="clay-button rounded-2xl p-4 bg-blue-50 mb-6 flex items-start gap-3">
            <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              An invitation will be sent to the email address you provide, allowing the technician to access the system.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-bold text-orange-600 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="clay-button rounded-2xl border-0"
                  placeholder="John Smith"
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
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Phone *</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="clay-button rounded-2xl border-0"
                  placeholder="(555) 123-4567"
                  required
                />
              </div>

              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                  <SelectTrigger className="clay-button rounded-2xl border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="On Leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Permissions & Settings */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-lg font-bold text-purple-600 mb-4">Permissions & Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Permission Level</Label>
                <Select value={formData.permission_level} onValueChange={(value) => setFormData({...formData, permission_level: value})}>
                  <SelectTrigger className="clay-button rounded-2xl border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Field Tech">Field Tech</SelectItem>
                    <SelectItem value="Office Staff">Office Staff</SelectItem>
                    <SelectItem value="View Only">View Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Calendar Color</Label>
                <Select value={formData.color_code} onValueChange={(value) => setFormData({...formData, color_code: value})}>
                  <SelectTrigger className="clay-button rounded-2xl border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full ${option.color}`} />
                          {option.value}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="clay-button rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <Label className="text-gray-700 font-medium">Field Tech</Label>
                  <p className="text-xs text-gray-500">Is this user a field technician?</p>
                </div>
                <Switch
                  checked={formData.is_field_tech}
                  onCheckedChange={(checked) => setFormData({...formData, is_field_tech: checked})}
                />
              </div>

              <div className="clay-button rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <Label className="text-gray-700 font-medium">Can Be Assigned Jobs</Label>
                  <p className="text-xs text-gray-500">Can this user be assigned to jobs?</p>
                </div>
                <Switch
                  checked={formData.can_be_assigned_jobs}
                  onCheckedChange={(checked) => setFormData({...formData, can_be_assigned_jobs: checked})}
                />
              </div>

              <div className="clay-button rounded-2xl p-4 flex items-center justify-between md:col-span-2">
                <div>
                  <Label className="text-gray-700 font-medium">Track Location</Label>
                  <p className="text-xs text-gray-500">Enable real-time location tracking for this technician?</p>
                </div>
                <Switch
                  checked={formData.track_location}
                  onCheckedChange={(checked) => setFormData({...formData, track_location: checked})}
                />
              </div>
            </div>
          </div>

          {/* Certification */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-lg font-bold text-blue-600 mb-4">Certification</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Certification</Label>
                <Input
                  value={formData.certification}
                  onChange={(e) => setFormData({...formData, certification: e.target.value})}
                  className="clay-button rounded-2xl border-0"
                  placeholder="Certification details"
                />
              </div>

              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Cert. Expiry</Label>
                <Input
                  type="date"
                  value={formData.certification_expiry}
                  onChange={(e) => setFormData({...formData, certification_expiry: e.target.value})}
                  className="clay-button rounded-2xl border-0"
                />
              </div>

              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Rating</Label>
                <Input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={formData.rating}
                  onChange={(e) => setFormData({...formData, rating: parseFloat(e.target.value) || 5})}
                  className="clay-button rounded-2xl border-0"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="pt-4 border-t border-gray-200">
            <Label className="text-gray-700 font-medium mb-2 block">Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="clay-button rounded-2xl border-0 min-h-[100px]"
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <Button
              type="button"
              onClick={onClose}
              className="clay-button rounded-2xl px-6 py-3 font-medium text-gray-600"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="clay-button rounded-2xl px-6 py-3 font-semibold text-orange-600 hover:scale-105 transition-transform"
            >
              {technician ? 'Update' : 'Create & Send Invitation'} 
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}