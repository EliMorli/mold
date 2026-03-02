import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Plus,
  Search,
  Users,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Filter,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LeadModal from "../components/leads/LeadModal";
import { createPageUrl } from "@/utils";

export default function LeadTracking() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [exporting, setExporting] = useState(false);

  const queryClient = useQueryClient();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list('-created_date'),
    initialData: [],
  });

  const { data: tests = [] } = useQuery({
    queryKey: ['tests'],
    queryFn: () => base44.entities.Test.list(),
    initialData: [],
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Lead.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      setShowModal(false);
      setSelectedLead(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Lead.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      setShowModal(false);
      setSelectedLead(null);
    },
  });

  // Status colors matching the spreadsheet
  const statusConfig = {
    'Follow Up': {
      bg: 'bg-yellow-300',
      text: 'text-yellow-900',
      border: 'border-yellow-400',
      icon: AlertTriangle
    },
    'Pending': {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      border: 'border-yellow-200',
      icon: Clock
    },
    'Scheduled': {
      bg: 'bg-gray-200',
      text: 'text-gray-700',
      border: 'border-gray-300',
      icon: Calendar
    },
    'Canceled': {
      bg: 'bg-red-200',
      text: 'text-red-800',
      border: 'border-red-300',
      icon: XCircle
    },
    'Completed': {
      bg: 'bg-green-200',
      text: 'text-green-800',
      border: 'border-green-300',
      icon: CheckCircle
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch =
      lead.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone?.includes(searchQuery) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.address?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === "All" || lead.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const followUpCount = leads.filter(l => l.status === 'Follow Up').length;
  const pendingCount = leads.filter(l => l.status === 'Pending').length;
  const scheduledCount = leads.filter(l => l.status === 'Scheduled').length;
  const completedCount = leads.filter(l => l.status === 'Completed').length;
  const canceledCount = leads.filter(l => l.status === 'Canceled').length;

  const totalQuoted = leads.reduce((sum, l) => sum + (l.quote_amount || 0), 0);
  const totalPaid = leads.filter(l => l.paid).reduce((sum, l) => sum + (l.amount || 0), 0);

  const handleExportCSV = () => {
    setExporting(true);
    try {
      const headers = "Date,Client Name,Phone,Email,Address,Lead Source,Status,Quote,Amount,Invoice,Invoice Sent,In Reports,Out Reports,Paid,Notes\n";

      const rows = filteredLeads.map(lead => {
        return [
          lead.created_date ? new Date(lead.created_date).toLocaleDateString() : '',
          lead.client_name || '',
          lead.phone || '',
          lead.email || '',
          lead.address || '',
          lead.lead_source || '',
          lead.status || '',
          lead.quote_amount || 0,
          lead.amount || 0,
          lead.invoice_number || '',
          lead.invoice_sent ? 'Yes' : 'No',
          lead.in_reports ? 'Yes' : 'No',
          lead.out_reports ? 'Yes' : 'No',
          lead.paid ? 'Yes' : 'No',
          lead.notes || ''
        ].map(val => {
          const str = String(val);
          return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(',');
      }).join('\n');

      const csv = headers + rows;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Leads_Export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="clay-card rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-500 bg-clip-text text-transparent">
              Lead Tracking
            </h1>
            <p className="text-gray-500 mt-1">{leads.length} total leads</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleExportCSV}
              disabled={exporting || filteredLeads.length === 0}
              className="clay-button rounded-2xl px-6 py-3 flex items-center gap-2 font-semibold text-blue-600 hover:scale-105"
            >
              <Download className="w-5 h-5" />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>
            <Button
              onClick={() => {
                setSelectedLead(null);
                setShowModal(true);
              }}
              className="clay-button rounded-2xl px-6 py-3 flex items-center gap-2 font-semibold text-purple-600 hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              New Lead
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div
          className={`clay-card rounded-2xl p-4 cursor-pointer hover:scale-105 transition-transform ${filterStatus === 'Follow Up' ? 'ring-2 ring-yellow-400' : ''}`}
          onClick={() => setFilterStatus(filterStatus === 'Follow Up' ? 'All' : 'Follow Up')}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-yellow-300 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-yellow-900" />
            </div>
            <span className="text-sm font-medium text-gray-600">Follow Up</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{followUpCount}</p>
        </div>

        <div
          className={`clay-card rounded-2xl p-4 cursor-pointer hover:scale-105 transition-transform ${filterStatus === 'Pending' ? 'ring-2 ring-yellow-200' : ''}`}
          onClick={() => setFilterStatus(filterStatus === 'Pending' ? 'All' : 'Pending')}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Clock className="w-4 h-4 text-yellow-700" />
            </div>
            <span className="text-sm font-medium text-gray-600">Pending</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{pendingCount}</p>
        </div>

        <div
          className={`clay-card rounded-2xl p-4 cursor-pointer hover:scale-105 transition-transform ${filterStatus === 'Scheduled' ? 'ring-2 ring-gray-400' : ''}`}
          onClick={() => setFilterStatus(filterStatus === 'Scheduled' ? 'All' : 'Scheduled')}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-gray-700" />
            </div>
            <span className="text-sm font-medium text-gray-600">Scheduled</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{scheduledCount}</p>
        </div>

        <div
          className={`clay-card rounded-2xl p-4 cursor-pointer hover:scale-105 transition-transform ${filterStatus === 'Completed' ? 'ring-2 ring-green-400' : ''}`}
          onClick={() => setFilterStatus(filterStatus === 'Completed' ? 'All' : 'Completed')}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-200 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-700" />
            </div>
            <span className="text-sm font-medium text-gray-600">Completed</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{completedCount}</p>
        </div>

        <div
          className={`clay-card rounded-2xl p-4 cursor-pointer hover:scale-105 transition-transform ${filterStatus === 'Canceled' ? 'ring-2 ring-red-400' : ''}`}
          onClick={() => setFilterStatus(filterStatus === 'Canceled' ? 'All' : 'Canceled')}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-200 flex items-center justify-center">
              <XCircle className="w-4 h-4 text-red-700" />
            </div>
            <span className="text-sm font-medium text-gray-600">Canceled</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{canceledCount}</p>
        </div>

        <div className="clay-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-600">Total Paid</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">${totalPaid.toLocaleString()}</p>
        </div>
      </div>

      {/* Search */}
      <div className="clay-card rounded-3xl p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
            <Input
              placeholder="Search leads by name, phone, email, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 clay-button rounded-2xl border-0 h-12 text-gray-700"
            />
          </div>
          <Button
            onClick={() => setFilterStatus('All')}
            className={`clay-button rounded-2xl px-6 py-3 font-medium ${filterStatus === 'All' ? 'text-purple-700' : 'text-gray-600'}`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Leads Table */}
      <div className="clay-card rounded-3xl p-6 overflow-x-auto">
        <table className="w-full min-w-[1000px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Date</th>
              <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Client</th>
              <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Contact</th>
              <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Source</th>
              <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Quote</th>
              <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Amount</th>
              <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Invoice</th>
              <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase">In Reports</th>
              <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Out Reports</th>
              <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Paid</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((lead) => {
              const config = statusConfig[lead.status] || statusConfig['Pending'];
              const StatusIcon = config.icon;

              return (
                <tr
                  key={lead.id}
                  onClick={() => {
                    setSelectedLead(lead);
                    setShowModal(true);
                  }}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-2">
                    <span className="text-sm text-gray-600">
                      {lead.created_date ? new Date(lead.created_date).toLocaleDateString() : '-'}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <div>
                      <p className="font-semibold text-gray-800">{lead.client_name}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[200px]">{lead.address}</p>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <div className="text-sm">
                      {lead.phone && (
                        <p className="flex items-center gap-1 text-gray-600">
                          <Phone className="w-3 h-3" /> {lead.phone}
                        </p>
                      )}
                      {lead.email && (
                        <p className="flex items-center gap-1 text-gray-500 text-xs">
                          <Mail className="w-3 h-3" /> {lead.email}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <span className="text-sm text-gray-600">{lead.lead_source || '-'}</span>
                  </td>
                  <td className="py-3 px-2">
                    <Badge className={`${config.bg} ${config.text} ${config.border} border rounded-lg px-3 py-1 flex items-center gap-1 w-fit`}>
                      <StatusIcon className="w-3 h-3" />
                      {lead.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className="text-sm font-medium text-gray-700">
                      {lead.quote_amount ? `$${lead.quote_amount.toLocaleString()}` : '-'}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className="text-sm font-bold text-gray-800">
                      {lead.amount ? `$${lead.amount.toLocaleString()}` : '-'}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs text-gray-600">{lead.invoice_number || '-'}</span>
                      {lead.invoice_sent && (
                        <Badge className="bg-blue-100 text-blue-700 text-xs">Sent</Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    {lead.in_reports ? (
                      <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 mx-auto" />
                    )}
                  </td>
                  <td className="py-3 px-2 text-center">
                    {lead.out_reports ? (
                      <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 mx-auto" />
                    )}
                  </td>
                  <td className="py-3 px-2 text-center">
                    {lead.paid ? (
                      <Badge className="bg-green-100 text-green-700 rounded-full px-3">Paid</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-500 rounded-full px-3">-</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredLeads.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">No leads found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Lead Modal */}
      {showModal && (
        <LeadModal
          lead={selectedLead}
          onClose={() => {
            setShowModal(false);
            setSelectedLead(null);
          }}
          onSave={(data) => {
            if (selectedLead) {
              updateMutation.mutate({ id: selectedLead.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
        />
      )}
    </div>
  );
}
