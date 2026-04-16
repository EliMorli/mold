import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Search, Receipt, DollarSign, Calendar, User, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import InvoiceModal from "../components/invoices/InvoiceModal";

export default function InvoicesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [exporting, setExporting] = useState(false);

  const queryClient = useQueryClient();

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date'),
    initialData: [],
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    initialData: [],
  });

  const { data: tests = [] } = useQuery({
    queryKey: ['tests'],
    queryFn: () => base44.entities.Test.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Invoice.create(data),
    onSuccess: (inv) => {
      queryClient.invalidateQueries(['invoices']);
      setShowModal(false);
      setSelectedInvoice(null);
      toast.success(`Invoice created: ${inv?.invoice_number || ''}`);
    },
    onError: (e) => toast.error('Failed to create invoice', { description: e.message }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Invoice.update(id, data),
    onSuccess: (inv) => {
      queryClient.invalidateQueries(['invoices']);
      setShowModal(false);
      setSelectedInvoice(null);
      toast.success(`Invoice updated: ${inv?.invoice_number || ''}`);
    },
    onError: (e) => toast.error('Failed to update invoice', { description: e.message }),
  });

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         invoice.client_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === "All" || invoice.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const statusColors = {
    'Draft': 'bg-gray-100 text-gray-700 border-gray-200',
    'Sent': 'bg-blue-100 text-blue-700 border-blue-200',
    'Partially Paid': 'bg-orange-100 text-orange-700 border-orange-200',
    'Paid': 'bg-green-100 text-green-700 border-green-200',
    'Overdue': 'bg-red-100 text-red-700 border-red-200',
    'Cancelled': 'bg-gray-100 text-gray-600 border-gray-200',
  };

  const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((sum, inv) => sum + (inv.total || 0), 0);
  const pendingRevenue = invoices.filter(i => i.status === 'Sent' || i.status === 'Overdue' || i.status === 'Partially Paid').reduce((sum, inv) => {
    const remaining = inv.total - (inv.amount_paid || 0);
    return sum + remaining;
  }, 0);

  // Draft invoices ready to send (2+ hours after scheduled time)
  const draftInvoices = invoices.filter(i => i.status === 'Draft' && i.scheduled_send_time);
  const readyToSendInvoices = draftInvoices.filter(i => {
    const scheduledTime = new Date(i.scheduled_send_time);
    const sendTime = new Date(scheduledTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours after
    return new Date() >= sendTime;
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Invoice.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices']);
    },
  });

  const handleApproveAndSend = async (invoice) => {
    await approveMutation.mutateAsync({
      id: invoice.id,
      data: { status: 'Sent' }
    });
    // Send email notification
    await base44.integrations.Core.SendEmail({
      to: invoice.client_name,
      subject: `Invoice ${invoice.invoice_number}`,
      body: `Your invoice for $${invoice.total} is ready. Due date: ${new Date(invoice.due_date).toLocaleDateString()}`
    });
  };

  const handleExportCSV = () => {
    setExporting(true);
    try {
      const headers = "Invoice Number,Client,Test Number,Issue Date,Due Date,Amount,Tax,Total,Amount Paid,Status,Payment Method\n";
      
      const rows = filteredInvoices.map(inv => {
        return [
          inv.invoice_number || '',
          inv.client_name || '',
          inv.test_number || '',
          inv.issue_date ? new Date(inv.issue_date).toLocaleDateString() : '',
          inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '',
          inv.amount || 0,
          inv.tax || 0,
          inv.total || 0,
          inv.amount_paid || 0,
          inv.status || '',
          inv.payment_method || ''
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
      a.download = `Invoices_Export_${new Date().toISOString().split('T')[0]}.csv`;
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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
              Invoice Management
            </h1>
            <p className="text-gray-500 mt-1">{invoices.length} total invoices</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleExportCSV}
              disabled={exporting || filteredInvoices.length === 0}
              className="clay-button rounded-2xl px-6 py-3 flex items-center gap-2 font-semibold text-blue-600 hover:scale-105"
            >
              <Download className="w-5 h-5" />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </Button>
            <Button
              onClick={() => {
                setSelectedInvoice(null);
                setShowModal(true);
              }}
              className="clay-button rounded-2xl px-6 py-3 flex items-center gap-2 font-semibold text-green-600 hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              New Invoice
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center shadow-inner">
              <DollarSign className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-800">${totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center shadow-inner">
              <Receipt className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-gray-800">${pendingRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center shadow-inner">
              <Calendar className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">This Month</p>
              <p className="text-2xl font-bold text-gray-800">
                {invoices.filter(i => new Date(i.created_date).getMonth() === new Date().getMonth()).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Draft Outbox - Ready to Send */}
      {readyToSendInvoices.length > 0 && (
        <div className="clay-card rounded-3xl p-6 border-2 border-orange-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-orange-700">Draft Outbox - Ready to Send</h3>
              <p className="text-sm text-gray-600">{readyToSendInvoices.length} invoice(s) ready for approval</p>
            </div>
          </div>
          <div className="space-y-3">
            {readyToSendInvoices.map((invoice) => (
              <div key={invoice.id} className="clay-button rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{invoice.invoice_number}</p>
                  <p className="text-sm text-gray-600">{invoice.client_name} - ${invoice.total.toLocaleString()}</p>
                  <p className="text-xs text-orange-600 mt-1">
                    Scheduled: {new Date(invoice.scheduled_send_time).toLocaleString()}
                  </p>
                </div>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApproveAndSend(invoice);
                  }}
                  disabled={approveMutation.isPending}
                  className="clay-button rounded-2xl px-4 py-2 font-semibold text-green-600 hover:scale-105"
                >
                  Approve & Send
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="clay-card rounded-3xl p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-400" />
            <Input
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 clay-button rounded-2xl border-0 h-12 text-gray-700"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {['All', 'Draft', 'Sent', 'Partially Paid', 'Paid', 'Overdue'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-6 py-3 rounded-2xl whitespace-nowrap font-medium transition-all ${
                  filterStatus === status
                    ? 'clay-nav-active text-green-700'
                    : 'clay-button text-gray-600 hover:scale-105'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="space-y-4">
        {filteredInvoices.map((invoice) => {
          const remainingBalance = invoice.total - (invoice.amount_paid || 0);
          
          return (
            <div 
              key={invoice.id} 
              onClick={() => {
                setSelectedInvoice(invoice);
                setShowModal(true);
              }}
              className="clay-card clay-card-hover rounded-3xl p-6 cursor-pointer"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center shadow-inner flex-shrink-0">
                    <Receipt className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 text-lg">{invoice.invoice_number}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <User className="w-3 h-3" />
                      <span className="truncate">{invoice.client_name}</span>
                    </div>
                    {invoice.amount_paid > 0 && invoice.status === 'Partially Paid' && (
                      <div className="mt-2 text-xs">
                        <span className="text-green-600 font-medium">
                          Paid: ${invoice.amount_paid.toLocaleString()}
                        </span>
                        <span className="text-gray-400 mx-1">|</span>
                        <span className="text-orange-600 font-medium">
                          Balance: ${remainingBalance.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-800">${invoice.total?.toLocaleString()}</p>
                    {invoice.due_date && (
                      <p className="text-xs text-gray-500 mt-1">
                        Due: {new Date(invoice.due_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Badge className={`${statusColors[invoice.status]} border rounded-xl px-4 py-2 font-medium`}>
                    {invoice.status}
                  </Badge>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredInvoices.length === 0 && !isLoading && (
        <div className="clay-card rounded-3xl p-12 text-center">
          <Receipt className="w-16 h-16 text-green-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-700 mb-2">No invoices found</h3>
          <p className="text-gray-500">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Invoice Modal */}
      {showModal && (
        <InvoiceModal
          invoice={selectedInvoice}
          clients={clients}
          tests={tests}
          onClose={() => {
            setShowModal(false);
            setSelectedInvoice(null);
          }}
          onSave={(data) => {
            if (selectedInvoice) {
              updateMutation.mutate({ id: selectedInvoice.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
        />
      )}
    </div>
  );
}