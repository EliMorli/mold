import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MapPin, FlaskConical, Calendar, User, Filter, List, Map as MapIcon, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/utils";

export default function MapPage() {
  const [selectedTest, setSelectedTest] = useState(null);
  const [statusFilter, setStatusFilter] = useState("active");
  const [viewMode, setViewMode] = useState("list"); // "list" or "map"
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const geocoderRef = useRef(null);

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['tests'],
    queryFn: () => base44.entities.Test.list('-scheduled_date'),
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
        center: { lat: 39.8283, lng: -98.5795 }, // Center of US
        zoom: 4,
        styles: [
          { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
        ]
      });
      geocoderRef.current = new window.google.maps.Geocoder();
      setMapLoaded(true);
    };

    loadGoogleMaps();
  }, [viewMode]);

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
              {!mapLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl flex items-center justify-center z-10">
                  <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                </div>
              )}
              <div ref={mapRef} className="rounded-2xl h-96 w-full" />
            </div>
          )}
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
