
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Wrench, Mail, Phone, Award, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/utils";
import TechnicianModal from "../components/technicians/TechnicianModal";

export default function TechniciansPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState(null);

  const queryClient = useQueryClient();

  const { data: technicians = [], isLoading } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list('-created_date'),
    staleTime: 0, // Always refetch
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Technician.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['technicians']);
      setShowModal(false);
      setSelectedTechnician(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Technician.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['technicians']);
      setShowModal(false);
      setSelectedTechnician(null);
    },
  });

  const filteredTechnicians = technicians.filter(tech =>
    tech.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tech.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusColors = {
    'Active': 'bg-green-100 text-green-700',
    'Inactive': 'bg-gray-100 text-gray-700',
    'On Leave': 'bg-orange-100 text-orange-700',
  };

  const colorMap = {
    'Pink': 'from-pink-400 to-pink-500',
    'Blue': 'from-blue-400 to-blue-500',
    'Green': 'from-green-400 to-green-500',
    'Orange': 'from-orange-400 to-orange-500',
    'Purple': 'from-purple-400 to-purple-500',
    'Red': 'from-red-400 to-red-500',
    'Cyan': 'from-cyan-400 to-cyan-500',
    'Yellow': 'from-yellow-400 to-yellow-500',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="clay-card rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-pink-500 bg-clip-text text-transparent">
              Technician Management
            </h1>
            <p className="text-gray-500 mt-1">{technicians.length} total technicians</p>
          </div>
          <Button
            onClick={() => {
              setSelectedTechnician(null);
              setShowModal(true);
            }}
            className="clay-button rounded-2xl px-6 py-3 flex items-center gap-2 font-semibold text-orange-600 hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            New Technician
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="clay-card rounded-3xl p-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
          <Input
            placeholder="Search technicians..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 clay-button rounded-2xl border-0 h-12 text-gray-700"
          />
        </div>
      </div>

      {/* Technicians Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTechnicians.map((tech) => (
          <div
            key={tech.id}
            onClick={() => window.location.href = `${createPageUrl('TechnicianProfile')}?id=${tech.id}`}
            className="clay-card clay-card-hover rounded-3xl p-6 cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorMap[tech.color_code] || 'from-orange-400 to-pink-400'} flex items-center justify-center shadow-inner`}>
                <Wrench className="w-7 h-7 text-white" />
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className={`${statusColors[tech.status]} rounded-xl px-3 py-1 font-medium text-xs`}>
                  {tech.status}
                </Badge>
                {tech.can_be_assigned_jobs && (
                  <Badge className="bg-blue-100 text-blue-700 rounded-xl px-2 py-0.5 text-xs">
                    Assignable
                  </Badge>
                )}
              </div>
            </div>

            <h3 className="font-bold text-gray-800 text-lg mb-1">{tech.name}</h3>
            <p className="text-xs text-gray-500 mb-3">{tech.permission_level}</p>
            
            {tech.certification && (
              <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
                <Award className="w-3 h-3 text-orange-400" />
                <span className="truncate">{tech.certification}</span>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4 text-orange-400" />
                <span className="truncate">{tech.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4 text-pink-400" />
                <span>{tech.phone}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
              <span className="text-sm text-gray-500">
                Tests: <strong className="text-gray-700">{tech.completed_tests || 0}</strong>
              </span>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-semibold text-gray-700">{tech.rating || 5.0}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTechnicians.length === 0 && !isLoading && (
        <div className="clay-card rounded-3xl p-12 text-center">
          <Wrench className="w-16 h-16 text-orange-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">No technicians found</h3>
          <p className="text-gray-500">Try adjusting your search</p>
        </div>
      )}

      {/* Technician Modal */}
      {showModal && (
        <TechnicianModal
          technician={selectedTechnician}
          onClose={() => {
            setShowModal(false);
            setSelectedTechnician(null);
          }}
          onSave={(data) => {
            if (selectedTechnician) {
              updateMutation.mutate({ id: selectedTechnician.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
        />
      )}
    </div>
  );
}
