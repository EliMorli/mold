import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MapPin, FlaskConical, Calendar, User, Filter, List, Map as MapIcon, Loader2, Search, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPageUrl } from "@/utils";

export default function MapPage() {
  const queryClient = useQueryClient();
  const [selectedTest, setSelectedTest] = useState(null);
  const [statusFilter, setStatusFilter] = useState("active");
  const [viewMode, setViewMode] = useState("list");
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [droppedPin, setDroppedPin] = useState(null);
  const [showNewJobForm, setShowNewJobForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const droppedPinMarkerRef = useRef(null);
  const geocoderRef = useRef(null);
  const searchInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  const [newJobData, setNewJobData] = useState({
    property_address: '',
    client_name: '',
    client_phone: '',
    test_type: 'Air Quality',
    test_category: 'Initial',
    scheduled_date: '',
    notes: ''
  });

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['tests'],
    queryFn: () => base44.entities.Test.list('-scheduled_date'),
    initialData: [],
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    initialData: [],
  });

  const filteredTests = tests.filter(test => {
    if (statusFilter === "active") {
      return test.status === 'Scheduled' || test.status === 'In Progress';
    }
    if (statusFilter === "completed") {
      return test.status === 'Completed';
    }
    return true;
  });

  // Load Google Maps
  useEffect(() => {
    if (viewMode !== "map") return;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setMapError("Google Maps API key not configured");
      return;
    }

    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        initMap();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => initMap();
      script.onerror = () => setMapError("Failed to load Google Maps");
      document.head.appendChild(script);
    };

    const initMap = () => {
      if (!mapRef.current || mapInstanceRef.current) return;

      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 39.8283, lng: -98.5795 },
        zoom: 4,
        styles: [
          { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
        ]
      });
      geocoderRef.current = new window.google.maps.Geocoder();

      // Add click listener to drop pin
      mapInstanceRef.current.addListener('click', (e) => {
        handleMapClick(e.latLng);
      });

      setMapLoaded(true);
    };

    loadGoogleMaps();
  }, [viewMode]);

  // Initialize search autocomplete
  useEffect(() => {
    if (!mapLoaded || !searchInputRef.current) return;

    if (window.google && window.google.maps && window.google.maps.places) {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        searchInputRef.current,
        { types: ['address'], componentRestrictions: { country: 'us' } }
      );

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();
        if (place.geometry) {
          const location = place.geometry.location;
          mapInstanceRef.current.setCenter(location);
          mapInstanceRef.current.setZoom(16);

          // Drop a pin at this location
          handleMapClick(location, place.formatted_address);
        }
      });
    }

    return () => {
      if (autocompleteRef.current && window.google && window.google.maps) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [mapLoaded]);

  // Handle map click to drop pin
  const handleMapClick = (latLng, address = null) => {
    // Remove existing dropped pin
    if (droppedPinMarkerRef.current) {
      droppedPinMarkerRef.current.setMap(null);
    }

    // Create new dropped pin marker
    droppedPinMarkerRef.current = new window.google.maps.Marker({
      position: latLng,
      map: mapInstanceRef.current,
      draggable: true,
      animation: window.google.maps.Animation.DROP,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: '#ef4444',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
      }
    });

    // Update position when dragged
    droppedPinMarkerRef.current.addListener('dragend', (e) => {
      reverseGeocode(e.latLng);
    });

    if (address) {
      setDroppedPin({ lat: latLng.lat(), lng: latLng.lng(), address });
      setNewJobData(prev => ({ ...prev, property_address: address }));
      setShowNewJobForm(true);
    } else {
      reverseGeocode(latLng);
    }
  };

  // Reverse geocode to get address from coordinates
  const reverseGeocode = (latLng) => {
    if (!geocoderRef.current) return;

    geocoderRef.current.geocode({ location: latLng }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const address = results[0].formatted_address;
        setDroppedPin({ lat: latLng.lat(), lng: latLng.lng(), address });
        setNewJobData(prev => ({ ...prev, property_address: address }));
        setShowNewJobForm(true);
      }
    });
  };

  // Add markers when map is loaded and tests change
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !geocoderRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    const bounds = new window.google.maps.LatLngBounds();
    let hasValidLocations = false;

    filteredTests.forEach(test => {
      if (!test.property_address) return;

      geocoderRef.current.geocode({ address: test.property_address }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const location = results[0].geometry.location;
          hasValidLocations = true;

          const marker = new window.google.maps.Marker({
            position: location,
            map: mapInstanceRef.current,
            title: test.property_address,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: test.status === 'Completed' ? '#22c55e' :
                         test.status === 'In Progress' ? '#a855f7' : '#3b82f6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            }
          });

          const infoWindow = new window.google.maps.InfoWindow({
            content: `
              <div style="padding: 8px; max-width: 200px;">
                <strong>${test.test_number}</strong><br/>
                <span style="color: #666;">${test.property_address}</span><br/>
                <span style="color: #666;">${test.client_name || ''}</span><br/>
                <a href="${createPageUrl('TestProfile')}?id=${test.id}" style="color: #0891b2; text-decoration: underline;">View Details</a>
              </div>
            `
          });

          marker.addListener('click', () => {
            infoWindow.open(mapInstanceRef.current, marker);
          });

          markersRef.current.push(marker);
          bounds.extend(location);

          if (markersRef.current.length === filteredTests.filter(t => t.property_address).length) {
            if (hasValidLocations && markersRef.current.length > 0) {
              mapInstanceRef.current.fitBounds(bounds);
              if (markersRef.current.length === 1) {
                mapInstanceRef.current.setZoom(14);
              }
            }
          }
        }
      });
    });
  }, [mapLoaded, filteredTests]);

  const handleCreateJob = async () => {
    setSaving(true);
    try {
      // Generate test number
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
      const testNumber = `T-${currentYear}-${String(nextNumber).padStart(3, '0')}`;

      const newTest = {
        test_number: testNumber,
        property_address: newJobData.property_address,
        client_name: newJobData.client_name,
        client_phone: newJobData.client_phone,
        test_type: newJobData.test_type,
        test_category: newJobData.test_category,
        scheduled_date: newJobData.scheduled_date,
        notes: newJobData.notes,
        status: 'Scheduled',
        results: 'Pending'
      };

      await base44.entities.Test.create(newTest);
      queryClient.invalidateQueries({ queryKey: ['tests'] });

      // Reset form
      setShowNewJobForm(false);
      setDroppedPin(null);
      if (droppedPinMarkerRef.current) {
        droppedPinMarkerRef.current.setMap(null);
        droppedPinMarkerRef.current = null;
      }
      setNewJobData({
        property_address: '',
        client_name: '',
        client_phone: '',
        test_type: 'Air Quality',
        test_category: 'Initial',
        scheduled_date: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error creating job:', error);
    } finally {
      setSaving(false);
    }
  };

  const cancelNewJob = () => {
    setShowNewJobForm(false);
    setDroppedPin(null);
    if (droppedPinMarkerRef.current) {
      droppedPinMarkerRef.current.setMap(null);
      droppedPinMarkerRef.current = null;
    }
  };

  const statusColors = {
    'Scheduled': 'bg-blue-100 text-blue-700 border-blue-200',
    'In Progress': 'bg-purple-100 text-purple-700 border-purple-200',
    'Lab Analysis': 'bg-orange-100 text-orange-700 border-orange-200',
    'Completed': 'bg-green-100 text-green-700 border-green-200',
  };

  const formatDateTime = (dateTime) => {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="clay-card rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-500 bg-clip-text text-transparent">
              Test Locations
            </h1>
            <p className="text-gray-500 mt-1">{filteredTests.length} locations</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("list")}
              className={`px-4 py-2 rounded-xl font-medium transition-all text-sm flex items-center gap-2 ${
                viewMode === "list"
                  ? 'clay-nav-active text-cyan-700'
                  : 'clay-button text-gray-600 hover:scale-105'
              }`}
            >
              <List className="w-4 h-4" />
              List
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`px-4 py-2 rounded-xl font-medium transition-all text-sm flex items-center gap-2 ${
                viewMode === "map"
                  ? 'clay-nav-active text-cyan-700'
                  : 'clay-button text-gray-600 hover:scale-105'
              }`}
            >
              <MapIcon className="w-4 h-4" />
              Map
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="clay-card rounded-3xl p-6">
        <div className="flex gap-2 overflow-x-auto">
          {[
            { key: 'active', label: 'Active Jobs' },
            { key: 'completed', label: 'Completed' },
            { key: 'all', label: 'All' },
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setStatusFilter(filter.key)}
              className={`px-4 py-2 rounded-xl whitespace-nowrap font-medium transition-all text-sm ${
                statusFilter === filter.key
                  ? 'clay-nav-active text-cyan-700'
                  : 'clay-button text-gray-600 hover:scale-105'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {viewMode === "map" ? (
        /* Map View */
        <div className="clay-card rounded-3xl p-6">
          {mapError ? (
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl h-96 flex items-center justify-center">
              <div className="text-center">
                <MapIcon className="w-16 h-16 text-cyan-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-700 mb-2">Map Unavailable</h3>
                <p className="text-gray-500">{mapError}</p>
              </div>
            </div>
          ) : (
            <div className="relative">
              {/* Search Bar */}
              <div className="absolute top-4 left-4 right-4 z-20 flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search address to drop a pin..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-0 shadow-lg bg-white/95 backdrop-blur-sm focus:ring-2 focus:ring-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Map Instructions */}
              <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg">
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-cyan-600">Tip:</span> Click anywhere on the map to drop a pin and create a new job
                </p>
              </div>

              {!mapLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl flex items-center justify-center z-10">
                  <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                </div>
              )}
              <div ref={mapRef} className="rounded-2xl h-[500px] w-full" />

              {/* New Job Form Panel */}
              {showNewJobForm && (
                <div className="absolute top-4 right-4 z-30 w-80 bg-white rounded-2xl shadow-xl p-5 max-h-[460px] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <Plus className="w-5 h-5 text-cyan-500" />
                      New Job
                    </h3>
                    <button onClick={cancelNewJob} className="text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm text-gray-600">Address</Label>
                      <Input
                        value={newJobData.property_address}
                        onChange={(e) => setNewJobData(prev => ({ ...prev, property_address: e.target.value }))}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-sm text-gray-600">Client Name</Label>
                      <Input
                        value={newJobData.client_name}
                        onChange={(e) => setNewJobData(prev => ({ ...prev, client_name: e.target.value }))}
                        placeholder="Enter client name"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-sm text-gray-600">Client Phone</Label>
                      <Input
                        value={newJobData.client_phone}
                        onChange={(e) => setNewJobData(prev => ({ ...prev, client_phone: e.target.value }))}
                        placeholder="(555) 123-4567"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-sm text-gray-600">Test Type</Label>
                      <Select
                        value={newJobData.test_type}
                        onValueChange={(val) => setNewJobData(prev => ({ ...prev, test_type: val }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Air Quality">Air Quality</SelectItem>
                          <SelectItem value="Surface">Surface</SelectItem>
                          <SelectItem value="Bulk">Bulk</SelectItem>
                          <SelectItem value="Tape Lift">Tape Lift</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm text-gray-600">Test Category</Label>
                      <Select
                        value={newJobData.test_category}
                        onValueChange={(val) => setNewJobData(prev => ({ ...prev, test_category: val }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Initial">Initial</SelectItem>
                          <SelectItem value="Post-Remediation">Post-Remediation</SelectItem>
                          <SelectItem value="Follow-up">Follow-up</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm text-gray-600">Scheduled Date</Label>
                      <Input
                        type="datetime-local"
                        value={newJobData.scheduled_date}
                        onChange={(e) => setNewJobData(prev => ({ ...prev, scheduled_date: e.target.value }))}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-sm text-gray-600">Notes</Label>
                      <Input
                        value={newJobData.notes}
                        onChange={(e) => setNewJobData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Any special instructions..."
                        className="mt-1"
                      />
                    </div>

                    <Button
                      onClick={handleCreateJob}
                      disabled={saving || !newJobData.property_address}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      Create Job
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500" />
              <span className="text-gray-600">Scheduled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-purple-500" />
              <span className="text-gray-600">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500" />
              <span className="text-gray-600">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500" />
              <span className="text-gray-600">Dropped Pin</span>
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="space-y-4">
          {filteredTests.map((test) => (
            <div
              key={test.id}
              onClick={() => window.location.href = `${createPageUrl('TestProfile')}?id=${test.id}`}
              className="clay-card clay-card-hover rounded-3xl p-6 cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-400 flex items-center justify-center shadow-inner flex-shrink-0">
                  <MapPin className="w-7 h-7 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">{test.property_address || 'No address'}</h3>
                      <p className="text-sm text-gray-500">{test.test_number} - {test.test_category}</p>
                    </div>
                    <Badge className={`${statusColors[test.status]} border rounded-xl px-3 py-1 font-medium text-xs`}>
                      {test.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <span className="text-sm text-gray-600 truncate">{test.client_name}</span>
                    </div>
                    {test.scheduled_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-pink-400 flex-shrink-0" />
                        <span className="text-sm text-gray-600">{formatDateTime(test.scheduled_date)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredTests.length === 0 && !isLoading && (
        <div className="clay-card rounded-3xl p-12 text-center">
          <MapPin className="w-16 h-16 text-cyan-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">No locations found</h3>
          <p className="text-gray-500">Try adjusting your filters</p>
        </div>
      )}
    </div>
  );
}
