import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";

// Phone validation: allows only digits, spaces, dashes, parentheses, plus sign
// Must have at least 7 digits
const isValidPhone = (phone) => {
  console.log('=== PHONE VALIDATION ===');
  console.log('Input phone:', phone, 'type:', typeof phone);

  if (!phone || phone === '' || phone === null || phone === undefined) {
    console.log('Phone is empty/null/undefined');
    return false;
  }

  // Check for any letters (which would make it invalid)
  const hasLetters = /[a-zA-Z]/.test(phone);
  if (hasLetters) {
    console.log('Phone contains letters - INVALID');
    return false;
  }

  // Only allow digits, spaces, dashes, parentheses, plus sign
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  const passesRegex = phoneRegex.test(phone);
  console.log('Regex test result:', passesRegex);

  // Must have at least 7 digits
  const digitsOnly = phone.replace(/\D/g, '');
  const hasEnoughDigits = digitsOnly.length >= 7;
  console.log('Digits only:', digitsOnly, 'count:', digitsOnly.length, 'has enough:', hasEnoughDigits);

  const isValid = passesRegex && hasEnoughDigits;
  console.log('Final isValid:', isValid);
  return isValid;
};

export default function ClientModal({ client, onClose, onSave, saving = false }) {
  const [clientType, setClientType] = useState(client?.client_type || 'Direct Client');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    sales_rep_name: '',
    sales_rep_phone: '',
    sales_rep_email: '',
    commission_percentage: 0,
    status: 'Active',
    notes: '',
    ...client
  });
  const [errors, setErrors] = useState({});

  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);

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

      // Clean up previous autocomplete instance
      if (autocompleteRef.current && window.google && window.google.maps && window.google.maps.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }

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
      script.onerror = () => {
        console.error('Failed to load Google Maps script');
      };
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
  }, [clientType]); // Re-initialize when clientType changes

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('=== CLIENT FORM SUBMIT ===');
    console.log('formData.phone:', formData.phone);
    console.log('formData.name:', formData.name);
    console.log('formData.email:', formData.email);

    const newErrors = {};

    // Validate phone number
    const phoneIsValid = isValidPhone(formData.phone);
    console.log('Phone validation result:', phoneIsValid);

    if (!phoneIsValid) {
      newErrors.phone = 'Please enter a valid phone number (digits, dashes, spaces only)';
      console.log('VALIDATION FAILED: invalid phone');
    }

    console.log('Validation errors:', newErrors);
    console.log('Number of errors:', Object.keys(newErrors).length);

    if (Object.keys(newErrors).length > 0) {
      console.log('STOPPING SUBMISSION - validation failed');
      setErrors(newErrors);
      return;
    }

    console.log('VALIDATION PASSED - calling onSave');
    setErrors({});
    const dataToSave = {
      ...formData,
      client_type: clientType
    };
    onSave(dataToSave);
  };

  const isDirectClient = clientType === 'Direct Client';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="clay-card rounded-3xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {client ? 'Edit Client' : 'New Client'}
          </h2>
          <button
            onClick={onClose}
            className="clay-button rounded-2xl p-2 hover:scale-110 transition-transform"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Type Selection */}
          <div>
            <Label className="text-gray-700 font-medium mb-2 block">
              Client Type <span className="text-red-500">*</span>
            </Label>
            <Select value={clientType} onValueChange={setClientType}>
              <SelectTrigger className="clay-button rounded-2xl border-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[70]">
                <SelectItem value="Direct Client">
                  Direct Client (homeowner, tenant, property manager)
                </SelectItem>
                <SelectItem value="Referral Company">
                  Referral Company (restoration, HVAC, inspection company)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Direct Client Fields */}
          {isDirectClient ? (
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <h3 className="text-lg font-bold text-blue-600">Client Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label className="text-gray-700 font-medium mb-2 block">
                    Client Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="clay-button rounded-2xl border-0"
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">
                    Phone <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => { setFormData({...formData, phone: e.target.value}); setErrors({...errors, phone: ''}); }}
                    className={`clay-button rounded-2xl border-0 ${errors.phone ? 'ring-2 ring-red-400' : ''}`}
                    placeholder="(555) 123-4567"
                    required
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="clay-button rounded-2xl border-0"
                    placeholder="john@example.com"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <Label className="text-gray-700 font-medium mb-2 block">Billing Address</Label>
                  <Input
                    ref={addressInputRef}
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="clay-button rounded-2xl border-0"
                    placeholder="Start typing address..."
                    autoComplete="off"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave blank if same as site address, or start typing to search</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Company Info */}
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <h3 className="text-lg font-bold text-purple-600">Company Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label className="text-gray-700 font-medium mb-2 block">
                      Company Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="clay-button rounded-2xl border-0"
                      placeholder="ABC Restoration Company"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-gray-700 font-medium mb-2 block">
                      Main Contact / AP Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="clay-button rounded-2xl border-0"
                      placeholder="billing@company.com"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-gray-700 font-medium mb-2 block">
                      Phone <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => { setFormData({...formData, phone: e.target.value}); setErrors({...errors, phone: ''}); }}
                      className={`clay-button rounded-2xl border-0 ${errors.phone ? 'ring-2 ring-red-400' : ''}`}
                      placeholder="(555) 123-4567"
                      required
                    />
                    {errors.phone && (
                      <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <Label className="text-gray-700 font-medium mb-2 block">Office Address</Label>
                    <Input
                      ref={addressInputRef}
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="clay-button rounded-2xl border-0"
                      placeholder="Start typing address..."
                      autoComplete="off"
                    />
                    <p className="text-xs text-gray-500 mt-1">Start typing and select from suggestions</p>
                  </div>
                </div>
              </div>

              {/* Sales Rep Info */}
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <h3 className="text-lg font-bold text-green-600">Sales Rep Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label className="text-gray-700 font-medium mb-2 block">
                      Sales Rep Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.sales_rep_name}
                      onChange={(e) => setFormData({...formData, sales_rep_name: e.target.value})}
                      className="clay-button rounded-2xl border-0"
                      placeholder="Jane Smith"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-gray-700 font-medium mb-2 block">Rep Phone</Label>
                    <Input
                      value={formData.sales_rep_phone}
                      onChange={(e) => setFormData({...formData, sales_rep_phone: e.target.value})}
                      className="clay-button rounded-2xl border-0"
                      placeholder="(555) 987-6543"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-700 font-medium mb-2 block">Rep Email</Label>
                    <Input
                      type="email"
                      value={formData.sales_rep_email}
                      onChange={(e) => setFormData({...formData, sales_rep_email: e.target.value})}
                      className="clay-button rounded-2xl border-0"
                      placeholder="jane@company.com"
                    />
                  </div>

                  <div>
                    <Label className="text-gray-700 font-medium mb-2 block">Commission %</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.commission_percentage}
                      onChange={(e) => setFormData({...formData, commission_percentage: parseFloat(e.target.value) || 0})}
                      className="clay-button rounded-2xl border-0"
                      placeholder="10.00"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

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

          <div className="flex gap-3 justify-end pt-4">
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
              className="clay-button rounded-2xl px-6 py-3 font-semibold text-blue-600 hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : (client ? 'Update' : 'Create')} {!saving && 'Client'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}