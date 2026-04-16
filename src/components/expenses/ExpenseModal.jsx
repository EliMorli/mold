import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function ExpenseModal({ expense, onClose, onSave, saving = false }) {
  const [formData, setFormData] = useState({
    description: '',
    category: 'Other',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    vendor: '',
    payment_method: '',
    status: 'Paid',
    notes: '',
    // Payroll-specific fields
    expense_id: '',
    payroll_start_date: '',
    payroll_end_date: '',
    pay_period_label: '',
    payment_date: '',
    technician_id: '',
    technician_name: '',
    ...expense
  });

  const isPayroll = formData.category === 'Salaries';

  // Fetch technicians for payroll
  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list(),
    initialData: [],
    enabled: isPayroll, // Only fetch when payroll category is selected
  });

  // Auto-generate expense ID for new expenses
  useEffect(() => {
    const generateExpenseId = async () => {
      if (expense) return; // Don't generate for existing expenses

      try {
        const allExpenses = await base44.entities.Expense.list();
        const currentYear = new Date().getFullYear();
        
        const yearPrefix = `EXP-${currentYear}-`;
        const currentYearExpenses = allExpenses
          .filter(exp => exp.expense_id && exp.expense_id.startsWith(yearPrefix))
          .map(exp => {
            const parts = exp.expense_id.split('-');
            return parseInt(parts[2]) || 0;
          });

        const maxNumber = currentYearExpenses.length > 0 ? Math.max(...currentYearExpenses) : 0;
        const nextNumber = maxNumber + 1;
        const paddedNumber = String(nextNumber).padStart(3, '0');
        
        const generatedExpenseId = `EXP-${currentYear}-${paddedNumber}`;
        
        setFormData(prev => ({
          ...prev,
          expense_id: generatedExpenseId
        }));
      } catch (error) {
        console.error('Error generating expense ID:', error);
      }
    };

    generateExpenseId();
  }, [expense]);

  // Calculate pay period label when dates change
  useEffect(() => {
    if (isPayroll && formData.payroll_start_date) {
      const startDate = new Date(formData.payroll_start_date);
      const weekNumber = Math.ceil((startDate - new Date(startDate.getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000));
      const year = startDate.getFullYear();
      const payPeriodLabel = `Week ${weekNumber} ${year}`;
      
      setFormData(prev => ({
        ...prev,
        pay_period_label: payPeriodLabel
      }));
    }
  }, [formData.payroll_start_date, isPayroll]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // For payroll, set description automatically if not set
    if (isPayroll && !formData.description) {
      formData.description = `Payroll - ${formData.technician_name || 'Employee'} - ${formData.pay_period_label}`;
    }
    
    onSave(formData);
  };

  const handleCategoryChange = (category) => {
    setFormData({
      ...formData,
      category,
      // Reset payroll-specific fields if switching away from Salaries
      ...(category !== 'Salaries' ? {
        payroll_start_date: '',
        payroll_end_date: '',
        pay_period_label: '',
        payment_date: '',
        technician_id: '',
        technician_name: ''
      } : {})
    });
  };

  const handleTechnicianChange = (techId) => {
    const selectedTech = technicians.find(t => t.id === techId);
    if (selectedTech) {
      setFormData({
        ...formData,
        technician_id: techId,
        technician_name: selectedTech.name
      });
    }
  };

  // Regular expense form
  const renderRegularExpenseForm = () => (
    <>
      <div className="md:col-span-2">
        <Label className="text-gray-700 font-medium mb-2 block">
          Description <span className="text-red-500">*</span>
        </Label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          className="clay-button rounded-2xl border-0"
          placeholder="What was this expense for?"
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
          value={formData.amount}
          onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
          className="clay-button rounded-2xl border-0"
          placeholder="0.00"
          required
        />
      </div>

      <div>
        <Label className="text-gray-700 font-medium mb-2 block">
          Date <span className="text-red-500">*</span>
        </Label>
        <Input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({...formData, date: e.target.value})}
          className="clay-button rounded-2xl border-0"
          required
        />
      </div>

      <div>
        <Label className="text-gray-700 font-medium mb-2 block">Vendor</Label>
        <Input
          value={formData.vendor}
          onChange={(e) => setFormData({...formData, vendor: e.target.value})}
          className="clay-button rounded-2xl border-0"
          placeholder="Vendor name"
        />
      </div>

      <div>
        <Label className="text-gray-700 font-medium mb-2 block">Payment Method</Label>
        <Select value={formData.payment_method} onValueChange={(value) => setFormData({...formData, payment_method: value})}>
          <SelectTrigger className="clay-button rounded-2xl border-0">
            <SelectValue placeholder="Select method" />
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
        <Label className="text-gray-700 font-medium mb-2 block">Status</Label>
        <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
          <SelectTrigger className="clay-button rounded-2xl border-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
            <SelectItem value="Reimbursed">Reimbursed</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );

  // Payroll-specific form
  const renderPayrollForm = () => (
    <>
      <div>
        <Label className="text-gray-700 font-medium mb-2 block">
          Expense ID
        </Label>
        <Input
          value={formData.expense_id}
          className="clay-button rounded-2xl border-0 bg-gray-50"
          placeholder="EXP-2024-001"
          readOnly
        />
        <p className="text-xs text-gray-500 mt-1">Auto-generated</p>
      </div>

      <div>
        <Label className="text-gray-700 font-medium mb-2 block">
          Pay Period Label
        </Label>
        <Input
          value={formData.pay_period_label}
          className="clay-button rounded-2xl border-0 bg-gray-50"
          placeholder="Week 10 2025"
          readOnly
        />
        <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
      </div>

      <div className="md:col-span-2">
        <Label className="text-gray-700 font-medium mb-2 block">
          Paid To (Worker/Employee) <span className="text-red-500">*</span>
        </Label>
        <Select value={formData.technician_id} onValueChange={handleTechnicianChange} required>
          <SelectTrigger className="clay-button rounded-2xl border-0">
            <SelectValue placeholder="Select worker/employee" />
          </SelectTrigger>
          <SelectContent>
            {technicians.map(tech => (
              <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-gray-700 font-medium mb-2 block">
          Date Range Start <span className="text-red-500">*</span>
        </Label>
        <Input
          type="date"
          value={formData.payroll_start_date}
          onChange={(e) => setFormData({...formData, payroll_start_date: e.target.value})}
          className="clay-button rounded-2xl border-0"
          required
        />
      </div>

      <div>
        <Label className="text-gray-700 font-medium mb-2 block">
          Date Range End <span className="text-red-500">*</span>
        </Label>
        <Input
          type="date"
          value={formData.payroll_end_date}
          onChange={(e) => setFormData({...formData, payroll_end_date: e.target.value})}
          className="clay-button rounded-2xl border-0"
          required
        />
      </div>

      <div>
        <Label className="text-gray-700 font-medium mb-2 block">
          Total Payroll Amount <span className="text-red-500">*</span>
        </Label>
        <Input
          type="number"
          step="0.01"
          value={formData.amount}
          onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
          className="clay-button rounded-2xl border-0"
          placeholder="0.00"
          required
        />
      </div>

      <div>
        <Label className="text-gray-700 font-medium mb-2 block">
          Payment Date <span className="text-red-500">*</span>
        </Label>
        <Input
          type="date"
          value={formData.payment_date}
          onChange={(e) => setFormData({...formData, payment_date: e.target.value, date: e.target.value})}
          className="clay-button rounded-2xl border-0"
          required
        />
      </div>

      <div>
        <Label className="text-gray-700 font-medium mb-2 block">
          Paid From <span className="text-red-500">*</span>
        </Label>
        <Select 
          value={formData.payment_method} 
          onValueChange={(value) => setFormData({...formData, payment_method: value})}
          required
        >
          <SelectTrigger className="clay-button rounded-2xl border-0">
            <SelectValue placeholder="Select payment method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Checking">Checking</SelectItem>
            <SelectItem value="Zelle">Zelle</SelectItem>
            <SelectItem value="Cash">Cash</SelectItem>
            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
            <SelectItem value="PayPal">PayPal</SelectItem>
            <SelectItem value="Venmo">Venmo</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-gray-700 font-medium mb-2 block">Status</Label>
        <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
          <SelectTrigger className="clay-button rounded-2xl border-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="clay-card rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {expense ? 'Edit Expense' : 'New Expense'}
          </h2>
          <button
            onClick={onClose}
            className="clay-button rounded-2xl p-2 hover:scale-110 transition-transform"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Selection - Always shown first */}
          <div>
            <Label className="text-gray-700 font-medium mb-2 block">
              Category <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.category} onValueChange={handleCategoryChange}>
              <SelectTrigger className="clay-button rounded-2xl border-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Lab Fees">Lab Fees</SelectItem>
                <SelectItem value="Equipment">Equipment</SelectItem>
                <SelectItem value="Travel">Travel</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
                <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                <SelectItem value="Insurance">Insurance</SelectItem>
                <SelectItem value="Utilities">Utilities</SelectItem>
                <SelectItem value="Salaries">Salaries / Payroll</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Show Payroll form banner if Salaries selected */}
          {isPayroll && (
            <div className="clay-card rounded-2xl p-4 bg-blue-50 border border-blue-200">
              <p className="text-sm font-medium text-blue-800">
                💼 Payroll Expense Form
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Track salary/payroll payments to employees with date ranges and pay periods
              </p>
            </div>
          )}

          {/* Conditional form based on category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isPayroll ? renderPayrollForm() : renderRegularExpenseForm()}
          </div>

          {/* Notes - Always shown */}
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
              className="clay-button rounded-2xl px-6 py-3 font-semibold text-red-600 hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : `${expense ? 'Update' : 'Create'} Expense`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}