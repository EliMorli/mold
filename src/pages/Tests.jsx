import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Search, FlaskConical, Calendar, MapPin, User, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/utils";
import TestModal from "../components/tests/TestModal";

export default function TestsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);

  const queryClient = useQueryClient();

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['tests'],
    queryFn: () => base44.entities.Test.list('-scheduled_date'),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Test.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tests']);
      setShowModal(false);
      setSelectedTest(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Test.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tests']);
      setShowModal(false);
      setSelectedTest(null);
    },
  });

  const filteredTests = tests.filter(test => {
    const matchesSearch =
      test.test_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.property_address?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || test.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    'Scheduled': 'bg-blue-100 text-blue-700 border-blue-200',
    'In Progress': 'bg-purple-100 text-purple-700 border-purple-200',
    'Lab Analysis': 'bg-orange-100 text-orange-700 border-orange-200',
    'Completed': 'bg-green-100 text-green-700 border-green-200',
    'Cancelled': 'bg-gray-100 text-gray-700 border-gray-200',
  };

  const categoryColors = {
    'Initial': 'from-purple-400 to-blue-400',
    'Clearance': 'from-green-400 to-emerald-400',
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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
              Test Management
            </h1>
            <p className="text-gray-500 mt-1">{tests.length} total tests</p>
          </div>
          <Button
            onClick={() => {
              setSelectedTest(null);
              setShowModal(true);
            }}
            className="clay-button rounded-2xl px-6 py-3 flex items-center gap-2 font-semibold text-purple-600 hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            New Test
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="clay-card rounded-3xl p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
            <Input
              placeholder="Search tests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 clay-button rounded-2xl border-0 h-12 text-gray-700"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {['all', 'Scheduled', 'In Progress', 'Lab Analysis', 'Completed'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-xl whitespace-nowrap font-medium transition-all text-sm ${
                  statusFilter === status
                    ? 'clay-nav-active text-purple-700'
                    : 'clay-button text-gray-600 hover:scale-105'
                }`}
              >
                {status === 'all' ? 'All' : status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tests List */}
      <div className="space-y-4">
        {filteredTests.map((test) => (
          <div
            key={test.id}
            onClick={() => window.location.href = `${createPageUrl('TestProfile')}?id=${test.id}`}
            className="clay-card clay-card-hover rounded-3xl p-6 cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${categoryColors[test.test_category] || 'from-purple-400 to-blue-400'} flex items-center justify-center shadow-inner flex-shrink-0`}>
                <FlaskConical className="w-7 h-7 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">{test.test_number}</h3>
                    <p className="text-sm text-gray-500">{test.test_category} Test</p>
                  </div>
                  <Badge className={`${statusColors[test.status]} border rounded-xl px-3 py-1 font-medium text-xs`}>
                    {test.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span className="text-sm text-gray-600 truncate">{test.client_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span className="text-sm text-gray-600 truncate">{test.property_address}</span>
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

      {/* Empty State */}
      {filteredTests.length === 0 && !isLoading && (
        <div className="clay-card rounded-3xl p-12 text-center">
          <FlaskConical className="w-16 h-16 text-purple-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">No tests found</h3>
          <p className="text-gray-500">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Test Modal */}
      {showModal && (
        <TestModal
          test={selectedTest}
          onClose={() => {
            setShowModal(false);
            setSelectedTest(null);
          }}
          onSave={(data) => {
            if (selectedTest) {
              updateMutation.mutate({ id: selectedTest.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
        />
      )}
    </div>
  );
}
