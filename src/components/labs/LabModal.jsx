import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";

export default function LabModal({ lab, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    accreditation: '',
    email: '',
    phone: '',
    address: '',
    turnaround_time: '',
    status: 'Active',
    cost_per_sample: 0,
    notes: '',
    ...lab
  });

  const addressInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
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
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="clay-card rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {lab ? 'Edit Lab' : 'New Lab'}
          </h2>
          <button
            onClick={onClose}
            className="clay-button rounded-2xl p-2 hover:scale-110 transition-transform"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Lab Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="clay-button rounded-2xl border-0"
                placeholder="Lab Name"
                required
              />
            </div>

            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Accreditation</Label>
              <Input
                value={formData.accreditation}
                onChange={(e) => setFormData({...formData, accreditation: e.target.value})}
                className="clay-button rounded-2xl border-0"
                placeholder="ISO 17025"
              />
            </div>

            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="clay-button rounded-2xl border-0"
                placeholder="lab@example.com"
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
              <Label className="text-gray-700 font-medium mb-2 block">Turnaround Time</Label>
              <Input
                value={formData.turnaround_time}
                onChange={(e) => setFormData({...formData, turnaround_time: e.target.value})}
                className="clay-button rounded-2xl border-0"
                placeholder="3-5 business days"
              />
            </div>

            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Cost per Sample</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.cost_per_sample}
                onChange={(e) => setFormData({...formData, cost_per_sample: parseFloat(e.target.value) || 0})}
                className="clay-button rounded-2xl border-0"
                placeholder="0.00"
              />
            </div>

            <div className="md:col-span-2">
              <Label className="text-gray-700 font-medium mb-2 block">Address</Label>
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

            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                <SelectTrigger className="clay-button rounded-2xl border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
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
              className="clay-button rounded-2xl px-6 py-3 font-semibold text-purple-600 hover:scale-105 transition-transform"
            >
              {lab ? 'Update' : 'Create'} Lab
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}