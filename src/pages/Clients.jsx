import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Building2, Users, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/utils";
import ClientModal from "../components/clients/ClientModal";

export default function ClientsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list('-created_date'),
    initialData: [],
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      setShowModal(false);
      setSelectedClient(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clients']);
      setShowModal(false);
      setSelectedClient(null);
    },
  });

  // Calculate open balance for each client
  const getClientOpenBalance = (clientId) => {
    return invoices
      .filter(inv => inv.client_id === clientId && (inv.status === 'Sent' || inv.status === 'Overdue'))
      .reduce((sum, inv) => sum + (inv.total || 0), 0);
  };

  const filteredClients = clients.filter(client =>
    client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.sales_rep_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const typeColors = {
    'Direct Client': 'bg-blue-100 text-blue-700',
    'Referral Company': 'bg-purple-100 text-purple-700',
  };

  // Export to CSV (QuickBooks compatible format)
  const exportToCSV = () => {
    const headers = ['Client Name', 'Type', 'Phone', 'Email', 'Sales Rep', 'Open Balance', 'Total Spent'];
    const rows = filteredClients.map(client => [
      client.name,
      client.client_type,
      client.phone,
      client.email,
      client.sales_rep_name || '',
      getClientOpenBalance(client.id).toFixed(2),
      (client.total_spent || 0).toFixed(2)
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clients_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="clay-card rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              Client Management
            </h1>
            <p className="text-gray-500 mt-1">{clients.length} total clients</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={exportToCSV}
              className="clay-button rounded-2xl px-6 py-3 flex items-center gap-2 font-semibold text-green-600 hover:scale-105"
            >
              <Download className="w-5 h-5" />
              Export CSV
            </Button>
            <Button
              onClick={() => {
                setSelectedClient(null);
                setShowModal(true);
              }}
              className="clay-button rounded-2xl px-6 py-3 flex items-center gap-2 font-semibold text-blue-600 hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              New Client
            </Button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="clay-card rounded-3xl p-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
          <Input
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 clay-button rounded-2xl border-0 h-12 text-gray-700"
          />
        </div>
      </div>

      {/* Clients Table */}
      <div className="clay-card rounded-3xl p-6 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-4 px-4 text-sm font-bold text-gray-600 uppercase tracking-wide">
                Client / Company
              </th>
              <th className="text-left py-4 px-4 text-sm font-bold text-gray-600 uppercase tracking-wide">
                Type
              </th>
              <th className="text-left py-4 px-4 text-sm font-bold text-gray-600 uppercase tracking-wide">
                Phone
              </th>
              <th className="text-right py-4 px-4 text-sm font-bold text-gray-600 uppercase tracking-wide">
                Open Balance
              </th>
              <th className="text-left py-4 px-4 text-sm font-bold text-gray-600 uppercase tracking-wide">
                Sales Rep
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredClients.map((client) => {
              const openBalance = getClientOpenBalance(client.id);
              
              return (
                <tr
                  key={client.id}
                  onClick={() => window.location.href = `${createPageUrl('ClientProfile')}?id=${client.id}`}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center shadow-inner flex-shrink-0">
                        {client.client_type === 'Referral Company' ? (
                          <Building2 className="w-5 h-5 text-white" />
                        ) : (
                          <Users className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{client.name}</p>
                        <p className="text-sm text-gray-500">{client.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <Badge className={`${typeColors[client.client_type]} rounded-xl px-3 py-1 font-medium text-xs`}>
                      {client.client_type}
                    </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-gray-700">{client.phone}</p>
                  </td>
                  <td className="py-4 px-4 text-right">
                    {openBalance > 0 ? (
                      <p className="text-lg font-bold text-orange-600">
                        ${openBalance.toLocaleString()}
                      </p>
                    ) : (
                      <p className="text-gray-400">$0</p>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    {client.sales_rep_name ? (
                      <p className="text-gray-700">{client.sales_rep_name}</p>
                    ) : (
                      <p className="text-gray-400 italic">N/A</p>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Empty State */}
        {filteredClients.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-blue-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">No clients found</h3>
            <p className="text-gray-500">Try adjusting your search or add a new client</p>
          </div>
        )}
      </div>

      {/* Client Modal - Only for creating new clients */}
      {showModal && (
        <ClientModal
          client={selectedClient}
          onClose={() => {
            setShowModal(false);
            setSelectedClient(null);
          }}
          onSave={(data) => {
            if (selectedClient) {
              updateMutation.mutate({ id: selectedClient.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
        />
      )}
    </div>
  );
}