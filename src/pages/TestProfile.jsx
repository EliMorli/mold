import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { useAuth } from "@/components/useAuth";
import { 
  ArrowLeft, 
  Save, 
  User, 
  MapPin, 
  Calendar, 
  FileText, 
  Image as ImageIcon, 
  Trash2,
  Upload,
  Download,
  Edit2,
  Check,
  X,
  FileDown,
  Send,
  DollarSign,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import PhotoGallery from "@/components/photos/PhotoGallery";

export default function TestProfilePage() {
  const urlParams = new URLSearchParams(window.location.search);
  const testId = urlParams.get('id');
  
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  const queryClient = useQueryClient();
  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const { canEdit, isClient, isViewOnly } = useAuth();
  
  const canEditTest = canEdit('tests');

  const { data: test, isLoading, error } = useQuery({
    queryKey: ['test', testId],
    queryFn: async () => {
      const tests = await base44.entities.Test.list();
      const foundTest = tests.find(t => t.id === testId);
      
      if (!foundTest) return null;
      
      if (foundTest.data) {
        return { ...foundTest.data, id: foundTest.id };
      }
      
      return foundTest;
    },
    enabled: !!testId,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const clientList = await base44.entities.Client.list();
      return clientList.map(c => c.data ? { ...c.data, id: c.id } : c);
    },
    initialData: [],
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: async () => {
      const techList = await base44.entities.Technician.list();
      return techList.map(t => t.data ? { ...t.data, id: t.id } : t);
    },
    initialData: [],
  });

  const { data: labs = [] } = useQuery({
    queryKey: ['labs'],
    queryFn: async () => {
      const labList = await base44.entities.Lab.list();
      return labList.map(l => l.data ? { ...l.data, id: l.id } : l);
    },
    initialData: [],
  });

  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (test) {
      setFormData(test);
    }
  }, [test]);

  // Google Maps autocomplete
  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 10;

    const initAutocomplete = () => {
      if (!mounted) return;
      if (!addressInputRef.current) {
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(initAutocomplete, 100);
        }
        return;
      }
      if (autocompleteRef.current) return;

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
              property_address: place.formatted_address
            }));
          }
        });
      } catch (error) {
        console.error('Error initializing autocomplete:', error);
      }
    };

    const loadGoogleMaps = () => {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

      if (!apiKey) {
        console.error('Google Maps API key not configured');
        return;
      }

      if (window.google && window.google.maps && window.google.maps.places) {
        initAutocomplete();
        return;
      }

      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        if (window.google && window.google.maps) {
          initAutocomplete();
        } else {
          existingScript.addEventListener('load', initAutocomplete);
        }
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => initAutocomplete();
      document.head.appendChild(script);
    };

    const timeoutId = setTimeout(loadGoogleMaps, 100);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (autocompleteRef.current && window.google && window.google.maps && window.google.maps.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isEditing]);

  const updateMutation = useMutation({
    mutationFn: (data) => {
      // Remove the id before updating
      const { id, ...updateData } = data;
      return base44.entities.Test.update(testId, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['test', testId]);
      queryClient.invalidateQueries(['tests']);
      setIsEditing(false);
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleDownloadReport = async () => {
    setGeneratingReport(true);
    try {
      const { data } = await base44.functions.invoke('generateTestReport', {
        testIds: [testId],
        includePhotos: false
      });

      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Test_Report_${formData.test_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleSendOnTheWayNotification = async () => {
    setSendingNotification(true);
    try {
      const { data } = await base44.functions.invoke('sendOnTheWayNotification', {
        testId: testId
      });
      if (data.success) {
        alert('On-the-way notification sent successfully!');
        queryClient.invalidateQueries(['test', testId]);
      } else {
        alert(data.message || 'Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Failed to send notification');
    } finally {
      setSendingNotification(false);
    }
  };

  const handleSendLabResultsNotification = async () => {
    setSendingNotification(true);
    try {
      const { data } = await base44.functions.invoke('sendLabResultsNotification', {
        testId: testId
      });
      if (data.success) {
        alert('Lab results notification sent successfully!');
        queryClient.invalidateQueries(['test', testId]);
      } else {
        alert(data.message || 'Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Failed to send notification');
    } finally {
      setSendingNotification(false);
    }
  };

  const handleGenerateInvoice = async () => {
    setGeneratingInvoice(true);
    try {
      const { data } = await base44.functions.invoke('autoGenerateInvoice', {
        testId: testId
      });
      if (data.success) {
        alert(`Invoice ${data.invoice.invoice_number} generated successfully!`);
        queryClient.invalidateQueries(['test', testId]);
        queryClient.invalidateQueries(['invoices']);
      } else {
        alert(data.message || 'Failed to generate invoice');
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Failed to generate invoice');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handleFileUpload = async (e, fieldName) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data } = await base44.integrations.Core.UploadFile({ file });
      
      if (fieldName === 'photos') {
        setFormData(prev => ({
          ...prev,
          photos: [...(prev.photos || []), data.file_url]
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [fieldName]: data.file_url
        }));
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleClientChange = (clientId) => {
    const selectedClient = clients.find(c => c.id === clientId);
    if (selectedClient) {
      setFormData({
        ...formData,
        client_id: clientId,
        client_name: selectedClient.name,
        client_email: selectedClient.email || '',
        client_phone: selectedClient.phone || '',
        sales_rep_name: selectedClient.sales_rep_name || '',
        sales_rep_phone: selectedClient.sales_rep_phone || ''
      });
    }
  };

  const handleTechnicianChange = (techId) => {
    const selectedTech = technicians.find(t => t.id === techId);
    if (selectedTech) {
      setFormData({
        ...formData,
        technician_id: techId,
        technician_name: selectedTech.name
      });
    }
  };

  const handleLabChange = (labId) => {
    const selectedLab = labs.find(l => l.id === labId);
    if (selectedLab) {
      setFormData({
        ...formData,
        lab_id: labId,
        lab_name: selectedLab.name
      });
    }
  };

  const formatDateTimeForInput = (dateTime) => {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
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

  const statusColors = {
    'Scheduled': 'bg-blue-100 text-blue-700 border-blue-200',
    'In Progress': 'bg-purple-100 text-purple-700 border-purple-200',
    'Lab Analysis': 'bg-orange-100 text-orange-700 border-orange-200',
    'Completed': 'bg-green-100 text-green-700 border-green-200',
    'Cancelled': 'bg-gray-100 text-gray-700 border-gray-200',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="clay-card rounded-3xl p-8">
          <p className="text-gray-600">Loading test profile...</p>
          <p className="text-xs text-gray-400 mt-2">Test ID: {testId}</p>
        </div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="clay-card rounded-3xl p-8 text-center">
          <p className="text-gray-600 mb-4">Test not found</p>
          <Button
            onClick={() => window.location.href = createPageUrl('Tests')}
            className="clay-button rounded-2xl px-6 py-3"
          >
            Back to Tests
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="clay-card rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.location.href = createPageUrl('Tests')}
              className="clay-button rounded-2xl p-3 hover:scale-110 transition-transform"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{formData.test_number}</h1>
              <p className="text-gray-500 mt-1">{formData.test_type} - {formData.test_category}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={`${statusColors[formData.status]} border rounded-xl px-4 py-2 font-medium`}>
              {formData.status}
            </Badge>
            {!isEditing ? (
              <>
                <Button
                  onClick={handleDownloadReport}
                  disabled={generatingReport}
                  className="clay-button rounded-2xl px-6 py-3 flex items-center gap-2 font-semibold text-green-600 hover:scale-105"
                >
                  <FileDown className="w-4 h-4" />
                  {generatingReport ? 'Generating...' : 'Download Report'}
                </Button>
                {canEditTest && (
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="clay-button rounded-2xl px-6 py-3 flex items-center gap-2 font-semibold text-purple-600 hover:scale-105"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Profile
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  onClick={() => {
                    setFormData(test);
                    setIsEditing(false);
                  }}
                  className="clay-button rounded-2xl px-6 py-3 flex items-center gap-2 font-medium text-gray-600"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={uploading}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client & Sales Rep Info */}
          <div className="clay-card rounded-3xl p-6">
            <h3 className="text-lg font-bold text-purple-600 flex items-center gap-2 mb-4">
              <User className="w-5 h-5" />
              Company & Sales Rep
            </h3>
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Client/Company</Label>
                  <Select value={formData.client_id} onValueChange={handleClientChange}>
                    <SelectTrigger className="clay-button rounded-2xl border-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-600 mb-3">Referral Source</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-700 font-medium mb-2 block">Referral Company</Label>
                      <Input
                        value={formData.referral_company || ''}
                        onChange={(e) => setFormData({...formData, referral_company: e.target.value})}
                        className="clay-button rounded-2xl border-0"
                        placeholder="Company that referred this job"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700 font-medium mb-2 block">Sales Rep Name</Label>
                      <Input
                        value={formData.sales_rep_name || ''}
                        onChange={(e) => setFormData({...formData, sales_rep_name: e.target.value})}
                        className="clay-button rounded-2xl border-0"
                        placeholder="Rep who sent the job"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <Label className="text-gray-700 font-medium mb-2 block">Sales Rep Phone</Label>
                    <Input
                      value={formData.sales_rep_phone || ''}
                      onChange={(e) => setFormData({...formData, sales_rep_phone: e.target.value})}
                      className="clay-button rounded-2xl border-0"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Company Name</p>
                  <p className="text-lg font-semibold text-gray-800">{formData.client_name}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="text-gray-700">{formData.client_phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="text-gray-700">{formData.client_email || 'N/A'}</p>
                  </div>
                </div>
                {/* Referral Source */}
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-2">Referral Source</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Referral Company</p>
                      <p className="text-gray-700">{formData.referral_company || 'Direct / No Referral'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Sales Rep</p>
                      <p className="text-gray-700">{formData.sales_rep_name || 'N/A'}</p>
                    </div>
                  </div>
                  {formData.sales_rep_phone && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">Sales Rep Phone</p>
                      <p className="text-gray-700">{formData.sales_rep_phone}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Site & Schedule */}
          <div className="clay-card rounded-3xl p-6">
            <h3 className="text-lg font-bold text-blue-600 flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5" />
              Site & Schedule
            </h3>
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Property Address</Label>
                  <Input
                    ref={addressInputRef}
                    value={formData.property_address}
                    onChange={(e) => setFormData({...formData, property_address: e.target.value})}
                    className="clay-button rounded-2xl border-0"
                    autoComplete="off"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-700 font-medium mb-2 block">Scheduled Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={formatDateTimeForInput(formData.scheduled_date)}
                      onChange={(e) => setFormData({...formData, scheduled_date: e.target.value ? new Date(e.target.value).toISOString() : ''})}
                      className="clay-button rounded-2xl border-0"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 font-medium mb-2 block">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                      <SelectTrigger className="clay-button rounded-2xl border-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Scheduled">Scheduled</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Lab Analysis">Lab Analysis</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Assigned Technician</Label>
                  <Select value={formData.technician_id} onValueChange={handleTechnicianChange}>
                    <SelectTrigger className="clay-button rounded-2xl border-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {technicians.map(tech => (
                        <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Property Address</p>
                  <p className="text-gray-700">{formData.property_address}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Scheduled</p>
                    <p className="text-gray-700 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-400" />
                      {formatDateTime(formData.scheduled_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Technician</p>
                    <p className="text-gray-700">{formData.technician_name || 'Not assigned'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Test Details */}
          <div className="clay-card rounded-3xl p-6">
            <h3 className="text-lg font-bold text-green-600 mb-4">Test Details</h3>
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-700 font-medium mb-2 block">Test Category</Label>
                    <Select value={formData.test_category} onValueChange={(value) => setFormData({...formData, test_category: value})}>
                      <SelectTrigger className="clay-button rounded-2xl border-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Initial">Initial</SelectItem>
                        <SelectItem value="Clearance">Clearance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-700 font-medium mb-2 block">Test Type</Label>
                    <Select value={formData.test_type} onValueChange={(value) => setFormData({...formData, test_type: value})}>
                      <SelectTrigger className="clay-button rounded-2xl border-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Air Quality">Air Quality</SelectItem>
                        <SelectItem value="Surface Swab">Surface Swab</SelectItem>
                        <SelectItem value="Bulk Sample">Bulk Sample</SelectItem>
                        <SelectItem value="HVAC Inspection">HVAC Inspection</SelectItem>
                        <SelectItem value="Full Assessment">Full Assessment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Areas Tested</Label>
                  <Input
                    value={formData.areas_tested}
                    onChange={(e) => setFormData({...formData, areas_tested: e.target.value})}
                    className="clay-button rounded-2xl border-0"
                    placeholder="Living Room, Bedroom 1..."
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-gray-700 font-medium mb-2 block">Number of Tests</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.number_of_tests}
                      onChange={(e) => setFormData({...formData, number_of_tests: parseInt(e.target.value) || 1})}
                      className="clay-button rounded-2xl border-0"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 font-medium mb-2 block">Samples Collected</Label>
                    <Input
                      type="number"
                      value={formData.samples_collected}
                      onChange={(e) => setFormData({...formData, samples_collected: parseInt(e.target.value) || 0})}
                      className="clay-button rounded-2xl border-0"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 font-medium mb-2 block">Cost</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) => setFormData({...formData, cost: parseFloat(e.target.value) || 0})}
                      className="clay-button rounded-2xl border-0"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Lab Used</Label>
                  <Select value={formData.lab_id} onValueChange={handleLabChange}>
                    <SelectTrigger className="clay-button rounded-2xl border-0">
                      <SelectValue placeholder="Select lab (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {labs.map(lab => (
                        <SelectItem key={lab.id} value={lab.id}>{lab.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Test Category</p>
                    <p className="text-gray-700 font-medium">{formData.test_category}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Test Type</p>
                    <p className="text-gray-700 font-medium">{formData.test_type}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Areas Tested</p>
                  <p className="text-gray-700">{formData.areas_tested || 'Not specified'}</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Number of Tests</p>
                    <p className="text-gray-700 font-semibold">{formData.number_of_tests}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Samples Collected</p>
                    <p className="text-gray-700 font-semibold">{formData.samples_collected}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Cost</p>
                    <p className="text-gray-700 font-semibold">${formData.cost?.toLocaleString() || '0'}</p>
                  </div>
                </div>
                {formData.lab_name && (
                  <div>
                    <p className="text-sm text-gray-500">Lab Used</p>
                    <p className="text-gray-700">{formData.lab_name}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Automation Actions */}
          {canEditTest && (
            <div className="clay-card rounded-3xl p-6">
              <h3 className="text-lg font-bold text-indigo-600 flex items-center gap-2 mb-4">
                <Bell className="w-5 h-5" />
                Automation Actions
              </h3>
              <div className="space-y-3">
                {/* On-The-Way Notification */}
                {formData.status === 'Scheduled' && (
                  <Button
                    onClick={handleSendOnTheWayNotification}
                    disabled={sendingNotification || formData.on_the_way_notification_sent}
                    className="clay-button rounded-2xl px-4 py-3 w-full flex items-center gap-2 font-medium text-blue-600 hover:scale-[1.02]"
                  >
                    <Send className="w-4 h-4" />
                    {formData.on_the_way_notification_sent ? 'On-The-Way Sent ✓' : 'Send "On The Way" Alert'}
                  </Button>
                )}

                {/* Lab Results Notification */}
                {(formData.status === 'Lab Analysis' || formData.status === 'Completed') && formData.results !== 'Pending' && (
                  <Button
                    onClick={handleSendLabResultsNotification}
                    disabled={sendingNotification || formData.lab_results_notification_sent}
                    className="clay-button rounded-2xl px-4 py-3 w-full flex items-center gap-2 font-medium text-green-600 hover:scale-[1.02]"
                  >
                    <Bell className="w-4 h-4" />
                    {formData.lab_results_notification_sent ? 'Results Sent ✓' : 'Send Lab Results Alert'}
                  </Button>
                )}

                {/* Auto-Generate Invoice */}
                {formData.status === 'Completed' && (
                  <Button
                    onClick={handleGenerateInvoice}
                    disabled={generatingInvoice || formData.auto_invoice_created || formData.invoice_id}
                    className="clay-button rounded-2xl px-4 py-3 w-full flex items-center gap-2 font-medium text-orange-600 hover:scale-[1.02]"
                  >
                    <DollarSign className="w-4 h-4" />
                    {formData.auto_invoice_created || formData.invoice_id ? 'Invoice Generated ✓' : 'Generate Invoice'}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="clay-card rounded-3xl p-6">
            <h3 className="text-lg font-bold text-orange-600 mb-4">Notes & Instructions</h3>
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Access Instructions</Label>
                  <Textarea
                    value={formData.access_instructions}
                    onChange={(e) => setFormData({...formData, access_instructions: e.target.value})}
                    className="clay-button rounded-2xl border-0 min-h-[100px]"
                    placeholder="Gate code, parking, contact info..."
                  />
                </div>
                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Client Comments / Special Requests</Label>
                  <Textarea
                    value={formData.client_comments_special_requests}
                    onChange={(e) => setFormData({...formData, client_comments_special_requests: e.target.value})}
                    className="clay-button rounded-2xl border-0 min-h-[100px]"
                    placeholder="Any special requests..."
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {formData.access_instructions && (
                  <div>
                    <p className="text-sm text-gray-500">Access Instructions</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{formData.access_instructions}</p>
                  </div>
                )}
                {formData.client_comments_special_requests && (
                  <div>
                    <p className="text-sm text-gray-500">Client Comments / Special Requests</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{formData.client_comments_special_requests}</p>
                  </div>
                )}
                {!formData.access_instructions && !formData.client_comments_special_requests && (
                  <p className="text-gray-400 italic">No notes added</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Documents & Photos */}
        <div className="space-y-6">
          {/* Report Tracking */}
          <div className="clay-card rounded-3xl p-6">
            <h3 className="text-lg font-bold text-emerald-600 flex items-center gap-2 mb-4">
              <Check className="w-5 h-5" />
              Report Tracking
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between clay-button rounded-2xl p-4">
                <div>
                  <p className="font-medium text-gray-700">In Reports</p>
                  <p className="text-xs text-gray-500">Lab results received</p>
                </div>
                {isEditing ? (
                  <input
                    type="checkbox"
                    checked={formData.in_reports || false}
                    onChange={(e) => setFormData({...formData, in_reports: e.target.checked})}
                    className="w-5 h-5 rounded accent-emerald-500"
                  />
                ) : (
                  <Badge className={formData.in_reports ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                    {formData.in_reports ? '✓ Received' : 'Pending'}
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between clay-button rounded-2xl p-4">
                <div>
                  <p className="font-medium text-gray-700">Out Reports</p>
                  <p className="text-xs text-gray-500">Report sent to client</p>
                </div>
                {isEditing ? (
                  <input
                    type="checkbox"
                    checked={formData.out_reports || false}
                    onChange={(e) => setFormData({...formData, out_reports: e.target.checked})}
                    className="w-5 h-5 rounded accent-emerald-500"
                  />
                ) : (
                  <Badge className={formData.out_reports ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>
                    {formData.out_reports ? '✓ Sent' : 'Pending'}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Lab Chain of Custody */}
          <div className="clay-card rounded-3xl p-6">
            <h3 className="text-lg font-bold text-orange-600 flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5" />
              Lab Chain of Custody
            </h3>
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Date Sent to Lab</Label>
                  <Input
                    type="date"
                    value={formData.date_sent_to_lab || ''}
                    onChange={(e) => setFormData({...formData, date_sent_to_lab: e.target.value})}
                    className="clay-button rounded-2xl border-0"
                  />
                </div>
                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Lab Received (Date & Time)</Label>
                  <Input
                    type="datetime-local"
                    value={formData.lab_received_datetime ? formatDateTimeForInput(formData.lab_received_datetime) : ''}
                    onChange={(e) => {
                      const receivedDateTime = e.target.value ? new Date(e.target.value).toISOString() : '';
                      const tat = formData.lab_tat_hours || 24;
                      let dueDateTime = '';
                      if (receivedDateTime) {
                        const dueDate = new Date(receivedDateTime);
                        dueDate.setHours(dueDate.getHours() + tat);
                        dueDateTime = dueDate.toISOString();
                      }
                      setFormData({
                        ...formData,
                        lab_received_datetime: receivedDateTime,
                        lab_results_due_datetime: dueDateTime
                      });
                    }}
                    className="clay-button rounded-2xl border-0"
                  />
                </div>
                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">TAT (Hours)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.lab_tat_hours || 24}
                    onChange={(e) => {
                      const tat = parseInt(e.target.value) || 24;
                      let dueDateTime = '';
                      if (formData.lab_received_datetime) {
                        const dueDate = new Date(formData.lab_received_datetime);
                        dueDate.setHours(dueDate.getHours() + tat);
                        dueDateTime = dueDate.toISOString();
                      }
                      setFormData({
                        ...formData,
                        lab_tat_hours: tat,
                        lab_results_due_datetime: dueDateTime
                      });
                    }}
                    className="clay-button rounded-2xl border-0"
                  />
                </div>
                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Results Due</Label>
                  <Input
                    type="datetime-local"
                    value={formData.lab_results_due_datetime ? formatDateTimeForInput(formData.lab_results_due_datetime) : ''}
                    onChange={(e) => setFormData({...formData, lab_results_due_datetime: e.target.value ? new Date(e.target.value).toISOString() : ''})}
                    className="clay-button rounded-2xl border-0"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Sent to Lab</p>
                    <p className="text-sm font-medium text-gray-700">
                      {formData.date_sent_to_lab ? new Date(formData.date_sent_to_lab).toLocaleDateString() : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Lab Received</p>
                    <p className="text-sm font-medium text-gray-700">
                      {formData.lab_received_datetime ? formatDateTime(formData.lab_received_datetime) : '—'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">TAT</p>
                    <p className="text-sm font-medium text-gray-700">{formData.lab_tat_hours || 24} hours</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Results Due</p>
                    <p className="text-sm font-medium text-gray-700">
                      {formData.lab_results_due_datetime ? formatDateTime(formData.lab_results_due_datetime) : '—'}
                    </p>
                  </div>
                </div>
                {formData.lab_results_due_datetime && (
                  <div className="pt-2">
                    {(() => {
                      const now = new Date();
                      const due = new Date(formData.lab_results_due_datetime);
                      const isPastDue = now > due && !formData.in_reports;
                      return (
                        <Badge className={isPastDue ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
                          {isPastDue ? '⚠️ Past Due' : '✓ On Time'}
                        </Badge>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Technician Pay */}
          <div className="clay-card rounded-3xl p-6">
            <h3 className="text-lg font-bold text-blue-600 flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5" />
              Technician Pay
            </h3>
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Pay Amount ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.technician_pay || ''}
                    onChange={(e) => setFormData({...formData, technician_pay: parseFloat(e.target.value) || 0})}
                    className="clay-button rounded-2xl border-0"
                    placeholder="100.00"
                  />
                </div>
                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Pay Adjustment</Label>
                  <Select
                    value={formData.pay_adjustment || 'none'}
                    onValueChange={(value) => setFormData({...formData, pay_adjustment: value})}
                  >
                    <SelectTrigger className="clay-button rounded-2xl border-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Adjustment</SelectItem>
                      <SelectItem value="extra_distance">Extra Distance (+$)</SelectItem>
                      <SelectItem value="half_pay">Half Pay (Cancellation)</SelectItem>
                      <SelectItem value="double_pay">Double Pay</SelectItem>
                      <SelectItem value="custom">Custom Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.pay_adjustment && formData.pay_adjustment !== 'none' && (
                  <div>
                    <Label className="text-gray-700 font-medium mb-2 block">Adjustment Notes</Label>
                    <Input
                      value={formData.pay_adjustment_notes || ''}
                      onChange={(e) => setFormData({...formData, pay_adjustment_notes: e.target.value})}
                      className="clay-button rounded-2xl border-0"
                      placeholder="Reason for adjustment..."
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-gray-500">Pay Amount</p>
                  <p className="text-xl font-bold text-gray-800">${formData.technician_pay?.toFixed(2) || '0.00'}</p>
                </div>
                {formData.pay_adjustment && formData.pay_adjustment !== 'none' && (
                  <div>
                    <Badge className="bg-blue-100 text-blue-700">
                      {formData.pay_adjustment === 'extra_distance' && '+ Extra Distance'}
                      {formData.pay_adjustment === 'half_pay' && 'Half Pay'}
                      {formData.pay_adjustment === 'double_pay' && 'Double Pay'}
                      {formData.pay_adjustment === 'custom' && 'Custom'}
                    </Badge>
                    {formData.pay_adjustment_notes && (
                      <p className="text-xs text-gray-500 mt-1">{formData.pay_adjustment_notes}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Documents */}
          <div className="clay-card rounded-3xl p-6">
            <h3 className="text-lg font-bold text-indigo-600 flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5" />
              Documents
            </h3>
            <div className="space-y-4">
              {/* Lab Report */}
              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Lab Report</Label>
                {isEditing ? (
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleFileUpload(e, 'lab_report_url')}
                    className="clay-button rounded-2xl border-0"
                    disabled={uploading}
                  />
                ) : null}
                {formData.lab_report_url && (
                  <a 
                    href={formData.lab_report_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="clay-button rounded-2xl p-3 flex items-center gap-2 hover:scale-[1.02] transition-transform mt-2"
                  >
                    <Download className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm text-gray-700">Download Lab Report</span>
                  </a>
                )}
                {!formData.lab_report_url && !isEditing && (
                  <p className="text-sm text-gray-400 italic">No report uploaded</p>
                )}
              </div>

              {/* Recommendation PDF */}
              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Recommendation PDF</Label>
                {isEditing ? (
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => handleFileUpload(e, 'recommendation_pdf_url')}
                    className="clay-button rounded-2xl border-0"
                    disabled={uploading}
                  />
                ) : null}
                {formData.recommendation_pdf_url && (
                  <a 
                    href={formData.recommendation_pdf_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="clay-button rounded-2xl p-3 flex items-center gap-2 hover:scale-[1.02] transition-transform mt-2"
                  >
                    <Download className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm text-gray-700">Download Recommendations</span>
                  </a>
                )}
                {!formData.recommendation_pdf_url && !isEditing && (
                  <p className="text-sm text-gray-400 italic">No PDF uploaded</p>
                )}
              </div>

              {uploading && (
                <p className="text-sm text-blue-600">Uploading...</p>
              )}
            </div>
          </div>

          {/* Photos */}
          <div className="clay-card rounded-3xl p-6">
            <h3 className="text-lg font-bold text-pink-600 flex items-center gap-2 mb-4">
              <ImageIcon className="w-5 h-5" />
              Photos
            </h3>
            <PhotoGallery
              photos={formData.photos || []}
              onPhotosChange={(photos) => setFormData(prev => ({ ...prev, photos }))}
              readOnly={!isEditing}
            />
          </div>
        </div>
      </div>
    </div>
  );
}