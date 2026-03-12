import { useState, useEffect, useRef, useMemo } from "react";
import {
  Route,
  MapPin,
  Clock,
  Navigation,
  RotateCcw,
  Play,
  ExternalLink,
  Loader2,
  AlertCircle,
  Car,
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function RouteOptimizer({ jobs = [], technicianAddress = '' }) {
  const [optimizedRoute, setOptimizedRoute] = useState([]);
  const [routeDetails, setRouteDetails] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const directionsRendererRef = useRef(null);

  // Filter jobs with valid addresses
  const validJobs = useMemo(() => {
    return jobs.filter(job => job.property_address && job.property_address.trim());
  }, [jobs]);

  // Load Google Maps
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError("Google Maps API key not configured");
      return;
    }

    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        initMap();
        return;
      }

      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        if (window.google && window.google.maps) {
          initMap();
        } else {
          existingScript.addEventListener('load', initMap);
        }
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      script.onload = initMap;
      script.onerror = () => setError("Failed to load Google Maps");
      document.head.appendChild(script);
    };

    const initMap = () => {
      if (!mapRef.current) return;

      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 25.7617, lng: -80.1918 }, // Miami default
        zoom: 10,
        styles: [
          { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
        ]
      });

      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        map: mapInstanceRef.current,
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: '#8B5CF6',
          strokeWeight: 5
        }
      });

      setMapLoaded(true);
    };

    loadGoogleMaps();
  }, []);

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Nearest neighbor algorithm for route optimization
  const optimizeRouteNearestNeighbor = (locations, startIndex = 0) => {
    const n = locations.length;
    if (n <= 1) return locations.map((_, i) => i);

    const visited = new Set();
    const route = [];
    let current = startIndex;

    while (route.length < n) {
      route.push(current);
      visited.add(current);

      let nearestDist = Infinity;
      let nearestIdx = -1;

      for (let i = 0; i < n; i++) {
        if (!visited.has(i)) {
          const dist = calculateDistance(
            locations[current].lat,
            locations[current].lng,
            locations[i].lat,
            locations[i].lng
          );
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestIdx = i;
          }
        }
      }

      if (nearestIdx !== -1) {
        current = nearestIdx;
      }
    }

    return route;
  };

  // Geocode addresses and optimize route
  const optimizeRoute = async () => {
    if (!mapLoaded || validJobs.length === 0) return;

    setIsOptimizing(true);
    setError(null);

    try {
      const geocoder = new window.google.maps.Geocoder();

      // Geocode all job addresses
      const locationPromises = validJobs.map(job =>
        new Promise((resolve) => {
          geocoder.geocode({ address: job.property_address }, (results, status) => {
            if (status === 'OK' && results[0]) {
              resolve({
                job,
                lat: results[0].geometry.location.lat(),
                lng: results[0].geometry.location.lng()
              });
            } else {
              resolve(null);
            }
          });
        })
      );

      const locations = (await Promise.all(locationPromises)).filter(Boolean);

      if (locations.length === 0) {
        setError("Could not geocode any job addresses");
        setIsOptimizing(false);
        return;
      }

      // Optimize route using nearest neighbor
      const optimizedOrder = optimizeRouteNearestNeighbor(locations);
      const orderedLocations = optimizedOrder.map(i => locations[i]);
      setOptimizedRoute(orderedLocations);

      // Get directions from Google Maps
      if (orderedLocations.length >= 2) {
        const directionsService = new window.google.maps.DirectionsService();

        const origin = orderedLocations[0];
        const destination = orderedLocations[orderedLocations.length - 1];
        const waypoints = orderedLocations.slice(1, -1).map(loc => ({
          location: new window.google.maps.LatLng(loc.lat, loc.lng),
          stopover: true
        }));

        directionsService.route({
          origin: new window.google.maps.LatLng(origin.lat, origin.lng),
          destination: new window.google.maps.LatLng(destination.lat, destination.lng),
          waypoints,
          travelMode: window.google.maps.TravelMode.DRIVING,
          optimizeWaypoints: false // We already optimized
        }, (result, status) => {
          if (status === 'OK') {
            directionsRendererRef.current.setDirections(result);

            // Calculate total distance and time
            let totalDistance = 0;
            let totalDuration = 0;
            result.routes[0].legs.forEach(leg => {
              totalDistance += leg.distance.value;
              totalDuration += leg.duration.value;
            });

            setRouteDetails({
              totalDistance: (totalDistance / 1609.34).toFixed(1), // Convert to miles
              totalDuration: Math.round(totalDuration / 60), // Convert to minutes
              legs: result.routes[0].legs.map(leg => ({
                distance: leg.distance.text,
                duration: leg.duration.text
              }))
            });
          }
        });
      }

    } catch (err) {
      console.error('Error optimizing route:', err);
      setError("Failed to optimize route");
    } finally {
      setIsOptimizing(false);
    }
  };

  // Reset route
  const resetRoute = () => {
    setOptimizedRoute([]);
    setRouteDetails(null);
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setDirections({ routes: [] });
    }
  };

  // Open route in Google Maps
  const openInGoogleMaps = () => {
    if (optimizedRoute.length === 0) return;

    const waypoints = optimizedRoute.map(loc =>
      encodeURIComponent(loc.job.property_address)
    ).join('/');

    const url = `https://www.google.com/maps/dir/${waypoints}`;
    window.open(url, '_blank');
  };

  // Start navigation
  const startNavigation = () => {
    if (optimizedRoute.length === 0) return;

    const destination = encodeURIComponent(optimizedRoute[0].job.property_address);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const formatTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Route className="w-5 h-5 text-purple-500" />
          <h3 className="font-bold text-gray-800">Route Optimizer</h3>
          <Badge className="bg-purple-100 text-purple-700 rounded-lg px-2 py-0.5 text-xs">
            {validJobs.length} stops
          </Badge>
        </div>

        <div className="flex gap-2">
          {optimizedRoute.length > 0 && (
            <>
              <Button
                onClick={resetRoute}
                className="clay-button rounded-xl px-3 py-2 text-sm flex items-center gap-1.5 text-gray-600"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </Button>
              <Button
                onClick={openInGoogleMaps}
                className="clay-button rounded-xl px-3 py-2 text-sm flex items-center gap-1.5 text-blue-600"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Maps
              </Button>
              <Button
                onClick={startNavigation}
                className="clay-button rounded-xl px-3 py-2 text-sm flex items-center gap-1.5 text-green-600"
              >
                <Navigation className="w-4 h-4" />
                Start Nav
              </Button>
            </>
          )}

          {optimizedRoute.length === 0 && (
            <Button
              onClick={optimizeRoute}
              disabled={isOptimizing || validJobs.length < 2 || !mapLoaded}
              className="clay-button rounded-xl px-4 py-2 text-sm flex items-center gap-2 text-purple-600 font-semibold"
            >
              {isOptimizing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Route className="w-4 h-4" />
              )}
              Optimize Route
            </Button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Route Summary */}
      {routeDetails && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="clay-button rounded-xl p-3">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <MapPin className="w-4 h-4" />
              Total Stops
            </div>
            <p className="text-xl font-bold text-gray-800">{optimizedRoute.length}</p>
          </div>
          <div className="clay-button rounded-xl p-3">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Car className="w-4 h-4" />
              Total Distance
            </div>
            <p className="text-xl font-bold text-purple-600">{routeDetails.totalDistance} mi</p>
          </div>
          <div className="clay-button rounded-xl p-3">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Clock className="w-4 h-4" />
              Drive Time
            </div>
            <p className="text-xl font-bold text-blue-600">{formatTime(routeDetails.totalDuration)}</p>
          </div>
          <div className="clay-button rounded-xl p-3">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Clock className="w-4 h-4" />
              Avg per Stop
            </div>
            <p className="text-xl font-bold text-green-600">
              {formatTime(Math.round(routeDetails.totalDuration / optimizedRoute.length))}
            </p>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="clay-card rounded-2xl overflow-hidden">
        {!mapLoaded && !error && (
          <div className="h-64 bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        )}
        <div ref={mapRef} className="h-64 w-full" style={{ display: mapLoaded ? 'block' : 'none' }} />
      </div>

      {/* Optimized Route List */}
      {optimizedRoute.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-700 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Optimized Order
          </h4>
          <div className="space-y-2">
            {optimizedRoute.map((loc, index) => (
              <div key={loc.job.id} className="clay-button rounded-xl p-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800">{loc.job.client_name || 'Unknown Client'}</p>
                  <p className="text-sm text-gray-500 truncate">{loc.job.property_address}</p>
                  {loc.job.scheduled_date && (
                    <p className="text-xs text-purple-500 mt-1">
                      Scheduled: {new Date(loc.job.scheduled_date).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  )}
                </div>
                {routeDetails?.legs[index] && (
                  <div className="text-right text-sm">
                    <p className="text-gray-600">{routeDetails.legs[index].distance}</p>
                    <p className="text-gray-400">{routeDetails.legs[index].duration}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {validJobs.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Route className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p>No jobs with addresses to optimize</p>
        </div>
      )}

      {validJobs.length === 1 && (
        <div className="text-center py-8 text-gray-500">
          <Route className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p>Need at least 2 jobs to optimize a route</p>
        </div>
      )}
    </div>
  );
}
