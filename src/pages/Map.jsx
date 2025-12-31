import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MapPin, FlaskConical, Calendar, User, Filter, List, Map as MapIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/utils";

export default function MapPage() {
  const [selectedTest, setSelectedTest] = useState(null);
  const [statusFilter, setStatusFilter] = useState("active");
  const [viewMode, setViewMode] = useState("list"); // "list" or "map"

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
        /* Map View - Placeholder */
        <div className="clay-card rounded-3xl p-6">
          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl h-96 flex items-center justify-center">
            <div className="text-center">
              <MapIcon className="w-16 h-16 text-cyan-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-700 mb-2">Map View</h3>
              <p className="text-gray-500">Configure Google Maps API key in settings to enable map view</p>
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
