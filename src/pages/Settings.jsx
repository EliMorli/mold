import { Settings as SettingsIcon, User, Bell, Shield, Palette, DollarSign, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function SettingsPage() {
  const queryClient = useQueryClient();

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const [selectedRole, setSelectedRole] = useState('');

  useEffect(() => {
    if (currentUser?.app_role) {
      setSelectedRole(currentUser.app_role);
    }
  }, [currentUser]);

  const updateRoleMutation = useMutation({
    mutationFn: (role) => base44.auth.updateMe({ app_role: role }),
    onSuccess: () => {
      queryClient.invalidateQueries(['currentUser']);
      toast.success('Role updated successfully!');
      window.location.reload(); // Reload to update permissions
    },
    onError: () => {
      toast.error('Failed to update role');
    }
  });

  // Fetch app settings
  const { data: settings } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      const allSettings = await base44.entities.AppSettings.list();
      // If no settings exist, create default
      if (allSettings.length === 0) {
        const defaultSettings = await base44.entities.AppSettings.create({
          google_calendar_default_duration_hours: 2,
          google_calendar_include_client_name: true,
          google_calendar_include_client_phone: true,
          google_calendar_include_address: true,
          google_calendar_include_access_instructions: true,
          google_calendar_include_special_requests: false,
          default_test_price: 450,
          tax_rate_percentage: 8.5,
          invoice_due_days: 30
        });
        return defaultSettings;
      }
      return allSettings[0];
    },
  });

  const [calendarSettings, setCalendarSettings] = useState({
    duration: 2,
    includeClientName: true,
    includeClientPhone: true,
    includeAddress: true,
    includeAccessInstructions: true,
    includeSpecialRequests: false,
  });

  const [billingSettings, setBillingSettings] = useState({
    defaultTestPrice: 450,
    taxRate: 8.5,
    invoiceDueDays: 30,
    invoice_reminder_enabled: true,
    invoice_reminder_days_before_due: 3,
    invoice_reminder_days_after_due_1: 1,
    invoice_reminder_days_after_due_2: 7,
    invoice_reminder_subject: 'Payment Reminder for Invoice {invoice_number}',
    invoice_reminder_body: 'Dear {client_name},\n\nThis is a reminder that invoice {invoice_number} for ${total} is due on {due_date}.\n\nPlease let us know if you have any questions.\n\nThank you!',
  });

  // Update local state when settings are loaded
  useEffect(() => {
    if (settings) {
      setCalendarSettings({
        duration: settings.google_calendar_default_duration_hours,
        includeClientName: settings.google_calendar_include_client_name,
        includeClientPhone: settings.google_calendar_include_client_phone,
        includeAddress: settings.google_calendar_include_address,
        includeAccessInstructions: settings.google_calendar_include_access_instructions,
        includeSpecialRequests: settings.google_calendar_include_special_requests,
      });
      setBillingSettings({
        defaultTestPrice: settings.default_test_price,
        taxRate: settings.tax_rate_percentage,
        invoiceDueDays: settings.invoice_due_days,
        invoice_reminder_enabled: settings.invoice_reminder_enabled ?? true,
        invoice_reminder_days_before_due: settings.invoice_reminder_days_before_due ?? 3,
        invoice_reminder_days_after_due_1: settings.invoice_reminder_days_after_due_1 ?? 1,
        invoice_reminder_days_after_due_2: settings.invoice_reminder_days_after_due_2 ?? 7,
        invoice_reminder_subject: settings.invoice_reminder_subject ?? 'Payment Reminder for Invoice {invoice_number}',
        invoice_reminder_body: settings.invoice_reminder_body ?? 'Dear {client_name},\n\nThis is a reminder that invoice {invoice_number} for ${total} is due on {due_date}.\n\nPlease let us know if you have any questions.\n\nThank you!',
      });
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: (data) => base44.entities.AppSettings.update(settings.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['appSettings']);
      toast.success('Settings saved successfully!');
    },
    onError: () => {
      toast.error('Failed to save settings');
    }
  });

  const handleSaveCalendarSettings = () => {
    updateSettingsMutation.mutate({
      google_calendar_default_duration_hours: calendarSettings.duration,
      google_calendar_include_client_name: calendarSettings.includeClientName,
      google_calendar_include_client_phone: calendarSettings.includeClientPhone,
      google_calendar_include_address: calendarSettings.includeAddress,
      google_calendar_include_access_instructions: calendarSettings.includeAccessInstructions,
      google_calendar_include_special_requests: calendarSettings.includeSpecialRequests,
    });
  };

  const handleSaveBillingSettings = () => {
    updateSettingsMutation.mutate({
      default_test_price: billingSettings.defaultTestPrice,
      tax_rate_percentage: billingSettings.taxRate,
      invoice_due_days: billingSettings.invoiceDueDays,
      invoice_reminder_enabled: billingSettings.invoice_reminder_enabled,
      invoice_reminder_days_before_due: billingSettings.invoice_reminder_days_before_due,
      invoice_reminder_days_after_due_1: billingSettings.invoice_reminder_days_after_due_1,
      invoice_reminder_days_after_due_2: billingSettings.invoice_reminder_days_after_due_2,
      invoice_reminder_subject: billingSettings.invoice_reminder_subject,
      invoice_reminder_body: billingSettings.invoice_reminder_body,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="clay-card rounded-3xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-400 to-slate-400 flex items-center justify-center shadow-inner">
            <SettingsIcon className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-700 to-slate-600 bg-clip-text text-transparent">
              Settings
            </h1>
            <p className="text-gray-500 mt-1">Manage your application preferences</p>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Role Settings */}
        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center shadow-inner">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">User Role</h3>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Your Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="clay-button rounded-2xl border-0">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Technician">Technician</SelectItem>
                  <SelectItem value="Client">Client</SelectItem>
                  <SelectItem value="View Only">View Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={() => updateRoleMutation.mutate(selectedRole)}
              disabled={updateRoleMutation.isPending || selectedRole === currentUser?.app_role}
              className="clay-button rounded-2xl px-6 py-3 w-full font-semibold text-indigo-600 hover:scale-[1.02]"
            >
              {updateRoleMutation.isPending ? 'Updating...' : 'Update Role'}
            </Button>
          </div>
        </div>

        {/* Profile Settings */}
        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center shadow-inner">
              <User className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Profile Settings</h3>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Company Name</Label>
              <Input
                defaultValue="MoldTest Pro"
                className="clay-button rounded-2xl border-0"
              />
            </div>
            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Email</Label>
              <Input
                type="email"
                defaultValue="admin@moldtest.com"
                className="clay-button rounded-2xl border-0"
              />
            </div>
            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Phone</Label>
              <Input
                defaultValue="(555) 123-4567"
                className="clay-button rounded-2xl border-0"
              />
            </div>
            <Button className="clay-button rounded-2xl px-6 py-3 w-full font-semibold text-blue-600 hover:scale-[1.02]">
              Save Profile
            </Button>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center shadow-inner">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Notifications</h3>
          </div>
          <div className="space-y-4">
            {[
              { label: 'Email notifications for new tests', checked: true },
              { label: 'SMS alerts for urgent tests', checked: true },
              { label: 'Weekly report summaries', checked: false },
              { label: 'Invoice payment reminders', checked: true },
              { label: 'Lab result notifications', checked: true },
            ].map((setting, idx) => (
              <div key={idx} className="flex items-center justify-between clay-button rounded-2xl p-4">
                <span className="text-gray-700 text-sm font-medium">{setting.label}</span>
                <Switch defaultChecked={setting.checked} />
              </div>
            ))}
          </div>
        </div>

        {/* Security Settings */}
        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-400 to-orange-400 flex items-center justify-center shadow-inner">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Security</h3>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Current Password</Label>
              <Input
                type="password"
                placeholder="••••••••"
                className="clay-button rounded-2xl border-0"
              />
            </div>
            <div>
              <Label className="text-gray-700 font-medium mb-2 block">New Password</Label>
              <Input
                type="password"
                placeholder="••••••••"
                className="clay-button rounded-2xl border-0"
              />
            </div>
            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Confirm Password</Label>
              <Input
                type="password"
                placeholder="••••••••"
                className="clay-button rounded-2xl border-0"
              />
            </div>
            <Button className="clay-button rounded-2xl px-6 py-3 w-full font-semibold text-red-600 hover:scale-[1.02]">
              Update Password
            </Button>
          </div>
        </div>

        {/* Billing Settings */}
        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center shadow-inner">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Billing & Pricing</h3>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Default Test Price</Label>
              <Input
                type="number"
                value={billingSettings.defaultTestPrice}
                onChange={(e) => setBillingSettings({...billingSettings, defaultTestPrice: parseFloat(e.target.value) || 0})}
                className="clay-button rounded-2xl border-0"
              />
            </div>
            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Tax Rate (%)</Label>
              <Input
                type="number"
                value={billingSettings.taxRate}
                step="0.1"
                onChange={(e) => setBillingSettings({...billingSettings, taxRate: parseFloat(e.target.value) || 0})}
                className="clay-button rounded-2xl border-0"
              />
            </div>
            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Invoice Due Days</Label>
              <Input
                type="number"
                value={billingSettings.invoiceDueDays}
                onChange={(e) => setBillingSettings({...billingSettings, invoiceDueDays: parseInt(e.target.value) || 30})}
                className="clay-button rounded-2xl border-0"
              />
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <h4 className="text-md font-semibold text-gray-800 mb-3">Invoice Reminders</h4>
              
              <div className="flex items-center justify-between mb-4 clay-button rounded-2xl p-3">
                <span className="text-sm text-gray-700">Enable Automated Reminders</span>
                <Switch
                  checked={billingSettings.invoice_reminder_enabled}
                  onCheckedChange={(checked) => setBillingSettings({ ...billingSettings, invoice_reminder_enabled: checked })}
                />
              </div>

              {billingSettings.invoice_reminder_enabled && (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div>
                      <Label className="text-gray-700 text-xs mb-1 block">Days Before Due</Label>
                      <Input
                        type="number"
                        value={billingSettings.invoice_reminder_days_before_due}
                        onChange={(e) => setBillingSettings({ ...billingSettings, invoice_reminder_days_before_due: parseInt(e.target.value) || 0 })}
                        className="clay-button rounded-xl border-0 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700 text-xs mb-1 block">Days After (1st)</Label>
                      <Input
                        type="number"
                        value={billingSettings.invoice_reminder_days_after_due_1}
                        onChange={(e) => setBillingSettings({ ...billingSettings, invoice_reminder_days_after_due_1: parseInt(e.target.value) || 0 })}
                        className="clay-button rounded-xl border-0 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700 text-xs mb-1 block">Days After (2nd)</Label>
                      <Input
                        type="number"
                        value={billingSettings.invoice_reminder_days_after_due_2}
                        onChange={(e) => setBillingSettings({ ...billingSettings, invoice_reminder_days_after_due_2: parseInt(e.target.value) || 0 })}
                        className="clay-button rounded-xl border-0 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-gray-700 text-xs mb-1 block">Email Subject</Label>
                      <Input
                        value={billingSettings.invoice_reminder_subject}
                        onChange={(e) => setBillingSettings({ ...billingSettings, invoice_reminder_subject: e.target.value })}
                        className="clay-button rounded-xl border-0 text-sm"
                        placeholder="Use {invoice_number}, {client_name}, {total}, {due_date}"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700 text-xs mb-1 block">Email Body</Label>
                      <Textarea
                        value={billingSettings.invoice_reminder_body}
                        onChange={(e) => setBillingSettings({ ...billingSettings, invoice_reminder_body: e.target.value })}
                        className="clay-button rounded-xl border-0 text-sm min-h-[120px]"
                        placeholder="Use {invoice_number}, {client_name}, {total}, {due_date}"
                      />
                    </div>
                    <p className="text-xs text-gray-500 italic">Variables: {'{invoice_number}'}, {'{client_name}'}, {'{total}'}, {'{due_date}'}</p>
                  </div>
                </>
              )}
            </div>

            <Button 
              onClick={handleSaveBillingSettings}
              disabled={updateSettingsMutation.isPending}
              className="clay-button rounded-2xl px-6 py-3 w-full font-semibold text-green-600 hover:scale-[1.02]"
            >
              {updateSettingsMutation.isPending ? 'Saving...' : 'Save Billing Settings'}
            </Button>
          </div>
        </div>

        {/* Calendar Settings */}
        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center shadow-inner">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-800">Calendar Automation</h3>
          </div>
          <div className="space-y-4">
            <div className="clay-button rounded-2xl p-4 bg-blue-50">
              <p className="text-sm text-blue-800 mb-2 font-semibold">Google Calendar Integration</p>
              <p className="text-xs text-blue-600 mb-3">
                Configure which fields to include in calendar events sent to technicians
              </p>
            </div>

            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Event Duration (hours)</Label>
              <Input
                type="number"
                min="0.5"
                step="0.5"
                value={calendarSettings.duration}
                onChange={(e) => setCalendarSettings({...calendarSettings, duration: parseFloat(e.target.value) || 2})}
                className="clay-button rounded-2xl border-0"
              />
            </div>
            
            <div className="space-y-3">
              {[
                { label: 'Client Name', key: 'includeClientName' },
                { label: 'Client Phone', key: 'includeClientPhone' },
                { label: 'Property Address', key: 'includeAddress' },
                { label: 'Access Instructions', key: 'includeAccessInstructions' },
                { label: 'Special Requests', key: 'includeSpecialRequests' },
              ].map((setting) => (
                <div key={setting.key} className="flex items-center justify-between clay-button rounded-2xl p-4">
                  <span className="text-gray-700 text-sm font-medium">{setting.label}</span>
                  <Switch 
                    checked={calendarSettings[setting.key]} 
                    onCheckedChange={(checked) => setCalendarSettings({...calendarSettings, [setting.key]: checked})}
                  />
                </div>
              ))}
            </div>

            <Button 
              onClick={handleSaveCalendarSettings}
              disabled={updateSettingsMutation.isPending}
              className="clay-button rounded-2xl px-6 py-3 w-full font-semibold text-indigo-600 hover:scale-[1.02]"
            >
              {updateSettingsMutation.isPending ? 'Saving...' : 'Save Calendar Settings'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}