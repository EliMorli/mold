import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Search, DollarSign, Check, Clock, X as XIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function PaymentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [invoiceAllocations, setInvoiceAllocations] = useState({}); // New state for allocations
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString(),
    amount: 0,
    payment_method: 'Check',
    check_number: '',
    status: 'Pending',
    client_id: '',
    client_name: '',
    invoice_ids: [],
    invoice_numbers: [],
    notes: '',
    reference_number: '',
    check_photo_url: ''
  });

  const queryClient = useQueryClient();

  const { data: payments = [] } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list('-payment_date'),
    initialData: [],
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
    initialData: [],
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const payment = await base44.entities.Payment.create(data);
      
      // Update invoices with payment allocation
      if (data.invoice_ids && data.invoice_ids.length > 0) {
        for (const invoiceId of data.invoice_ids) {
          const invoice = invoices.find(inv => inv.id === invoiceId);
          if (invoice && invoiceAllocations[invoiceId]) {
            const allocatedAmount = invoiceAllocations[invoiceId];
            const newAmountPaid = (invoice.amount_paid || 0) + allocatedAmount;
            const remainingBalance = invoice.total - newAmountPaid;
            
            let newStatus = invoice.status;
            let paidDate = invoice.paid_date; // Keep existing paid_date by default

            if (remainingBalance <= 0.01) { // Use a small epsilon for floating point comparison
              newStatus = 'Paid';
              paidDate = new Date().toISOString(); // Set paid date when fully paid
            } else if (newAmountPaid > 0 && remainingBalance > 0.01) {
              newStatus = 'Partially Paid';
            }
            
            await base44.entities.Invoice.update(invoiceId, {
              amount_paid: newAmountPaid,
              status: newStatus,
              paid_date: paidDate
            });
          }
        }
      }
      
      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['payments']);
      queryClient.invalidateQueries(['invoices']);
      setShowModal(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Payment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['payments']);
      queryClient.invalidateQueries(['invoices']);
      setShowModal(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setSelectedPayment(null);
    setInvoiceAllocations({}); // Reset allocations
    setFormData({
      payment_date: new Date().toISOString(),
      amount: 0,
      payment_method: 'Check',
      check_number: '',
      status: 'Pending',
      client_id: '',
      client_name: '',
      invoice_ids: [],
      invoice_numbers: [],
      notes: '',
      reference_number: '',
      check_photo_url: ''
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const { data } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, check_photo_url: data.file_url });
    } catch (error) {
      alert('Failed to upload file');
    }
  };

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setFormData({
        ...formData,
        client_id: clientId,
        client_name: client.name,
        // Reset invoice selections and allocations when client changes
        invoice_ids: [],
        invoice_numbers: []
      });
      setInvoiceAllocations({});
    }
  };

  const handleInvoiceToggle = (invoice) => {
    const isSelected = formData.invoice_ids.includes(invoice.id);
    if (isSelected) {
      // Remove invoice
      const newInvoiceIds = formData.invoice_ids.filter(id => id !== invoice.id);
      const newInvoiceNumbers = formData.invoice_numbers.filter(num => num !== invoice.invoice_number);
      const newAllocations = { ...invoiceAllocations };
      delete newAllocations[invoice.id];
      
      setInvoiceAllocations(newAllocations);
      setFormData({
        ...formData,
        invoice_ids: newInvoiceIds,
        invoice_numbers: newInvoiceNumbers
      });
    } else {
      // Add invoice and suggest allocation
      const remainingBalance = invoice.total - (invoice.amount_paid || 0);
      const newAllocations = {
        ...invoiceAllocations,
        [invoice.id]: Math.min(remainingBalance, formData.amount - getTotalAllocated()) // Suggest based on remaining payment amount
      };
      
      setInvoiceAllocations(newAllocations);
      setFormData({
        ...formData,
        invoice_ids: [...formData.invoice_ids, invoice.id],
        invoice_numbers: [...formData.invoice_numbers, invoice.invoice_number]
      });
    }
  };

  const handleAllocationChange = (invoiceId, amount) => {
    setInvoiceAllocations({
      ...invoiceAllocations,
      [invoiceId]: parseFloat(amount) || 0
    });
  };

  const getTotalAllocated = () => {
    return Object.values(invoiceAllocations).reduce((sum, amt) => sum + amt, 0);
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         payment.check_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         payment.reference_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === "All" || payment.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const statusColors = {
    'Pending': 'bg-orange-100 text-orange-700',
    'Cleared': 'bg-green-100 text-green-700',
    'Bounced': 'bg-red-100 text-red-700',
    'Cancelled': 'bg-gray-100 text-gray-700',
  };

  const totalPending = payments.filter(p => p.status === 'Pending').reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalCleared = payments.filter(p => p.status === 'Cleared').reduce((sum, p) => sum + (p.amount || 0), 0);

  const formatDateTime = (dateTime) => {
    if (!dateTime) return '';
    return new Date(dateTime).toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getClientUnpaidInvoices = () => {
    if (!formData.client_id) return [];
    return invoices.filter(inv => 
      inv.client_id === formData.client_id && 
      (inv.status === 'Sent' || inv.status === 'Overdue' || inv.status === 'Partially Paid')
    ).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="clay-card rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent">
              Payment Tracking
            </h1>
            <p className="text-gray-500 mt-1">{payments.length} total payments</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="clay-button rounded-2xl px-6 py-3 flex items-center gap-2 font-semibold text-emerald-600 hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            Record Payment
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center shadow-inner">
              <Clock className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Clearance</p>
              <p className="text-2xl font-bold text-gray-800">${totalPending.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center shadow-inner">
              <Check className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Cleared</p>
              <p className="text-2xl font-bold text-gray-800">${totalCleared.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="clay-card rounded-3xl p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400" />
            <Input
              placeholder="Search payments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 clay-button rounded-2xl border-0 h-12 text-gray-700"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {['All', 'Pending', 'Cleared', 'Bounced'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 md:px-6 py-3 rounded-2xl whitespace-nowrap font-medium transition-all flex-shrink-0 ${
                  filterStatus === status
                    ? 'clay-nav-active text-emerald-700'
                    : 'clay-button text-gray-600 hover:scale-105'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Payments List */}
      <div className="relative space-y-4">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-300 to-blue-300" />

        {filteredPayments.map((payment, idx) => (
          <div
            key={payment.id}
            onClick={() => {
              setSelectedPayment(payment);
              // When editing, form data should reflect the payment's current state
              // Invoice allocations are not editable on existing payments with this current logic.
              // So we just set invoice_ids and invoice_numbers directly.
              setFormData({
                ...payment,
                payment_date: payment.payment_date ? new Date(payment.payment_date).toISOString() : new Date().toISOString(),
                amount: payment.amount || 0,
                invoice_ids: payment.invoice_ids || [],
                invoice_numbers: payment.invoice_numbers || [],
              });
              setShowModal(true);
            }}
            className="clay-card clay-card-hover rounded-3xl p-6 cursor-pointer"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-400 flex items-center justify-center shadow-inner flex-shrink-0">
                  <DollarSign className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-800 text-lg">{payment.client_name}</h3>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                    <span>{formatDateTime(payment.payment_date)}</span>
                    <span>•</span>
                    <span>{payment.payment_method}</span>
                    {payment.check_number && (
                      <>
                        <span>•</span>
                        <span>Check #{payment.check_number}</span>
                      </>
                    )}
                  </div>
                  {payment.invoice_numbers && payment.invoice_numbers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {payment.invoice_numbers.map((invNum, idx) => (
                        <Badge key={idx} className="bg-blue-100 text-blue-700 rounded-lg px-2 py-0.5 text-xs">
                          {invNum}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-800">${payment.amount?.toLocaleString()}</p>
                  {payment.cleared_date && (
                    <p className="text-xs text-gray-500 mt-1">
                      Cleared: {new Date(payment.cleared_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Badge className={`${statusColors[payment.status]} rounded-xl px-4 py-2 font-medium`}>
                  {payment.status}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="clay-card rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {selectedPayment ? 'Payment Details' : 'Record Payment'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="clay-button rounded-2xl p-2 hover:scale-110 transition-transform"
              >
                <XIcon className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              console.log('=== PAYMENT FORM SUBMIT ===');
              console.log('selectedPayment:', selectedPayment);
              console.log('formData.client_id:', formData.client_id, 'type:', typeof formData.client_id);
              console.log('formData.amount:', formData.amount, 'type:', typeof formData.amount);

              const newErrors = {};

              // Validate client selection for new payments - check all falsy values
              if (!selectedPayment) {
                if (!formData.client_id || formData.client_id === '' || formData.client_id === null || formData.client_id === undefined) {
                  newErrors.client_id = 'Please select a client';
                  console.log('VALIDATION FAILED: client_id is empty');
                }
              }

              // Validate amount is positive (at least $0.01)
              const amount = parseFloat(formData.amount) || 0;
              if (amount < 0.01) {
                newErrors.amount = 'Amount must be at least $0.01';
                console.log('VALIDATION FAILED: amount too low:', amount);
              }

              console.log('Validation errors:', newErrors);
              console.log('Number of errors:', Object.keys(newErrors).length);

              if (Object.keys(newErrors).length > 0) {
                console.log('STOPPING SUBMISSION - validation failed');
                setErrors(newErrors);
                return;
              }

              console.log('VALIDATION PASSED');
              setErrors({});

              if (selectedPayment) {
                console.log('Updating existing payment');
                updateMutation.mutate({ id: selectedPayment.id, data: formData });
              } else {
                // For new payments, ensure allocated amount doesn't exceed payment amount
                if (getTotalAllocated() > formData.amount) {
                  alert('Total allocated amount cannot exceed the payment amount. Please adjust allocations.');
                  return;
                }
                console.log('Creating new payment');
                createMutation.mutate(formData);
              }
            }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Client *</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => { handleClientChange(value); setErrors({...errors, client_id: ''}); }}
                    disabled={!!selectedPayment} // Disable client selection when editing
                  >
                    <SelectTrigger className={`clay-button rounded-2xl border-0 ${errors.client_id ? 'ring-2 ring-red-400' : ''}`}>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.client_id && (
                    <p className="text-red-500 text-xs mt-1">{errors.client_id}</p>
                  )}
                </div>

                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Payment Date *</Label>
                  <Input
                    type="datetime-local"
                    value={formData.payment_date ? new Date(formData.payment_date).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setFormData({...formData, payment_date: new Date(e.target.value).toISOString()})}
                    className="clay-button rounded-2xl border-0"
                    required
                  />
                </div>

                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Amount *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.amount}
                    onChange={(e) => { setFormData({...formData, amount: parseFloat(e.target.value) || 0}); setErrors({...errors, amount: ''}); }}
                    className={`clay-button rounded-2xl border-0 ${errors.amount ? 'ring-2 ring-red-400' : ''}`}
                    required
                  />
                  {errors.amount && (
                    <p className="text-red-500 text-xs mt-1">{errors.amount}</p>
                  )}
                </div>

                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Payment Method *</Label>
                  <Select value={formData.payment_method} onValueChange={(value) => setFormData({...formData, payment_method: value})}>
                    <SelectTrigger className="clay-button rounded-2xl border-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Check">Check</SelectItem>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Zelle">Zelle</SelectItem>
                      <SelectItem value="PayPal">PayPal</SelectItem>
                      <SelectItem value="Venmo">Venmo</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.payment_method === 'Check' && (
                  <>
                    <div>
                      <Label className="text-gray-700 font-medium mb-2 block">Check Number</Label>
                      <Input
                        value={formData.check_number}
                        onChange={(e) => setFormData({...formData, check_number: e.target.value})}
                        className="clay-button rounded-2xl border-0"
                        placeholder="1234"
                      />
                    </div>

                    <div>
                      <Label className="text-gray-700 font-medium mb-2 block">Upload Check Photo</Label>
                      <div className="clay-button rounded-2xl p-3 flex items-center gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="check-upload"
                        />
                        <label htmlFor="check-upload" className="cursor-pointer flex items-center gap-2 text-emerald-600 font-medium">
                          <Upload className="w-4 h-4" />
                          {formData.check_photo_url ? 'Change Photo' : 'Upload Photo'}
                        </label>
                        {formData.check_photo_url && (
                          <a href={formData.check_photo_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-sm">
                            View
                          </a>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger className="clay-button rounded-2xl border-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Cleared">Cleared</SelectItem>
                      <SelectItem value="Bounced">Bounced</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.status === 'Cleared' && (
                  <div>
                    <Label className="text-gray-700 font-medium mb-2 block">Cleared Date</Label>
                    <Input
                      type="date"
                      value={formData.cleared_date ? new Date(formData.cleared_date).toISOString().slice(0,10) : ''}
                      onChange={(e) => setFormData({...formData, cleared_date: e.target.value})}
                      className="clay-button rounded-2xl border-0"
                    />
                  </div>
                )}

                <div className="md:col-span-2">
                  <Label className="text-gray-700 font-medium mb-2 block">Reference Number</Label>
                  <Input
                    value={formData.reference_number}
                    onChange={(e) => setFormData({...formData, reference_number: e.target.value})}
                    className="clay-button rounded-2xl border-0"
                    placeholder="Transaction ID or reference"
                  />
                </div>
              </div>

              {/* Invoice Selection with Allocation */}
              {formData.client_id && !selectedPayment && ( // Only show allocation for new payments
                <div className="pt-4 border-t border-gray-200">
                  <Label className="text-gray-700 font-medium mb-3 block">Apply to Invoices</Label>
                  
                  {formData.invoice_ids.length > 0 && (
                    <div className="clay-button rounded-2xl p-4 bg-blue-50 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-blue-800">Payment Amount:</span>
                        <span className="font-bold text-blue-800">${formData.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-sm text-blue-800">Total Allocated:</span>
                        <span className={`font-bold ${getTotalAllocated() > formData.amount ? 'text-red-600' : 'text-green-600'}`}>
                          ${getTotalAllocated().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      {getTotalAllocated() > formData.amount && (
                        <p className="text-xs text-red-600 mt-2">⚠️ Allocated amount exceeds payment amount</p>
                      )}
                    </div>
                  )}
                  
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {getClientUnpaidInvoices().map((invoice) => {
                      const remainingBalance = invoice.total - (invoice.amount_paid || 0);
                      const isSelected = formData.invoice_ids.includes(invoice.id);
                      
                      return (
                        <div
                          key={invoice.id}
                          className={`clay-button rounded-2xl p-4 transition-all ${
                            isSelected ? 'bg-emerald-50 border-2 border-emerald-300' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3 flex-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleInvoiceToggle(invoice)}
                                className="w-4 h-4 text-emerald-600 rounded"
                              />
                              <div className="flex-1">
                                <p className="font-bold text-gray-800">{invoice.invoice_number}</p>
                                <p className="text-xs text-gray-500">Due: {new Date(invoice.due_date).toLocaleDateString()}</p>
                                {invoice.amount_paid > 0 && (
                                  <p className="text-xs text-orange-600 mt-1">
                                    Paid: ${invoice.amount_paid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | Balance: ${remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-gray-800">${invoice.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                              <Badge className={`${invoice.status === 'Partially Paid' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'} rounded-lg px-2 py-1 text-xs mt-1`}>
                                {invoice.status}
                              </Badge>
                            </div>
                          </div>
                          
                          {isSelected && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <Label className="text-gray-600 text-xs mb-1 block">Amount to Apply</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={invoiceAllocations[invoice.id] || 0}
                                  onChange={(e) => handleAllocationChange(invoice.id, e.target.value)}
                                  className="clay-button rounded-xl border-0 text-sm"
                                  onClick={(e) => e.stopPropagation()} // Prevent triggering parent div click
                                />
                                <Button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation(); // Prevent triggering parent div click
                                    handleAllocationChange(invoice.id, remainingBalance);
                                  }}
                                  className="clay-button rounded-xl px-3 py-2 text-xs text-emerald-600 whitespace-nowrap"
                                >
                                  Full Balance
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {getClientUnpaidInvoices().length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No unpaid/partially paid invoices for this client</p>
                    )}
                  </div>
                </div>
              )}

              {/* Display applied invoices for existing payments (read-only) */}
              {selectedPayment && formData.invoice_numbers && formData.invoice_numbers.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <Label className="text-gray-700 font-medium mb-3 block">Applied to Invoices</Label>
                  <div className="flex flex-wrap gap-2">
                    {formData.invoice_numbers.map((invNum, idx) => (
                      <Badge key={idx} className="bg-blue-100 text-blue-700 rounded-lg px-3 py-1">
                        {invNum}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-gray-700 font-medium mb-2 block">Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="clay-button rounded-2xl border-0 min-h-[80px]"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="clay-button rounded-2xl px-6 py-3 font-medium text-gray-600"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="clay-button rounded-2xl px-6 py-3 font-semibold text-emerald-600 hover:scale-105 transition-transform"
                >
                  {selectedPayment ? 'Update' : 'Record'} Payment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}