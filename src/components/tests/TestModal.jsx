import { useState, useEffect, useRef } from "react";
import { X, Plus, User, Upload, FileText, Image as ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import ClientModal from "../clients/ClientModal";

export default function TestModal({ test, clients, technicians, labs, onClose, onSave }) {
  const [formData, setFormData] = useState({
    test_number: '',
    client_id: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    sales_rep_name: '',
    sales_rep_phone: '',
    property_address: '',
    test_type: 'Air Quality',
    test_category: 'Initial',
    areas_tested: '',
    number_of_tests: 1,
    status: 'Scheduled',
    scheduled_date: '',
    technician_id: '',
    technician_name: '',
    lab_id: '',
    lab_name: '',
    samples_collected: 0,
    results: 'Pending',
    lab_report_url: '',
    recommendation_pdf_url: '',
    photos: [],
    invoice_id: '',
    notes: '',
    access_instructions: '',
    client_comments_special_requests: '',
    cost: 0,
    ...test
  });

  const [showClientModal, setShowClientModal] = useState(false);
  const [isNewClient, setIsNewClient] = useState(false);
  const [uploading, setUploading] = useState(false);

  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  // Auto-generate test number for new tests
  useEffect(() => {
    const generateTestNumber = async () => {
      if (test) return;

      try {
        const allTests = await base44.entities.Test.list();
        const currentYear = new Date().getFullYear();
        const yearPrefix = `T-${currentYear}-`;
        const currentYearTests = allTests
          .filter(t => t.test_number && t.test_number.startsWith(yearPrefix))
          .map(t => {
            const parts = t.test_number.split('-');
            return parseInt(parts[2]) || 0;
          });

        const maxNumber = currentYearTests.length > 0 ? Math.max(...currentYearTests) : 0;
        const nextNumber = maxNumber + 1;
        const paddedNumber = String(nextNumber).padStart(3, '0');
        
        const generatedTestNumber = `T-${currentYear}-${paddedNumber}`;
        
        setFormData(prev => ({
          ...prev,
          test_number: generatedTestNumber
        }));
      } catch (error) {
        console.error('Error generating test number:', error);
      }
    };

    generateTestNumber();
  }, [test]);

  // Google Maps autocomplete
  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 10;

    const initAutocomplete = () => {
      if (!mounted) return;
      if (!addressInputRef.current) {
        // Retry if ref not ready yet
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(initAutocomplete, 100);
        }
        return;
      }
      if (autocompleteRef.current) return; // Already initialized

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

      // Check if script is already loaded or loading
      if (window.google && window.google.maps && window.google.maps.places) {
        initAutocomplete();
        return;
      }

      // Check if script tag already exists
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        // Script exists but may still be loading
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

    // Small delay to ensure modal is rendered
    const timeoutId = setTimeout(loadGoogleMaps, 100);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (autocompleteRef.current && window.google && window.google.maps && window.google.maps.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleClientChange = (clientId) => {
    if (clientId === 'new') {
      setIsNewClient(true);
      setShowClientModal(true);
      return;
    }

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
      setIsNewClient(false);
    }
  };

  const handleNewClientSave = async (clientData) => {
    try {
      const newClient = await base44.entities.Client.create(clientData);
      setFormData({
        ...formData,
        client_id: newClient.id,
        client_name: newClient.name,
        client_email: newClient.email || '',
        client_phone: newClient.phone || '',
        sales_rep_name: newClient.sales_rep_name || '',
        sales_rep_phone: newClient.sales_rep_phone || ''
      });
      setShowClientModal(false);
      setIsNewClient(false);
      window.location.reload();
    } catch (error) {
      console.error('Error creating client:', error);
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

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
        <div className="clay-card rounded-3xl p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {test ? 'Edit Test Profile' : 'New Test Profile'}
            </h2>
            <button
              onClick={onClose}
              className="clay-button rounded-2xl p-2 hover:scale-110 transition-transform"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 1. Client & Sales Rep Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-purple-600 flex items-center gap-2">
                <User className="w-5 h-5" />
                Company & Sales Rep
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label className="text-gray-700 font-medium mb-2 block">
                    Client/Company <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.client_id} onValueChange={handleClientChange}>
                    <SelectTrigger className="clay-button rounded-2xl border-0">
                      <SelectValue placeholder="Search or select client..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">
                        <div className="flex items-center gap-2 text-purple-600 font-semibold">
                          <Plus className="w-4 h-4" />
                          + New Client
                        </div>
                      </SelectItem>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} {client.email && `(${client.email})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.client_id && !isNewClient && (
                  <div className="md:col-span-2 clay-button rounded-2xl p-4 bg-purple-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Phone:</span>
                        <span className="ml-2 font-medium text-gray-700">{formData.client_phone || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Email:</span>
                        <span className="ml-2 font-medium text-gray-700">{formData.client_email || 'N/A'}</span>
                      </div>
                      {formData.sales_rep_name && (
                        <>
                          <div>
                            <span className="text-gray-500">Sales Rep:</span>
                            <span className="ml-2 font-medium text-gray-700">{formData.sales_rep_name}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Rep Phone:</span>
                            <span className="ml-2 font-medium text-gray-700">{formData.sales_rep_phone || 'N/A'}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Site Visit Basics */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <h3 className="text-lg font-bold text-blue-600">Site & Schedule</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label className="text-gray-700 font-medium mb-2 block">
                    Property Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    ref={addressInputRef}
                    value={formData.property_address}
                    onChange={(e) => setFormData({...formData, property_address: e.target.value})}
                    className="clay-button rounded-2xl border-0"
                    placeholder="Start typing address..."
                    required
                    autoComplete="off"
                  />
                </div>

                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">
                    Test Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.test_number}
                    onChange={(e) => setFormData({...formData, test_number: e.target.value})}
                    className="clay-button rounded-2xl border-0 bg-gray-50"
                    required
                    readOnly
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

                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">
                    Scheduled Date & Time <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="datetime-local"
                    value={formatDateTimeForInput(formData.scheduled_date)}
                    onChange={(e) => setFormData({...formData, scheduled_date: e.target.value ? new Date(e.target.value).toISOString() : ''})}
                    className="clay-button rounded-2xl border-0"
                    required
                  />
                </div>

                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">
                    Assigned Technician <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.technician_id} onValueChange={handleTechnicianChange} required>
                    <SelectTrigger className="clay-button rounded-2xl border-0">
                      <SelectValue placeholder="Select technician" />
                    </SelectTrigger>
                    <SelectContent>
                      {technicians.map(tech => (
                        <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* 3. Test Details */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <h3 className="text-lg font-bold text-green-600">Test Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">
                    Test Category <span className="text-red-500">*</span>
                  </Label>
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
                  <Label className="text-gray-700 font-medium mb-2 block">
                    Test Type <span className="text-red-500">*</span>
                  </Label>
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

                <div className="md:col-span-3">
                  <Label className="text-gray-700 font-medium mb-2 block">Areas Tested</Label>
                  <Input
                    value={formData.areas_tested}
                    onChange={(e) => setFormData({...formData, areas_tested: e.target.value})}
                    className="clay-button rounded-2xl border-0"
                    placeholder="e.g., Living Room, Bedroom 1, Bathroom, Basement"
                  />
                </div>

                <div>
                  <Label className="text-gray-700 font-medium mb-2 block"># Samples Collected</Label>
                  <Input
                    type="number"
                    value={formData.samples_collected}
                    onChange={(e) => setFormData({...formData, samples_collected: parseInt(e.target.value) || 0})}
                    className="clay-button rounded-2xl border-0"
                  />
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

                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Cost</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({...formData, cost: parseFloat(e.target.value) || 0})}
                    className="clay-button rounded-2xl border-0"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* 4. Linked Documents */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <h3 className="text-lg font-bold text-indigo-600 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Linked Documents
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Lab Report */}
                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Lab Report</Label>
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => handleFileUpload(e, 'lab_report_url')}
                      className="clay-button rounded-2xl border-0"
                      disabled={uploading}
                    />
                  </div>
                  {formData.lab_report_url && (
                    <a 
                      href={formData.lab_report_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline mt-1 block"
                    >
                      View Current Report
                    </a>
                  )}
                </div>

                {/* Recommendation PDF */}
                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Recommendation PDF</Label>
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handleFileUpload(e, 'recommendation_pdf_url')}
                      className="clay-button rounded-2xl border-0"
                      disabled={uploading}
                    />
                  </div>
                  {formData.recommendation_pdf_url && (
                    <a 
                      href={formData.recommendation_pdf_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline mt-1 block"
                    >
                      View Current PDF
                    </a>
                  )}
                </div>

                {/* Photos */}
                <div className="md:col-span-2">
                  <Label className="text-gray-700 font-medium mb-2 block flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Photos
                  </Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'photos')}
                    className="clay-button rounded-2xl border-0"
                    disabled={uploading}
                  />
                  
                  {formData.photos && formData.photos.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-4">
                      {formData.photos.map((photo, index) => (
                        <div key={index} className="relative group">
                          <img 
                            src={photo} 
                            alt={`Photo ${index + 1}`} 
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {uploading && (
                <p className="text-sm text-blue-600">Uploading...</p>
              )}
            </div>

            {/* 5. Notes */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <h3 className="text-lg font-bold text-orange-600">Notes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 justify-end pt-6 border-t border-gray-200">
              <Button
                type="button"
                onClick={onClose}
                className="clay-button rounded-2xl px-6 py-3 font-medium text-gray-600"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="clay-button rounded-2xl px-6 py-3 font-semibold text-purple-600 hover:scale-105 transition-transform"
                disabled={uploading}
              >
                {test ? 'Update' : 'Create'} Test Profile
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Client Modal */}
      {showClientModal && (
        <ClientModal
          onClose={() => {
            setShowClientModal(false);
            setIsNewClient(false);
          }}
          onSave={handleNewClientSave}
        />
      )}
    </>
  );
}