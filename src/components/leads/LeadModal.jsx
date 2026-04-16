import { useState } from "react";
import { X, User, Phone, Mail, MapPin, DollarSign, FileText, CheckCircle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function LeadModal({ lead, onClose, onSave, onConvertToClient, converting = false, saving = false }) {
  const [formData, setFormData] = useState({
    client_name: '',
    phone: '',
    email: '',
    address: '',
    lead_source: '',
    status: 'Pending',
    quote_amount: 0,
    amount: 0,
    invoice_number: '',
    invoice_sent: false,
    in_reports: false,
    out_reports: false,
    paid: false,
    notes: '',
    scheduled_date: '',
    ...lead
  });

  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!formData.client_name || formData.client_name.trim() === '') {
      newErrors.client_name = 'Client name is required';
    }
    if (!formData.phone || formData.phone.trim() === '') {
      newErrors.phone = 'Phone number is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave(formData);
  };

  const leadSources = [
    'Website',
    'Google',
    'Referral',
    'Facebook',
    'Instagram',
    'Yelp',
    'HomeAdvisor',
    'Angi',
    'Thumbtack',
    'Word of Mouth',
    'Repeat Client',
    'Other'
  ];

  const statusOptions = [
    { value: 'Follow Up', color: 'bg-yellow-300' },
    { value: 'Pending', color: 'bg-yellow-100' },
    { value: 'Scheduled', color: 'bg-gray-200' },
    { value: 'Completed', color: 'bg-green-200' },
    { value: 'Canceled', color: 'bg-red-200' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="clay-card rounded-3xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {lead ? 'Edit Lead' : 'New Lead'}
          </h2>
          <button
            onClick={onClose}
            className="clay-button rounded-2xl p-2 hover:scale-110 transition-transform"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-bold text-purple-600 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Client Name *</Label>
                <Input
                  value={formData.client_name}
                  onChange={(e) => {
                    setFormData({...formData, client_name: e.target.value});
                    if (errors.client_name) setErrors({...errors, client_name: null});
                  }}
                  className={`clay-button rounded-2xl border-0 ${errors.client_name ? 'ring-2 ring-red-400' : ''}`}
                  placeholder="John Smith"
                />
                {errors.client_name && (
                  <p className="text-red-500 text-xs mt-1">{errors.client_name}</p>
                )}
              </div>

              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Phone *</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => {
                    setFormData({...formData, phone: e.target.value});
                    if (errors.phone) setErrors({...errors, phone: null});
                  }}
                  className={`clay-button rounded-2xl border-0 ${errors.phone ? 'ring-2 ring-red-400' : ''}`}
                  placeholder="(555) 123-4567"
                />
                {errors.phone && (
                  <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                )}
              </div>

              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="clay-button rounded-2xl border-0"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Lead Source</Label>
                <Select
                  value={formData.lead_source}
                  onValueChange={(value) => setFormData({...formData, lead_source: value})}
                >
                  <SelectTrigger className="clay-button rounded-2xl border-0">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {leadSources.map(source => (
                      <SelectItem key={source} value={source}>{source}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label className="text-gray-700 font-medium mb-2 block">Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="clay-button rounded-2xl border-0"
                  placeholder="123 Main St, City, State ZIP"
                />
              </div>
            </div>
          </div>

          {/* Status & Scheduling */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-lg font-bold text-blue-600 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Status & Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({...formData, status: value})}
                >
                  <SelectTrigger className="clay-button rounded-2xl border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${option.color}`} />
                          {option.value}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Scheduled Date</Label>
                <Input
                  type="datetime-local"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})}
                  className="clay-button rounded-2xl border-0"
                />
              </div>

              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Quote Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="number"
                    value={formData.quote_amount}
                    onChange={(e) => setFormData({...formData, quote_amount: parseFloat(e.target.value) || 0})}
                    className="clay-button rounded-2xl border-0 pl-9"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Final Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                    className="clay-button rounded-2xl border-0 pl-9"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Invoice & Tracking */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-lg font-bold text-green-600 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Invoice & Tracking
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Invoice Number</Label>
                <Input
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({...formData, invoice_number: e.target.value})}
                  className="clay-button rounded-2xl border-0"
                  placeholder="INV-001"
                />
              </div>

              <div className="clay-button rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <Label className="text-gray-700 font-medium">Invoice Sent</Label>
                  <p className="text-xs text-gray-500">Has the invoice been sent?</p>
                </div>
                <Switch
                  checked={formData.invoice_sent}
                  onCheckedChange={(checked) => setFormData({...formData, invoice_sent: checked})}
                />
              </div>

              <div className="clay-button rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <Label className="text-gray-700 font-medium">In Reports</Label>
                  <p className="text-xs text-gray-500">Lab results received</p>
                </div>
                <Switch
                  checked={formData.in_reports}
                  onCheckedChange={(checked) => setFormData({...formData, in_reports: checked})}
                />
              </div>

              <div className="clay-button rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <Label className="text-gray-700 font-medium">Out Reports</Label>
                  <p className="text-xs text-gray-500">Report sent to client</p>
                </div>
                <Switch
                  checked={formData.out_reports}
                  onCheckedChange={(checked) => setFormData({...formData, out_reports: checked})}
                />
              </div>

              <div className="clay-button rounded-2xl p-4 flex items-center justify-between md:col-span-2">
                <div>
                  <Label className="text-gray-700 font-medium">Paid</Label>
                  <p className="text-xs text-gray-500">Has the client paid?</p>
                </div>
                <Switch
                  checked={formData.paid}
                  onCheckedChange={(checked) => setFormData({...formData, paid: checked})}
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
              placeholder="Additional notes about this lead..."
            />
          </div>

          <div className="flex gap-3 justify-between flex-wrap pt-4 border-t border-gray-200">
            <div>
              {lead && onConvertToClient && !lead.converted_client_id && (
                <Button
                  type="button"
                  onClick={() => onConvertToClient(formData)}
                  disabled={converting}
                  className="clay-button rounded-2xl px-6 py-3 font-semibold text-green-600 hover:scale-105 transition-transform flex items-center gap-2 disabled:opacity-60"
                >
                  <UserPlus className="w-4 h-4" />
                  {converting ? 'Converting...' : 'Convert to Client'}
                </Button>
              )}
              {lead?.converted_client_id && (
                <span className="text-sm text-green-600 flex items-center gap-1.5 px-3 py-2">
                  <CheckCircle className="w-4 h-4" />
                  Already converted to client
                </span>
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
                {saving ? 'Saving...' : (lead ? 'Update Lead' : 'Create Lead')}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
