import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileText, Download, TrendingUp, TrendingDown, DollarSign, Receipt, Wallet, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { useState } from "react";

export default function ReportsPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState("weekly"); // weekly or monthly
  const [exporting, setExporting] = useState(false);

  const { data: tests = [] } = useQuery({
    queryKey: ['tests'],
    queryFn: () => base44.entities.Test.list(),
    initialData: []
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
    initialData: []
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
    initialData: []
  });

  // Calculate current period range
  const getPeriodRange = () => {
    const today = new Date();

    if (viewMode === "weekly") {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + weekOffset * 7);
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      return { start: startOfWeek, end: endOfWeek };
    } else {
      // Monthly view
      const startOfMonth = new Date(today.getFullYear(), today.getMonth() + weekOffset, 1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + weekOffset + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      return { start: startOfMonth, end: endOfMonth };
    }
  };

  const { start: periodStart, end: periodEnd } = getPeriodRange();

  // Filter this period's data
  const periodInvoices = invoices.filter((inv) => {
    if (!inv.paid_date || inv.status !== 'Paid') return false;
    const paidDate = new Date(inv.paid_date);
    return paidDate >= periodStart && paidDate <= periodEnd;
  });

  const periodExpenses = expenses.filter((exp) => {
    const expDate = new Date(exp.date);
    return expDate >= periodStart && expDate <= periodEnd;
  });

  const periodTests = tests.filter((test) => {
    const testDate = new Date(test.completed_date || test.created_date); // Assuming either can be used to determine if it falls within the period
    return testDate >= periodStart && testDate <= periodEnd;
  });

  // Calculate period totals
  const periodCollected = periodInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const periodSpent = periodExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const periodProfit = periodCollected - periodSpent;

  // Calculate expected revenue (sent invoices)
  const expectedRevenue = invoices.filter((inv) => {
    const invDate = new Date(inv.due_date || inv.issue_date); // Use due_date or issue_date for expected invoices
    return invDate >= periodStart && invDate <= periodEnd && (inv.status === 'Sent' || inv.status === 'Overdue');
  }).reduce((sum, inv) => sum + (inv.total || 0), 0);


  // Overall stats (these remain global, not tied to period)
  const totalRevenue = invoices.filter((i) => i.status === 'Paid').reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue * 100).toFixed(1) : 0;

  // Invoice status breakdown (these remain global)
  const invoiceStats = {
    sent: invoices.filter((i) => i.status === 'Sent').length,
    paid: invoices.filter((i) => i.status === 'Paid').length,
    unpaid: invoices.filter((i) => i.status === 'Sent' || i.status === 'Overdue').length,
    overdue: invoices.filter((i) => i.status === 'Overdue').length,
    totalPending: invoices.filter((i) => i.status === 'Sent').reduce((sum, inv) => sum + (inv.total || 0), 0),
    totalOverdue: invoices.filter((i) => i.status === 'Overdue').reduce((sum, inv) => sum + (inv.total || 0), 0)
  };

  // Expense breakdown by category for this period
  const periodExpenseByCategory = [
  { name: 'Lab Fees', value: periodExpenses.filter((e) => e.category === 'Lab Fees').reduce((sum, e) => sum + e.amount, 0), color: '#A78BFA' },
  { name: 'Salaries', value: periodExpenses.filter((e) => e.category === 'Salaries').reduce((sum, e) => sum + e.amount, 0), color: '#10B981' },
  { name: 'Google Ads', value: periodExpenses.filter((e) => e.category === 'Google Ads').reduce((sum, e) => sum + e.amount, 0), color: '#F59E0B' },
  { name: 'Marketing', value: periodExpenses.filter((e) => e.category === 'Marketing').reduce((sum, e) => sum + e.amount, 0), color: '#EC4899' },
  { name: 'Travel', value: periodExpenses.filter((e) => e.category === 'Travel').reduce((sum, e) => sum + e.amount, 0), color: '#3B82F6' },
  { name: 'Equipment', value: periodExpenses.filter((e) => e.category === 'Equipment').reduce((sum, e) => sum + e.amount, 0), color: '#8B5CF6' },
  { name: 'Other', value: periodExpenses.filter((e) => !['Lab Fees', 'Salaries', 'Google Ads', 'Marketing', 'Travel', 'Equipment'].includes(e.category)).reduce((sum, e) => sum + e.amount, 0), color: '#94A3B8' }].
  filter((d) => d.value > 0);

  // Technician performance (jobs completed this period)
  const techPerformance = periodTests.reduce((acc, test) => {
    if (!test.technician_id || !test.technician_name) return acc;

    if (!acc[test.technician_id]) {
      acc[test.technician_id] = {
        name: test.technician_name,
        completed: 0
      };
    }
    acc[test.technician_id].completed++;
    return acc;
  }, {});

  const techPerformanceData = Object.values(techPerformance).sort((a, b) => b.completed - a.completed);

  // Monthly revenue trend (last 6 months) - this remains global
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const month = new Date();
    month.setMonth(month.getMonth() - (5 - i));
    const monthStr = month.toLocaleDateString('en-US', { month: 'short' });

    const revenue = invoices.
    filter((inv) => {
      if (!inv.paid_date || inv.status !== 'Paid') return false;
      const invDate = new Date(inv.paid_date);
      return invDate.getMonth() === month.getMonth() && invDate.getFullYear() === month.getFullYear();
    }).
    reduce((sum, inv) => sum + (inv.total || 0), 0);

    const monthExpenses = expenses.
    filter((exp) => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === month.getMonth() && expDate.getFullYear() === month.getFullYear();
    }).
    reduce((sum, exp) => sum + (exp.amount || 0), 0);

    return { month: monthStr, revenue, expenses: monthExpenses, profit: revenue - monthExpenses };
  });

  // Recent unpaid invoices (these remain global)
  const unpaidInvoices = invoices.
  filter((i) => i.status === 'Sent' || i.status === 'Overdue').
  sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).
  slice(0, 5);

  // Recent expenses (these remain global)
  const recentExpenses = [...expenses].
  sort((a, b) => new Date(b.date) - new Date(a.date)).
  slice(0, 5);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatPeriodRange = () => {
    if (viewMode === "weekly") {
      const startYear = periodStart.getFullYear();
      const endYear = periodEnd.getFullYear();
      const currentYear = new Date().getFullYear();

      let startFormatted = periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (startYear !== currentYear || startYear !== endYear) {// Show year for start date if different from current year or end year
        startFormatted = periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      let endFormatted = periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); // Always show year for end date

      return `${startFormatted} - ${endFormatted}`;
    } else {// Monthly view
      return periodStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };

  const handleExport = () => {
    setExporting(true);
    try {
      // Create CSV content
      const headers = "Category,Amount\n";
      
      let rows = "";
      rows += `Period,${formatPeriodRange()}\n`;
      rows += `\n`;
      rows += `Expected Revenue,$${expectedRevenue.toLocaleString()}\n`;
      rows += `Collected Revenue,$${periodCollected.toLocaleString()}\n`;
      rows += `Expenses,$${periodSpent.toLocaleString()}\n`;
      rows += `Net Cash,$${periodProfit.toLocaleString()}\n`;
      rows += `Jobs Completed,${periodTests.filter(t => t.status === 'Completed').length}\n`;
      rows += `\n`;
      rows += `Overall Stats\n`;
      rows += `Total Revenue (All-Time),$${totalRevenue.toLocaleString()}\n`;
      rows += `Total Expenses (All-Time),$${totalExpenses.toLocaleString()}\n`;
      rows += `Net Profit (All-Time),$${netProfit.toLocaleString()}\n`;
      rows += `Profit Margin,${profitMargin}%\n`;
      rows += `Unpaid Invoices,${invoiceStats.unpaid}\n`;
      rows += `Unpaid Amount,$${invoiceStats.totalPending.toLocaleString()}\n`;
      
      const csv = headers + rows;
      
      // Download CSV
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Financial_Report_${formatPeriodRange().replace(/\s/g, '_')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error("Error exporting report:", error);
      alert("Failed to export report");
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
              Financial Reports
            </h1>
            <p className="text-gray-500 mt-1">Complete financial overview and insights</p>
          </div>
          <Button 
            onClick={handleExport}
            disabled={exporting}
            className="clay-button rounded-2xl px-6 py-3 flex items-center gap-2 font-semibold text-green-600 hover:scale-105"
          >
            <Download className="w-5 h-5" />
            {exporting ? 'Exporting...' : 'Export Report'}
          </Button>
        </div>
      </div>

      {/* Period Summary - Enhanced */}
      <div className="clay-card rounded-3xl p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-start md:items-center gap-3">
            <Calendar className="w-6 h-6 text-green-600 flex-shrink-0 mt-1 md:mt-0" />
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <h2 className="text-lg md:text-xl font-bold text-green-800">
                  {viewMode === "weekly" ? "Weekly" : "Monthly"} Summary
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode("weekly")}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    viewMode === "weekly" ?
                    'bg-green-600 text-white' :
                    'bg-white text-green-700 hover:bg-green-100'}`
                    }>
                    Weekly
                  </button>
                  <button
                    onClick={() => setViewMode("monthly")}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    viewMode === "monthly" ?
                    'bg-green-600 text-white' :
                    'bg-white text-green-700 hover:bg-green-100'}`
                    }>
                    Monthly
                  </button>
                </div>
              </div>
              <p className="text-sm text-green-600 mt-1">{formatPeriodRange()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => setWeekOffset(weekOffset - 1)}
              className="clay-button rounded-xl px-3 md:px-4 py-2 text-xs md:text-sm font-semibold text-green-700 hover:scale-105 transition-transform">
              <span className="hidden sm:inline">← Previous</span>
              <span className="sm:hidden">←</span>
            </Button>
            {weekOffset !== 0 &&
            <Button
              onClick={() => setWeekOffset(0)}
              className="clay-button rounded-xl px-3 md:px-4 py-2 text-xs md:text-sm font-semibold bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:scale-105 transition-transform shadow-md">
                Current
              </Button>
            }
            <Button
              onClick={() => setWeekOffset(weekOffset + 1)}
              disabled={weekOffset >= 0}
              className="clay-button rounded-xl px-3 md:px-4 py-2 text-xs md:text-sm font-semibold text-green-700 hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed">
              <span className="hidden sm:inline">Next →</span>
              <span className="sm:hidden">→</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="clay-card rounded-2xl p-4 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center shadow-inner">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Expected</p>
                <p className="text-xl font-bold text-gray-800">${expectedRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="clay-card rounded-2xl p-4 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center shadow-inner">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Collected</p>
                <p className="text-xl font-bold text-gray-800">${periodCollected.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="clay-card rounded-2xl p-4 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-400 to-orange-400 flex items-center justify-center shadow-inner">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Spent</p>
                <p className="text-xl font-bold text-gray-800">${periodSpent.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="clay-card rounded-2xl p-4 bg-white">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${
              periodProfit >= 0 ? 'bg-gradient-to-br from-blue-400 to-cyan-400' : 'bg-gradient-to-br from-red-400 to-pink-400'}`
              }>
                {periodProfit >= 0 ?
                <TrendingUp className="w-6 h-6 text-white" /> :

                <TrendingDown className="w-6 h-6 text-white" />
                }
              </div>
              <div>
                <p className="text-sm text-gray-500">Net Cash</p>
                <p className={`text-xl font-bold ${periodProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${Math.abs(periodProfit).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Jobs Completed This Period */}
        <div className="mt-4 clay-card rounded-2xl p-4 bg-white">
          <p className="text-sm text-gray-500 mb-1">Jobs Completed</p>
          <p className="text-2xl font-bold text-gray-800">{periodTests.filter((t) => t.status === 'Completed').length}</p>
        </div>
      </div>

      {/* Overall KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="clay-card rounded-3xl p-6">
          <h3 className="text-sm text-gray-500 mb-2">Total Revenue</h3>
          <p className="text-3xl font-bold text-gray-800 mb-2">${totalRevenue.toLocaleString()}</p>
          <div className="flex items-center gap-1 text-green-600 text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>All-time</span>
          </div>
        </div>

        <div className="clay-card rounded-3xl p-6">
          <h3 className="text-sm text-gray-500 mb-2">Total Expenses</h3>
          <p className="text-3xl font-bold text-gray-800 mb-2">${totalExpenses.toLocaleString()}</p>
          <div className="flex items-center gap-1 text-red-600 text-sm">
            <TrendingDown className="w-4 h-4" />
            <span>All-time</span>
          </div>
        </div>

        <div className="clay-card rounded-3xl p-6">
          <h3 className="text-sm text-gray-500 mb-2">Net Profit</h3>
          <p className="text-3xl font-bold text-gray-800 mb-2">${netProfit.toLocaleString()}</p>
          <div className="flex items-center gap-1 text-green-600 text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>Margin: {profitMargin}%</span>
          </div>
        </div>

        <div className="clay-card rounded-3xl p-6">
          <h3 className="text-sm text-gray-500 mb-2">Unpaid Invoices</h3>
          <p className="text-3xl font-bold text-gray-800 mb-2">{invoiceStats.unpaid}</p>
          <div className="flex items-center gap-1 text-orange-600 text-sm">
            <Receipt className="w-4 h-4" />
            <span>${invoiceStats.totalPending.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Expenses Trend (This remains global/6-month trend) */}
        <div className="clay-card rounded-3xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Financial Trend (6 Months)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={3} name="Revenue" />
              <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={3} name="Expenses" />
              <Line type="monotone" dataKey="profit" stroke="#3B82F6" strokeWidth={3} name="Profit" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Period Expense Breakdown */}
        <div className="clay-card rounded-3xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            {viewMode === "weekly" ? "Weekly" : "Monthly"} Expenses by Category
          </h3>
          {periodExpenseByCategory.length > 0 ?
          <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                  data={periodExpenseByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value">

                    {periodExpenseByCategory.map((entry, index) =>
                  <Cell key={`cell-${index}`} fill={entry.color} />
                  )}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-2 mt-4">
                {periodExpenseByCategory.map((item) =>
              <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                    <span className="text-xs text-gray-600 truncate">{item.name}</span>
                  </div>
              )}
              </div>
            </> :

          <div className="text-center py-12">
              <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No expenses for this period</p>
            </div>
          }
        </div>
      </div>

      {/* New Row for Technician Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Technician Performance */}
        <div className="clay-card rounded-3xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Technician Performance</h3>
          {techPerformanceData.length > 0 ?
          <ResponsiveContainer width="100%" height={250}>
              <BarChart data={techPerformanceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" stroke="#9CA3AF" />
                <YAxis dataKey="name" type="category" stroke="#9CA3AF" width={100} />
                <Tooltip />
                <Bar dataKey="completed" fill="#A78BFA" radius={[0, 10, 10, 0]} />
              </BarChart>
            </ResponsiveContainer> :

          <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No completed jobs for this period</p>
            </div>
          }
        </div>

        {/* Placeholder for future expansion or move existing component here if layout allows */}
        {/* Keeping existing layout for Unpaid Invoices and Recent Expenses for now as per instructions */}
        <div className="clay-card rounded-3xl p-6">
            <h3 className="text-lg font-bold text-orange-600 mb-4">Unpaid Invoices ({invoiceStats.unpaid})</h3>
            {unpaidInvoices.length > 0 ?
          <div className="space-y-3">
                {unpaidInvoices.map((invoice) =>
            <div key={invoice.id} className="clay-button rounded-2xl p-4 flex items-center justify-between">
                    <div>
                        <p className="font-bold text-gray-800">{invoice.invoice_number}</p>
                        <p className="text-sm text-gray-500">{invoice.client_name}</p>
                        <p className="text-xs text-gray-400 mt-1">Due: {formatDate(invoice.due_date)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-bold text-gray-800">${invoice.total.toLocaleString()}</p>
                        <Badge className={`${
                invoice.status === 'Overdue' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'} rounded-lg px-2 py-0.5 text-xs mt-1`
                }>
                        {invoice.status}
                        </Badge>
                    </div>
                    </div>
            )}
                </div> :

          <div className="text-center py-8">
                <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">All invoices are paid!</p>
                </div>
          }
        </div>
      </div>
      
      {/* Original Invoice Status & Recent Transactions (modified to remove Unpaid invoices from here) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* This column was for Unpaid Invoices, which is now moved above. Keeping grid structure for other elements if needed. 
             Removing it directly if no other element needs to occupy this spot
          */}
        {/* Recent Expenses */}
        {/* Moved this to span 2 columns as the previous unpaid invoices moved. */}
        <div className="clay-card rounded-3xl p-6 col-span-full"> 
          <h3 className="text-lg font-bold text-red-600 mb-4">Recent Expenses</h3>
          {recentExpenses.length > 0 ?
          <div className="space-y-3">
              {recentExpenses.map((expense) =>
            <div key={expense.id} className="clay-button rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{expense.description || expense.category}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="bg-purple-100 text-purple-700 rounded-lg px-2 py-0.5 text-xs">
                        {expense.category}
                      </Badge>
                      <span className="text-xs text-gray-400">{formatDate(expense.date)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-800">${expense.amount.toLocaleString()}</p>
                    {expense.vendor &&
                <p className="text-xs text-gray-500">{expense.vendor}</p>
                }
                  </div>
                </div>
            )}
            </div> :

          <div className="text-center py-8">
              <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No expenses yet</p>
            </div>
          }
        </div>
      </div>
    </div>);

}