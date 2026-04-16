import { Settings as SettingsIcon, User, Bell, Shield, DollarSign, Calendar, Microscope, Users, Plus, Search, Mail, Phone, Award, Clock, CheckCircle, Copy, Send, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import LabModal from "../components/labs/LabModal";
import UserModal from "../components/users/UserModal";
import QuickBooksSync from "../components/quickbooks/QuickBooksSync";

const tabs = [
  { id: 'general', label: 'General', icon: SettingsIcon },
  { id: 'pricing', label: 'Test Pricing', icon: DollarSign },
  { id: 'labs', label: 'Labs', icon: Microscope },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'quickbooks', label: 'QuickBooks', icon: FileText },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const queryClient = useQueryClient();

  // ========== GENERAL SETTINGS ==========
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
      window.location.reload();
    },
    onError: () => {
      toast.error('Failed to update role');
    }
  });

  const { data: settings } = useQuery({
    queryKey: ['appSettings'],
    queryFn: async () => {
      const allSettings = await base44.entities.AppSettings.list();
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

  // QuickBooks data - force fresh fetch on mount since user may land here from OAuth redirect
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    initialData: [],
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
    initialData: [],
    staleTime: 0,
    refetchOnMount: 'always',
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

  // Test Type Pricing
  const [testTypePricing, setTestTypePricing] = useState({
    'Air Quality': { price: 350, labCost: 30 },
    'Surface Swab': { price: 250, labCost: 25 },
    'Full Assessment': { price: 650, labCost: 45 },
    'Asbestos': { price: 450, labCost: 50 },
    'Lead': { price: 400, labCost: 40 },
    'Water': { price: 300, labCost: 35 },
  });

  const [techDefaultPay, setTechDefaultPay] = useState(100);

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

  // ========== LABS TAB ==========
  const [labSearchQuery, setLabSearchQuery] = useState("");
  const [showLabModal, setShowLabModal] = useState(false);
  const [selectedLab, setSelectedLab] = useState(null);

  const { data: labs = [], isLoading: labsLoading } = useQuery({
    queryKey: ['labs'],
    queryFn: () => base44.entities.Lab.list('-created_date'),
    staleTime: 0,
  });

  const createLabMutation = useMutation({
    mutationFn: (data) => base44.entities.Lab.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['labs']);
      setShowLabModal(false);
      setSelectedLab(null);
      toast.success('Lab created successfully!');
    },
  });

  const updateLabMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lab.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['labs']);
      setShowLabModal(false);
      setSelectedLab(null);
      toast.success('Lab updated successfully!');
    },
  });

  const filteredLabs = labs.filter(lab =>
    lab.name?.toLowerCase().includes(labSearchQuery.toLowerCase()) ||
    lab.email?.toLowerCase().includes(labSearchQuery.toLowerCase())
  );

  // ========== USERS TAB ==========
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showVerificationInfo, setShowVerificationInfo] = useState(null);

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list('-created_date'),
    staleTime: 0,
  });

  const createUserMutation = useMutation({
    mutationFn: (data) => {
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      return base44.entities.User.create({
        ...data,
        status: 'Pending',
        verification_code: verificationCode,
      });
    },
    onSuccess: (newUser) => {
      queryClient.invalidateQueries(['users']);
      setShowUserModal(false);
      setSelectedUser(null);
      setShowVerificationInfo(newUser);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setShowUserModal(false);
      setSelectedUser(null);
      toast.success('User updated successfully!');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id) => base44.entities.User.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      toast.success('User deleted successfully!');
    },
  });

  const resendVerification = (user) => {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    updateUserMutation.mutate({
      id: user.id,
      data: { verification_code: newCode }
    });
    setShowVerificationInfo({ ...user, verification_code: newCode });
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
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
    toast.success('Copied to clipboard!');
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

      {/* Tabs */}
      <div className="clay-card rounded-3xl p-2">
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-medium transition-all ${
                activeTab === tab.id
                  ? 'clay-nav-active text-purple-700'
                  : 'clay-button hover:scale-[1.02] text-gray-600'
              }`}
            >
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-purple-600' : 'text-purple-400'}`} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
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
                <Input defaultValue="MoldTest Pro" className="clay-button rounded-2xl border-0" />
              </div>
              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Email</Label>
                <Input type="email" defaultValue="admin@moldtest.com" className="clay-button rounded-2xl border-0" />
              </div>
              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Phone</Label>
                <Input defaultValue="(555) 123-4567" className="clay-button rounded-2xl border-0" />
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
                <Input type="password" placeholder="••••••••" className="clay-button rounded-2xl border-0" />
              </div>
              <div>
                <Label className="text-gray-700 font-medium mb-2 block">New Password</Label>
                <Input type="password" placeholder="••••••••" className="clay-button rounded-2xl border-0" />
              </div>
              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Confirm Password</Label>
                <Input type="password" placeholder="••••••••" className="clay-button rounded-2xl border-0" />
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
      )}

      {/* Pricing Tab */}
      {activeTab === 'pricing' && (
        <div className="space-y-6">
          {/* Test Type Pricing */}
          <div className="clay-card rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-400 flex items-center justify-center shadow-inner">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Test Type Pricing</h3>
                <p className="text-sm text-gray-500">Set default prices for each test type</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(testTypePricing).map(([testType, pricing]) => (
                <div key={testType} className="clay-button rounded-2xl p-4">
                  <h4 className="font-bold text-gray-800 mb-3">{testType}</h4>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-gray-600 text-sm">Client Price</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">$</span>
                        <Input
                          type="number"
                          value={pricing.price}
                          onChange={(e) => setTestTypePricing({
                            ...testTypePricing,
                            [testType]: { ...pricing, price: parseFloat(e.target.value) || 0 }
                          })}
                          className="clay-button rounded-xl border-0 text-right"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-600 text-sm">Lab Cost (per sample)</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">$</span>
                        <Input
                          type="number"
                          value={pricing.labCost}
                          onChange={(e) => setTestTypePricing({
                            ...testTypePricing,
                            [testType]: { ...pricing, labCost: parseFloat(e.target.value) || 0 }
                          })}
                          className="clay-button rounded-xl border-0 text-right"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => toast.success('Pricing saved successfully!')}
                className="clay-button rounded-2xl px-6 py-3 font-semibold text-emerald-600 hover:scale-[1.02]"
              >
                Save Pricing
              </Button>
            </div>
          </div>

          {/* Technician Default Pay */}
          <div className="clay-card rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center shadow-inner">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Technician Default Pay</h3>
                <p className="text-sm text-gray-500">Default pay rate per job (can be modified per job)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="clay-button rounded-2xl p-4">
                <Label className="text-gray-700 font-medium mb-2 block">Default Pay Per Job</Label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-lg">$</span>
                  <Input
                    type="number"
                    value={techDefaultPay}
                    onChange={(e) => setTechDefaultPay(parseFloat(e.target.value) || 0)}
                    className="clay-button rounded-xl border-0 text-2xl font-bold text-right"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">This can be adjusted per job in the test profile</p>
              </div>

              <div className="clay-button rounded-2xl p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
                <Label className="text-gray-700 font-medium mb-2 block">Pay Options</Label>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>- Standard pay is applied to all new jobs</p>
                  <p>- Adjust individual job pay in test profile</p>
                  <p>- Use pay adjustments for extra distance, cancellations, etc.</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => toast.success('Default pay saved successfully!')}
                className="clay-button rounded-2xl px-6 py-3 font-semibold text-blue-600 hover:scale-[1.02]"
              >
                Save Default Pay
              </Button>
            </div>
          </div>

          {/* Referral Sources */}
          <div className="clay-card rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center shadow-inner">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">Referral Sources</h3>
                <p className="text-sm text-gray-500">Track where your jobs come from</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['Direct', 'Google', 'TikTok', 'Facebook', 'Website', 'Yelp', 'HomeAdvisor', 'Angi', 'Referral'].map(source => (
                <div key={source} className="clay-button rounded-xl p-3 text-center">
                  <p className="font-medium text-gray-700">{source}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-4">
              These sources appear in the "Referred By" dropdown when creating new jobs
            </p>
          </div>
        </div>
      )}

      {/* Labs Tab */}
      {activeTab === 'labs' && (
        <div className="space-y-6">
          {/* Labs Header */}
          <div className="clay-card rounded-3xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Lab Management</h2>
                <p className="text-gray-500 mt-1">{labs.length} total labs</p>
              </div>
              <Button
                onClick={() => {
                  setSelectedLab(null);
                  setShowLabModal(true);
                }}
                className="clay-button rounded-2xl px-6 py-3 flex items-center gap-2 font-semibold text-purple-600 hover:scale-105"
              >
                <Plus className="w-5 h-5" />
                New Lab
              </Button>
            </div>
          </div>

          {/* Labs Search */}
          <div className="clay-card rounded-3xl p-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
              <Input
                placeholder="Search labs..."
                value={labSearchQuery}
                onChange={(e) => setLabSearchQuery(e.target.value)}
                className="pl-12 clay-button rounded-2xl border-0 h-12 text-gray-700"
              />
            </div>
          </div>

          {/* Labs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLabs.map((lab) => (
              <div
                key={lab.id}
                onClick={() => {
                  setSelectedLab(lab);
                  setShowLabModal(true);
                }}
                className="clay-card clay-card-hover rounded-3xl p-6 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center shadow-inner">
                    <Microscope className="w-7 h-7 text-white" />
                  </div>
                  <Badge className={`${lab.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'} rounded-xl px-3 py-1 font-medium text-xs`}>
                    {lab.status}
                  </Badge>
                </div>

                <h3 className="font-bold text-gray-800 text-lg mb-1">{lab.name}</h3>

                {lab.accreditation && (
                  <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
                    <Award className="w-3 h-3 text-purple-400" />
                    <span className="truncate">{lab.accreditation}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4 text-purple-400" />
                    <span className="truncate">{lab.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4 text-pink-400" />
                    <span>{lab.phone}</span>
                  </div>
                  {lab.turnaround_time && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span>{lab.turnaround_time}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
                  <span className="text-gray-500">
                    Samples: <strong className="text-gray-700">{lab.total_samples_sent || 0}</strong>
                  </span>
                  <span className="text-gray-500">
                    {(() => {
                      const cost = parseFloat(lab.cost_per_sample);
                      if (cost > 0 && !isNaN(cost)) {
                        return `$${cost}/sample`;
                      }
                      return 'Contact for pricing';
                    })()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Labs Empty State */}
          {filteredLabs.length === 0 && !labsLoading && (
            <div className="clay-card rounded-3xl p-12 text-center">
              <Microscope className="w-16 h-16 text-purple-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-700 mb-2">No labs found</h3>
              <p className="text-gray-500">Try adjusting your search or add a new lab</p>
            </div>
          )}

          {/* Lab Modal */}
          {showLabModal && (
            <LabModal
              lab={selectedLab}
              onClose={() => {
                setShowLabModal(false);
                setSelectedLab(null);
              }}
              onSave={(data) => {
                if (selectedLab) {
                  updateLabMutation.mutate({ id: selectedLab.id, data });
                } else {
                  createLabMutation.mutate(data);
                }
              }}
            />
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Users Header */}
          <div className="clay-card rounded-3xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
                <p className="text-gray-500 mt-1">{users.length} total users</p>
              </div>
              <Button
                onClick={() => {
                  setSelectedUser(null);
                  setShowUserModal(true);
                }}
                className="clay-button rounded-2xl px-6 py-3 flex items-center gap-2 font-semibold text-purple-600 hover:scale-105"
              >
                <Plus className="w-5 h-5" />
                New User
              </Button>
            </div>
          </div>

          {/* Users Search */}
          <div className="clay-card rounded-3xl p-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
              <Input
                placeholder="Search users..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
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
                      setShowUserModal(true);
                    }}
                    className="text-purple-600 hover:text-purple-700 text-xs"
                  >
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Users Empty State */}
          {filteredUsers.length === 0 && !usersLoading && (
            <div className="clay-card rounded-3xl p-12 text-center">
              <User className="w-16 h-16 text-purple-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-700 mb-2">No users found</h3>
              <p className="text-gray-500">Try adjusting your search or add a new user</p>
            </div>
          )}

          {/* User Modal */}
          {showUserModal && (
            <UserModal
              user={selectedUser}
              onClose={() => {
                setShowUserModal(false);
                setSelectedUser(null);
              }}
              onSave={(data) => {
                if (selectedUser) {
                  updateUserMutation.mutate({ id: selectedUser.id, data });
                } else {
                  createUserMutation.mutate(data);
                }
              }}
              onDelete={selectedUser ? () => {
                deleteUserMutation.mutate(selectedUser.id);
                setShowUserModal(false);
                setSelectedUser(null);
              } : null}
            />
          )}
        </div>
      )}

      {/* QuickBooks Tab */}
      {activeTab === 'quickbooks' && (
        <QuickBooksSync
          clients={clients}
          invoices={invoices}
          isLoading={clientsLoading || invoicesLoading}
        />
      )}
    </div>
  );
}
