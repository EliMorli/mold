import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { 
  ArrowLeft, 
  Building2,
  Users,
  Mail,
  Phone,
  MapPin,
  Edit2,
  Check,
  X,
  FlaskConical,
  DollarSign,
  Calendar,
  TrendingUp,
  UserCheck,
  Receipt,
  Eye,
  Key
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import ClientPortalView from "../components/clients/ClientPortalView";

export default function ClientProfilePage() {
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get('id');
  const [isEditing, setIsEditing] = useState(false);
  const [showPortalView, setShowPortalView] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');

  const queryClient = useQueryClient();
  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const clients = await base44.entities.Client.list();
      return clients.find(c => c.id === clientId);
    },
    enabled: !!clientId,
  });

  const { data: allTests = [] } = useQuery({
    queryKey: ['tests'],
    queryFn: () => base44.entities.Test.list('-created_date'),
    initialData: [],
  });

  const { data: allInvoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date'),
    initialData: [],
  });

  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (client) {
      setFormData(client);
    }
  }, [client]);

  // Google Maps autocomplete
  useEffect(() => {
    const loadGoogleMaps = async () => {
      try {
        const response = await base44.functions.invoke('getGoogleMapsKey', {});
        const { apiKey } = response.data;

        if (!apiKey) return;

        if (window.google && window.google.maps && window.google.maps.places) {
          initAutocomplete();
          return;
        }

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => initAutocomplete();
        document.head.appendChild(script);
      } catch (error) {
        console.error('Error loading Google Maps:', error);
      }
    };

    const initAutocomplete = () => {
      if (!addressInputRef.current) return;

      try {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          addressInputRef.current,
          {
            types: ['address'],
            componentRestrictions: { country: 'us' }
          }
        );

        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current.getPlace();
          if (place.formatted_address) {
            setFormData(prev => ({
              ...prev,
              address: place.formatted_address
            }));
          }
        });
      } catch (error) {
        console.error('Error initializing autocomplete:', error);
      }
    };

    loadGoogleMaps();

    return () => {
      if (autocompleteRef.current && window.google && window.google.maps && window.google.maps.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isEditing]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.update(clientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['client', clientId]);
      queryClient.invalidateQueries(['clients']);
      setIsEditing(false);
    },
  });

  const createLoginMutation = useMutation({
    mutationFn: async ({ email }) => {
      const response = await base44.functions.invoke('createClientLogin', { 
        email, 
        clientId 
      });
      return response.data;
    },
    onSuccess: (data) => {
      alert(`Portal invitation sent!\n\nThe client will receive an email at ${data.email} to set their password. Once they log in, they'll automatically see their personalized portal with their tests and invoices.`);
      setShowLoginModal(false);
      setLoginEmail('');
    },
    onError: (error) => {
      alert('Failed to create login: ' + (error.response?.data?.error || error.message));
    }
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleClientTypeChange = (newType) => {
    setFormData({
      ...formData,
      client_type: newType
    });
  };

  // Filter data for this client
  const clientTests = allTests.filter(test => test.client_id === clientId);
  const clientInvoices = allInvoices.filter(inv => inv.client_id === clientId);
  
  // Calculate stats
  const totalTests = clientTests.length;
  const totalRevenue = clientInvoices.filter(i => i.status === 'Paid').reduce((sum, inv) => sum + (inv.total || 0), 0);
  const openBalance = clientInvoices.filter(i => i.status === 'Sent' || i.status === 'Overdue').reduce((sum, inv) => sum + (inv.total || 0), 0);
  const avgTestCost = totalTests > 0 ? totalRevenue / totalTests : 0;

  const statusColors = {
    'Scheduled': 'bg-blue-100 text-blue-700 border-blue-200',
    'In Progress': 'bg-purple-100 text-purple-700 border-purple-200',
    'Lab Analysis': 'bg-orange-100 text-orange-700 border-orange-200',
    'Completed': 'bg-green-100 text-green-700 border-green-200',
    'Cancelled': 'bg-gray-100 text-gray-700 border-gray-200',
  };

  const invoiceStatusColors = {
    'Draft': 'bg-gray-100 text-gray-700',
    'Sent': 'bg-blue-100 text-blue-700',
    'Paid': 'bg-green-100 text-green-700',
    'Overdue': 'bg-red-100 text-red-700',
    'Cancelled': 'bg-gray-100 text-gray-600',
  };

  const typeColors = {
    'Direct Client': 'bg-blue-100 text-blue-700',
    'Referral Company': 'bg-purple-100 text-purple-700',
  };

  const formatDateTime = (dateTime) => {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="clay-card rounded-3xl p-8">
          <p className="text-gray-600">Loading client profile...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="clay-card rounded-3xl p-8 text-center">
          <p className="text-gray-600 mb-4">Client not found</p>
          <Button
            onClick={() => window.location.href = createPageUrl('Clients')}
            className="clay-button rounded-2xl px-6 py-3"
          >
            Back to Clients
          </Button>
        </div>
      </div>
    );
  }

  const isDirectClient = formData.client_type === 'Direct Client';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="clay-card rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.location.href = createPageUrl('Clients')}
              className="clay-button rounded-2xl p-3 hover:scale-110 transition-transform"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center shadow-inner">
                {formData.client_type === 'Referral Company' ? (
                  <Building2 className="w-8 h-8 text-white" />
                ) : (
                  <Users className="w-8 h-8 text-white" />
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">{formData.name}</h1>
                <Badge className={`${typeColors[formData.client_type]} rounded-xl px-3 py-1 font-medium text-xs mt-2`}>
                  {formData.client_type}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isEditing && (
              <>
                <Button
                  onClick={() => setShowLoginModal(true)}
                  className="clay-button rounded-2xl px-6 py-3 flex items-center gap-2 font-semibold text-green-600 hover:scale-105"
                >
                  <Key className="w-4 h-4" />
                  Create Portal Login
                </Button>
                <Button
                  onClick={() => setShowPortalView(!showPortalView)}
                  className="clay-button rounded-2xl px-6 py-3 flex items-center gap-2 font-semibold text-purple-600 hover:scale-105"
                >
                  <Eye className="w-4 h-4" />
                  {showPortalView ? 'Admin View' : 'Portal View'}
                </Button>
              </>
            )}
            {!isEditing ? (
              <Button
                onClick={() => setIsEditing(true)}
                className="clay-button rounded-2xl px-6 py-3 flex items-center gap-2 font-semibold text-blue-600 hover:scale-105"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => {
                    setFormData(client);
                    setIsEditing(false);
                  }}
                  className="clay-button rounded-2xl px-6 py-3 flex items-center gap-2 font-medium text-gray-600"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="clay-button rounded-2xl px-6 py-3 flex items-center gap-2 font-semibold text-green-600 hover:scale-105"
                >
                  <Check className="w-4 h-4" />
                  Save Changes
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center shadow-inner">
              <FlaskConical className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Tests</p>
              <p className="text-2xl font-bold text-gray-800">{totalTests}</p>
            </div>
          </div>
        </div>

        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center shadow-inner">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Open Balance</p>
              <p className="text-2xl font-bold text-orange-600">${openBalance.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center shadow-inner">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-800">${totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-400 to-red-400 flex items-center justify-center shadow-inner">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg per Test</p>
              <p className="text-2xl font-bold text-gray-800">${Math.round(avgTestCost)}</p>
            </div>
          </div>
        </div>
      </div>

      {showPortalView ? (
        <ClientPortalView clientTests={clientTests} clientInvoices={clientInvoices} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Client Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Contact Information */}
          <div className="clay-card rounded-3xl p-6">
            <h3 className="text-lg font-bold text-blue-600 mb-4">Contact Information</h3>
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Client Type</Label>
                  <Select value={formData.client_type} onValueChange={handleClientTypeChange}>
                    <SelectTrigger className="clay-button rounded-2xl border-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Direct Client">Direct Client</SelectItem>
                      <SelectItem value="Referral Company">Referral Company</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">
                    {isDirectClient ? 'Client Name' : 'Company Name'}
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="clay-button rounded-2xl border-0"
                  />
                </div>
                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="clay-button rounded-2xl border-0"
                  />
                </div>
                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="clay-button rounded-2xl border-0"
                  />
                </div>
                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">
                    {isDirectClient ? 'Billing Address' : 'Office Address'}
                  </Label>
                  <Input
                    ref={addressInputRef}
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="clay-button rounded-2xl border-0"
                    autoComplete="off"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4 text-blue-400" />
                  <span className="text-sm">{formData.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm">{formData.phone}</span>
                </div>
                {formData.address && (
                  <div className="flex items-start gap-2 text-gray-600">
                    <MapPin className="w-4 h-4 text-purple-400 mt-1" />
                    <span className="text-sm">{formData.address}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sales Rep Info - Only for Referral Companies */}
          {!isDirectClient && (
            <div className="clay-card rounded-3xl p-6">
              <h3 className="text-lg font-bold text-green-600 flex items-center gap-2 mb-4">
                <UserCheck className="w-5 h-5" />
                Sales Representative
              </h3>
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-700 font-medium mb-2 block">Rep Name</Label>
                    <Input
                      value={formData.sales_rep_name}
                      onChange={(e) => setFormData({...formData, sales_rep_name: e.target.value})}
                      className="clay-button rounded-2xl border-0"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 font-medium mb-2 block">Rep Phone</Label>
                    <Input
                      value={formData.sales_rep_phone}
                      onChange={(e) => setFormData({...formData, sales_rep_phone: e.target.value})}
                      className="clay-button rounded-2xl border-0"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 font-medium mb-2 block">Rep Email</Label>
                    <Input
                      type="email"
                      value={formData.sales_rep_email}
                      onChange={(e) => setFormData({...formData, sales_rep_email: e.target.value})}
                      className="clay-button rounded-2xl border-0"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 font-medium mb-2 block">Commission %</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.commission_percentage}
                      onChange={(e) => setFormData({...formData, commission_percentage: parseFloat(e.target.value) || 0})}
                      className="clay-button rounded-2xl border-0"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="text-gray-700 font-medium">{formData.sales_rep_name || 'N/A'}</p>
                  </div>
                  {formData.sales_rep_phone && (
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="text-gray-700">{formData.sales_rep_phone}</p>
                    </div>
                  )}
                  {formData.sales_rep_email && (
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="text-gray-700">{formData.sales_rep_email}</p>
                    </div>
                  )}
                  {formData.commission_percentage > 0 && (
                    <div>
                      <p className="text-sm text-gray-500">Commission</p>
                      <p className="text-gray-700 font-semibold">{formData.commission_percentage}%</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="clay-card rounded-3xl p-6">
            <h3 className="text-lg font-bold text-orange-600 mb-4">Notes</h3>
            {isEditing ? (
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="clay-button rounded-2xl border-0 min-h-[120px]"
                placeholder="Additional notes..."
              />
            ) : (
              <p className="text-gray-700 text-sm whitespace-pre-wrap">
                {formData.notes || <span className="text-gray-400 italic">No notes</span>}
              </p>
            )}
          </div>
        </div>

        {/* Right Column - Jobs & Invoices */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoices Section */}
          <div className="clay-card rounded-3xl p-6">
            <h3 className="text-lg font-bold text-orange-600 mb-4 flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Invoices ({clientInvoices.length} total)
            </h3>
            {clientInvoices.length > 0 ? (
              <div className="space-y-3">
                {clientInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    onClick={() => window.location.href = `${createPageUrl('Invoices')}`}
                    className="clay-button rounded-2xl p-4 cursor-pointer hover:scale-[1.01] transition-transform"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-800">{invoice.invoice_number}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Issued: {formatDate(invoice.issue_date)} • Due: {formatDate(invoice.due_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-800">${invoice.total.toLocaleString()}</p>
                        <Badge className={`${invoiceStatusColors[invoice.status]} rounded-lg px-2 py-1 text-xs mt-1`}>
                          {invoice.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No invoices yet</p>
              </div>
            )}
          </div>

          {/* Jobs History */}
          <div className="clay-card rounded-3xl p-6">
            <h3 className="text-lg font-bold text-purple-600 mb-6">Jobs History ({totalTests} total)</h3>
            {clientTests.length > 0 ? (
              <div className="space-y-4">
                {clientTests.map((test) => (
                  <div
                    key={test.id}
                    onClick={() => window.location.href = `${createPageUrl('TestProfile')}?id=${test.id}`}
                    className="clay-button rounded-2xl p-4 cursor-pointer hover:scale-[1.01] transition-transform"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center shadow-inner">
                          <FlaskConical className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800">{test.test_number}</h4>
                          <p className="text-sm text-gray-500">{test.test_type} - {test.test_category}</p>
                        </div>
                      </div>
                      <Badge className={`${statusColors[test.status]} border rounded-xl px-3 py-1 font-medium text-xs`}>
                        {test.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-3 h-3 text-blue-400" />
                        <span className="truncate">{test.property_address}</span>
                      </div>
                      {test.scheduled_date && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-3 h-3 text-pink-400" />
                          <span>{formatDateTime(test.scheduled_date)}</span>
                        </div>
                      )}
                    </div>
                    
                    {test.cost > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
                        <span className="text-sm text-gray-500">Cost</span>
                        <span className="text-lg font-bold text-gray-800">${test.cost.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FlaskConical className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No jobs yet for this client</p>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Login Creation Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="clay-card rounded-3xl p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center shadow-inner">
                <Key className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Create Portal Login</h2>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Client Email</Label>
                <Input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="clay-button rounded-2xl border-0"
                  placeholder="client@example.com"
                />
              </div>
              <div className="clay-button rounded-2xl p-4 bg-blue-50">
                <p className="text-xs text-blue-800">
                  The client will receive an invitation email to set their password. Once they log in, they&apos;ll automatically see only their personalized portal with their tests and invoices.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowLoginModal(false);
                  setLoginEmail('');
                }}
                className="clay-button rounded-2xl px-6 py-3 flex-1 font-medium text-gray-600"
              >
                Cancel
              </Button>
              <Button
                onClick={() => createLoginMutation.mutate({ email: loginEmail })}
                disabled={!loginEmail || createLoginMutation.isPending}
                className="clay-button rounded-2xl px-6 py-3 flex-1 font-semibold text-green-600 hover:scale-105"
              >
                {createLoginMutation.isPending ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}