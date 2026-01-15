import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Microscope, Mail, Phone, Award, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import LabModal from "../components/labs/LabModal";

export default function LabsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedLab, setSelectedLab] = useState(null);

  const queryClient = useQueryClient();

  const { data: labs = [], isLoading } = useQuery({
    queryKey: ['labs'],
    queryFn: () => base44.entities.Lab.list('-created_date'),
    staleTime: 0, // Always refetch
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Lab.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['labs']);
      setShowModal(false);
      setSelectedLab(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lab.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['labs']);
      setShowModal(false);
      setSelectedLab(null);
    },
  });

  const filteredLabs = labs.filter(lab =>
    lab.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lab.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="clay-card rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent">
              Lab Management
            </h1>
            <p className="text-gray-500 mt-1">{labs.length} total labs</p>
          </div>
          <Button
            onClick={() => {
              setSelectedLab(null);
              setShowModal(true);
            }}
            className="clay-button rounded-2xl px-6 py-3 flex items-center gap-2 font-semibold text-purple-600 hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            New Lab
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="clay-card rounded-3xl p-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
          <Input
            placeholder="Search labs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 clay-button rounded-2xl border-0 h-12 text-gray-700"
          />
        </div>
      </div>

      {/* Labs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLabs.map((lab) => (
          <div
            key={lab.id}
            onClick={() => {
              setSelectedLab(lab);
              setShowModal(true);
            }}
            className="clay-card clay-card-hover rounded-3xl p-6 cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center shadow-inner">
                <Microscope className="w-7 h-7 text-white" />
              </div>
              <Badge className={`${lab.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'} rounded-xl px-3 py-1 font-medium text-xs`}>
                {lab.status}
              </Badge>
            </div>

            <h3 className="font-bold text-gray-800 text-lg mb-1">{lab.name}</h3>
            
            {lab.accreditation && (
              <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
                <Award className="w-3 h-3 text-purple-400" />
                <span className="truncate">{lab.accreditation}</span>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4 text-purple-400" />
                <span className="truncate">{lab.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4 text-pink-400" />
                <span>{lab.phone}</span>
              </div>
              {lab.turnaround_time && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span>{lab.turnaround_time}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
              <span className="text-gray-500">
                Samples: <strong className="text-gray-700">{lab.total_samples_sent || 0}</strong>
              </span>
              <span className="text-gray-500">
                {(() => {
                  const cost = parseFloat(lab.cost_per_sample);
                  if (cost > 0 && !isNaN(cost)) {
                    return `$${cost}/sample`;
                  }
                  return 'Contact for pricing';
                })()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredLabs.length === 0 && !isLoading && (
        <div className="clay-card rounded-3xl p-12 text-center">
          <Microscope className="w-16 h-16 text-purple-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">No labs found</h3>
          <p className="text-gray-500">Try adjusting your search</p>
        </div>
      )}

      {/* Lab Modal */}
      {showModal && (
        <LabModal
          lab={selectedLab}
          onClose={() => {
            setShowModal(false);
            setSelectedLab(null);
          }}
          onSave={(data) => {
            if (selectedLab) {
              updateMutation.mutate({ id: selectedLab.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
        />
      )}
    </div>
  );
}