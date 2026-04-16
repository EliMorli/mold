
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";

export default function InvoiceModal({ invoice, clients, tests, onClose, onSave, saving = false }) {
  // Calculate default due date (30 days from today)
  const getDefaultDueDate = () => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    return dueDate.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    invoice_number: '',
    client_id: '',
    client_name: '',
    test_id: '',
    test_number: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: invoice?.due_date || getDefaultDueDate(), // Auto-calculate 30 days from today
    amount: 0,
    tax: 0,
    total: 0,
    amount_paid: 0,
    status: 'Draft',
    payment_method: '',
    paid_date: '',
    notes: '',
    ...invoice
  });
  const [errors, setErrors] = useState({});

  // Auto-generate invoice number for new invoices
  useEffect(() => {
    const generateInvoiceNumber = async () => {
      if (invoice) return; // Don't generate for existing invoices

      try {
        // Get all invoices to find the highest number
        const allInvoices = await base44.entities.Invoice.list();
        const currentYear = new Date().getFullYear();
        
        // Filter invoices from current year and extract numbers
        const yearPrefix = `INV-${currentYear}-`;
        const currentYearInvoices = allInvoices
          .filter(inv => inv.invoice_number && inv.invoice_number.startsWith(yearPrefix))
          .map(inv => {
            const parts = inv.invoice_number.split('-');
            return parseInt(parts[2]) || 0;
          });

        // Find the highest number and increment
        const maxNumber = currentYearInvoices.length > 0 ? Math.max(...currentYearInvoices) : 0;
        const nextNumber = maxNumber + 1;
        const paddedNumber = String(nextNumber).padStart(3, '0');
        
        const generatedInvoiceNumber = `INV-${currentYear}-${paddedNumber}`;
        
        setFormData(prev => ({
          ...prev,
          invoice_number: generatedInvoiceNumber
        }));
      } catch (error) {
        console.error('Error generating invoice number:', error);
      }
    };

    generateInvoiceNumber();
  }, [invoice]);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('=== INVOICE FORM SUBMIT ===');
    console.log('formData.client_id:', formData.client_id, 'type:', typeof formData.client_id);
    console.log('formData.amount:', formData.amount, 'type:', typeof formData.amount);

    const newErrors = {};

    // Validate client selection - check for empty string, null, undefined
    if (!formData.client_id || formData.client_id === '' || formData.client_id === null || formData.client_id === undefined) {
      newErrors.client_id = 'Please select a client';
      console.log('VALIDATION FAILED: client_id is empty');
    }

    // Validate amount is not negative
    const amount = parseFloat(formData.amount) || 0;
    if (amount < 0) {
      newErrors.amount = 'Amount must be a positive number';
      console.log('VALIDATION FAILED: amount is negative:', amount);
    }

    console.log('Validation errors:', newErrors);
    console.log('Number of errors:', Object.keys(newErrors).length);

    if (Object.keys(newErrors).length > 0) {
      console.log('STOPPING SUBMISSION - validation failed');
      setErrors(newErrors);
      return;
    }

    console.log('VALIDATION PASSED - calling onSave');
    setErrors({});
    onSave(formData);
  };

  const handleClientChange = (clientId) => {
    const selectedClient = clients.find(c => c.id === clientId);
    if (selectedClient) {
      setFormData({
        ...formData,
        client_id: clientId,
        client_name: selectedClient.name
      });
    }
  };

  const handleTestChange = (testId) => {
    const selectedTest = tests.find(t => t.id === testId);
    if (selectedTest) {
      setFormData({
        ...formData,
        test_id: testId,
        test_number: selectedTest.test_number,
        amount: selectedTest.cost || 0,
        total: (selectedTest.cost || 0) + (formData.tax || 0)
      });
    }
  };

  const handleAmountChange = (amount) => {
    const total = amount + (formData.tax || 0);
    setFormData({
      ...formData,
      amount,
      total
    });
  };

  const handleTaxChange = (tax) => {
    const total = (formData.amount || 0) + tax;
    setFormData({
      ...formData,
      tax,
      total
    });
  };

  const handleStatusChange = (newStatus) => {
    const updates = { status: newStatus };
    
    // Auto-set paid_date when marking as Paid
    if (newStatus === 'Paid' && !formData.paid_date) {
      updates.paid_date = new Date().toISOString();
      // Also set amount_paid to total if marking as fully paid manually
      if ((formData.amount_paid || 0) < formData.total) {
        updates.amount_paid = formData.total;
      }
    }
    
    // Clear paid_date if changing from Paid to another status
    if (newStatus !== 'Paid' && formData.status === 'Paid') {
      updates.paid_date = '';
    }
    
    setFormData({
      ...formData,
      ...updates
    });
  };

  const formatDateTimeForInput = (dateTime) => {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const formatDisplayDateTime = (dateTime) => {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const remainingBalance = formData.total - (formData.amount_paid || 0); // ADDED

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="clay-card rounded-3xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {invoice ? 'Edit Invoice' : 'New Invoice'}
          </h2>
          <button
            onClick={onClose}
            className="clay-button rounded-2xl p-2 hover:scale-110 transition-transform"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-700 font-medium mb-2 block">
                Invoice Number <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formData.invoice_number}
                onChange={(e) => setFormData({...formData, invoice_number: e.target.value})}
                className="clay-button rounded-2xl border-0 bg-gray-50"
                placeholder="INV-2024-001"
                required
                readOnly
              />
              <p className="text-xs text-gray-500 mt-1">Auto-generated</p>
            </div>

            <div>
              <Label className="text-gray-700 font-medium mb-2 block">
                Status <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="clay-button rounded-2xl border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Sent">Sent</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-700 font-medium mb-2 block">
                Client <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.client_id} onValueChange={(value) => { handleClientChange(value); setErrors({...errors, client_id: ''}); }}>
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
              <Label className="text-gray-700 font-medium mb-2 block">Test (Optional)</Label>
              <Select value={formData.test_id} onValueChange={handleTestChange}>
                <SelectTrigger className="clay-button rounded-2xl border-0">
                  <SelectValue placeholder="Select test (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {tests.map(test => (
                    <SelectItem key={test.id} value={test.id}>
                      {test.test_number} - {test.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-700 font-medium mb-2 block">
                Issue Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({...formData, issue_date: e.target.value})}
                className="clay-button rounded-2xl border-0"
                required
              />
            </div>

            <div>
              <Label className="text-gray-700 font-medium mb-2 block">
                Due Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                className="clay-button rounded-2xl border-0"
                required
              />
            </div>

            <div>
              <Label className="text-gray-700 font-medium mb-2 block">
                Amount <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => { handleAmountChange(parseFloat(e.target.value) || 0); setErrors({...errors, amount: ''}); }}
                className={`clay-button rounded-2xl border-0 ${errors.amount ? 'ring-2 ring-red-400' : ''}`}
                placeholder="0.00"
                required
              />
              {errors.amount && (
                <p className="text-red-500 text-xs mt-1">{errors.amount}</p>
              )}
            </div>

            <div>
              <Label className="text-gray-700 font-medium mb-2 block">Tax</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.tax}
                onChange={(e) => handleTaxChange(parseFloat(e.target.value) || 0)}
                className="clay-button rounded-2xl border-0"
                placeholder="0.00"
              />
            </div>

            <div className="md:col-span-2">
              <div className="clay-card rounded-2xl p-4 bg-green-50 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Invoice Total:</span>
                  <span className="text-xl font-bold text-gray-800">
                    ${formData.total.toFixed(2)}
                  </span>
                </div>
                {formData.amount_paid > 0 && (
                  <>
                    <div className="flex justify-between items-center pt-2 border-t border-green-200">
                      <span className="text-sm font-medium text-gray-700">Amount Paid:</span>
                      <span className="text-lg font-bold text-green-600">
                        ${formData.amount_paid.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Remaining Balance:</span>
                      <span className={`text-xl font-bold ${remainingBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        ${remainingBalance.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {formData.status === 'Paid' && (
              <>
                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">Payment Method</Label>
                  <Select value={formData.payment_method} onValueChange={(value) => setFormData({...formData, payment_method: value})}>
                    <SelectTrigger className="clay-button rounded-2xl border-0">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Check">Check</SelectItem>
                      <SelectItem value="Credit Card">Credit Card</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-700 font-medium mb-2 block">
                    Paid Date & Time
                  </Label>
                  <Input
                    type="datetime-local"
                    value={formatDateTimeForInput(formData.paid_date)}
                    onChange={(e) => setFormData({...formData, paid_date: e.target.value ? new Date(e.target.value).toISOString() : ''})}
                    className="clay-button rounded-2xl border-0"
                  />
                  {formData.paid_date && (
                    <p className="text-xs text-gray-500 mt-1">
                      Set to: {formatDisplayDateTime(formData.paid_date)}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Show timestamp info */}
          {invoice && (
            <div className="clay-card rounded-2xl p-4 bg-gray-50">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Record History</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-600">
                <div>
                  <span className="font-medium">Created:</span>{' '}
                  {formatDisplayDateTime(invoice.created_date)}
                </div>
                <div>
                  <span className="font-medium">Last Updated:</span>{' '}
                  {formatDisplayDateTime(invoice.updated_date)}
                </div>
                {invoice.amount_paid > 0 && (
                  <div className="md:col-span-2 pt-2 border-t border-gray-300">
                    <span className="font-medium text-green-700">Payment Status:</span>{' '}
                    <span className="text-green-700 font-semibold">
                      ${invoice.amount_paid.toFixed(2)} paid
                    </span>
                    {remainingBalance > 0 && (
                      <span className="text-orange-700 font-semibold">
                        {' '}• ${remainingBalance.toFixed(2)} remaining
                      </span>
                    )}
                  </div>
                )}
                {invoice.paid_date && remainingBalance <= 0 && (
                  <div className="md:col-span-2">
                    <span className="font-medium text-green-700">Fully Paid On:</span>{' '}
                    <span className="text-green-700 font-semibold">
                      {formatDisplayDateTime(invoice.paid_date)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <Label className="text-gray-700 font-medium mb-2 block">Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="clay-button rounded-2xl border-0 min-h-[100px]"
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              onClick={onClose}
              className="clay-button rounded-2xl px-6 py-3 font-medium text-gray-600"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="clay-button rounded-2xl px-6 py-3 font-semibold text-green-600 hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : `${invoice ? 'Update' : 'Create'} Invoice`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
