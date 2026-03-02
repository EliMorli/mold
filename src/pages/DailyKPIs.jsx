import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  Users,
  FlaskConical,
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { createPageUrl } from "@/utils";

export default function DailyKPIs() {
  const [timePeriod, setTimePeriod] = useState("Daily");

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list('-created_date'),
    initialData: [],
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list('-date'),
    initialData: [],
  });

  const { data: tests = [] } = useQuery({
    queryKey: ['tests'],
    queryFn: () => base44.entities.Test.list('-scheduled_date'),
    initialData: [],
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list(),
    initialData: [],
  });

  // Get date range based on time period
  const getDateRange = () => {
    const now = new Date();
    const start = new Date();

    if (timePeriod === "Daily") {
      start.setHours(0, 0, 0, 0);
    } else if (timePeriod === "Weekly") {
      const dayOfWeek = now.getDay();
      start.setDate(now.getDate() - dayOfWeek);
      start.setHours(0, 0, 0, 0);
    } else if (timePeriod === "Monthly") {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    }

    return { start, end: now };
  };

  const dateRange = getDateRange();

  // Filter data by date range
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const invDate = new Date(inv.created_date || inv.issue_date);
      return invDate >= dateRange.start && invDate <= dateRange.end;
    });
  }, [invoices, timePeriod]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate >= dateRange.start && expDate <= dateRange.end;
    });
  }, [expenses, timePeriod]);

  const filteredTests = useMemo(() => {
    return tests.filter(test => {
      const testDate = new Date(test.scheduled_date || test.created_date);
      return testDate >= dateRange.start && testDate <= dateRange.end;
    });
  }, [tests, timePeriod]);

  // Calculate KPIs
  const totalSales = filteredInvoices
    .filter(inv => inv.status === 'Paid')
    .reduce((sum, inv) => sum + (inv.total || 0), 0);

  const totalExpenses = filteredExpenses
    .reduce((sum, exp) => sum + (exp.amount || 0), 0);

  const netProfit = totalSales - totalExpenses;

  // Open to Collect - Unpaid (Sent or Overdue)
  const unpaidInvoices = invoices.filter(inv =>
    inv.status === 'Sent' || inv.status === 'Overdue'
  );
  const unpaidTotal = unpaidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

  // Open to Collect - Partially Paid
  const partiallyPaidInvoices = invoices.filter(inv => inv.status === 'Partially Paid');
  const partiallyPaidRemaining = partiallyPaidInvoices.reduce((sum, inv) => {
    const remaining = (inv.total || 0) - (inv.amount_paid || 0);
    return sum + remaining;
  }, 0);

  // Total Open to Collect
  const totalOpenToCollect = unpaidTotal + partiallyPaidRemaining;

  // Job stats
  const totalJobs = filteredTests.length;
  const totalSamples = filteredTests.reduce((sum, test) => sum + (test.sample_count || 0), 0);
  const sampleCosts = filteredTests.reduce((sum, test) => sum + (test.lab_cost || 0), 0);

  // Expenses by category
  const expensesByCategory = useMemo(() => {
    const categories = {};
    filteredExpenses.forEach(exp => {
      const cat = exp.category || 'Other';
      if (!categories[cat]) categories[cat] = 0;
      categories[cat] += (exp.amount || 0);
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [filteredExpenses]);

  const categoryColors = {
    'Lab Fees': '#A78BFA',
    'Equipment': '#60A5FA',
    'Travel': '#34D399',
    'Marketing': '#F472B6',
    'Office Supplies': '#FBBF24',
    'Insurance': '#F87171',
    'Utilities': '#8B5CF6',
    'Salaries': '#10B981',
    'Other': '#94A3B8',
  };

  // Technician pay for the period
  const technicianPay = useMemo(() => {
    return technicians.map(tech => {
      const techTests = filteredTests.filter(test =>
        test.technician_name === tech.name ||
        test.assigned_technician_id === tech.id
      );

      const totalPay = techTests.reduce((sum, test) => {
        const basePay = test.technician_pay || 0;
        const adjustment = test.pay_adjustment_amount || 0;
        return sum + basePay + adjustment;
      }, 0);

      return {
        id: tech.id,
        name: tech.name,
        jobCount: techTests.length,
        totalPay,
        color: tech.color_code || 'Blue'
      };
    }).filter(t => t.jobCount > 0 || t.totalPay > 0);
  }, [technicians, filteredTests, timePeriod]);

  const totalTechPay = technicianPay.reduce((sum, t) => sum + t.totalPay, 0);

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

  const StatCard = ({ title, value, icon: Icon, color, subtitle, onClick }) => (
    <div
      className={`clay-card rounded-3xl p-6 relative overflow-hidden ${onClick ? 'cursor-pointer clay-card-hover' : ''}`}
      onClick={onClick}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full opacity-20 blur-3xl`}
           style={{ background: color }} />
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner`}
               style={{ background: `linear-gradient(145deg, ${color}50, ${color}30)` }}>
            <Icon className="w-7 h-7" style={{ color }} />
          </div>
        </div>
        <h3 className="text-gray-500 text-sm font-medium mb-1">{title}</h3>
        <p className="text-3xl font-bold text-gray-800">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );

  const formatDate = () => {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    if (timePeriod === "Daily") {
      return new Date().toLocaleDateString('en-US', options);
    } else if (timePeriod === "Weekly") {
      const start = dateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const end = dateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${start} - ${end}`;
    } else {
      return dateRange.start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="clay-card rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              Daily KPIs
            </h1>
            <p className="text-gray-500 mt-1 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              {formatDate()}
            </p>
          </div>

          {/* Time Period Toggle */}
          <div className="flex gap-2 clay-button rounded-2xl p-1">
            {['Daily', 'Weekly', 'Monthly'].map((period) => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                className={`px-6 py-2 rounded-xl font-medium transition-all ${
                  timePeriod === period
                    ? 'clay-nav-active text-emerald-700'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Financial KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Sales"
          value={`$${totalSales.toLocaleString()}`}
          icon={DollarSign}
          color="#10B981"
          subtitle={`${filteredInvoices.filter(i => i.status === 'Paid').length} paid invoices`}
        />
        <StatCard
          title="Total Expenses"
          value={`$${totalExpenses.toLocaleString()}`}
          icon={Wallet}
          color="#EF4444"
          subtitle={`${filteredExpenses.length} expenses`}
        />
        <StatCard
          title="Net Profit"
          value={`$${netProfit.toLocaleString()}`}
          icon={netProfit >= 0 ? TrendingUp : TrendingDown}
          color={netProfit >= 0 ? "#22C55E" : "#EF4444"}
          subtitle={netProfit >= 0 ? "Profitable" : "Loss"}
        />
        <StatCard
          title="Open to Collect"
          value={`$${totalOpenToCollect.toLocaleString()}`}
          icon={Receipt}
          color="#F59E0B"
          subtitle={`${unpaidInvoices.length + partiallyPaidInvoices.length} invoices`}
        />
      </div>

      {/* Open to Collect Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Unpaid</h3>
              <p className="text-sm text-gray-500">{unpaidInvoices.length} invoices</p>
            </div>
            <p className="ml-auto text-2xl font-bold text-orange-600">${unpaidTotal.toLocaleString()}</p>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {unpaidInvoices.slice(0, 5).map(inv => (
              <div
                key={inv.id}
                onClick={() => window.location.href = `${createPageUrl('Invoices')}`}
                className="clay-button rounded-xl p-3 cursor-pointer hover:scale-[1.01] transition-transform flex justify-between items-center"
              >
                <div>
                  <p className="font-medium text-gray-700 text-sm">{inv.invoice_number}</p>
                  <p className="text-xs text-gray-500">{inv.client_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800">${(inv.total || 0).toLocaleString()}</p>
                  <Badge className={`${inv.status === 'Overdue' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'} text-xs`}>
                    {inv.status}
                  </Badge>
                </div>
              </div>
            ))}
            {unpaidInvoices.length === 0 && (
              <div className="text-center py-4">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No unpaid invoices</p>
              </div>
            )}
          </div>
        </div>

        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Partially Paid</h3>
              <p className="text-sm text-gray-500">{partiallyPaidInvoices.length} invoices</p>
            </div>
            <p className="ml-auto text-2xl font-bold text-yellow-600">${partiallyPaidRemaining.toLocaleString()}</p>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {partiallyPaidInvoices.slice(0, 5).map(inv => {
              const remaining = (inv.total || 0) - (inv.amount_paid || 0);
              return (
                <div
                  key={inv.id}
                  onClick={() => window.location.href = `${createPageUrl('Invoices')}`}
                  className="clay-button rounded-xl p-3 cursor-pointer hover:scale-[1.01] transition-transform flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium text-gray-700 text-sm">{inv.invoice_number}</p>
                    <p className="text-xs text-gray-500">{inv.client_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800">${remaining.toLocaleString()}</p>
                    <p className="text-xs text-green-600">Paid: ${(inv.amount_paid || 0).toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
            {partiallyPaidInvoices.length === 0 && (
              <div className="text-center py-4">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No partially paid invoices</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Job & Sample Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Total Jobs"
          value={totalJobs}
          icon={FlaskConical}
          color="#A78BFA"
          subtitle={`This ${timePeriod.toLowerCase()}`}
        />
        <StatCard
          title="Total Samples"
          value={totalSamples}
          icon={FlaskConical}
          color="#60A5FA"
          subtitle="Across all jobs"
        />
        <StatCard
          title="Sample Costs"
          value={`$${sampleCosts.toLocaleString()}`}
          icon={Wallet}
          color="#F472B6"
          subtitle="Lab fees"
        />
      </div>

      {/* Expenses by Category & Technician Pay */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses by Category */}
        <div className="clay-card rounded-3xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Expenses by Category</h3>
          {expensesByCategory.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expensesByCategory.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={categoryColors[entry.name] || '#94A3B8'}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {expensesByCategory.map((item) => (
                  <div key={item.name} className="flex items-center justify-between clay-button rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: categoryColors[item.name] || '#94A3B8' }}
                      />
                      <span className="text-xs text-gray-600">{item.name}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-700">${item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No expenses this {timePeriod.toLowerCase()}</p>
            </div>
          )}
        </div>

        {/* Technician Pay */}
        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">Technician Pay</h3>
            <p className="text-lg font-bold text-purple-600">${totalTechPay.toLocaleString()}</p>
          </div>

          {technicianPay.length > 0 ? (
            <div className="space-y-3">
              {technicianPay.map(tech => (
                <div
                  key={tech.id}
                  onClick={() => window.location.href = `${createPageUrl('TechnicianProfile')}?id=${tech.id}`}
                  className="clay-button rounded-2xl p-4 cursor-pointer hover:scale-[1.01] transition-transform"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[tech.color] || 'from-blue-400 to-blue-500'} flex items-center justify-center`}>
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-700">{tech.name}</p>
                        <p className="text-xs text-gray-500">{tech.jobCount} jobs</p>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-gray-800">${tech.totalPay.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No technician pay this {timePeriod.toLowerCase()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Sales Trend (for Weekly/Monthly view) */}
      {timePeriod !== "Daily" && (
        <div className="clay-card rounded-3xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            {timePeriod === "Weekly" ? "Daily" : "Weekly"} Sales Trend
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={
              timePeriod === "Weekly"
                ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => {
                    const dayInvoices = filteredInvoices.filter(inv => {
                      const invDate = new Date(inv.created_date || inv.issue_date);
                      return invDate.getDay() === idx && inv.status === 'Paid';
                    });
                    return {
                      name: day,
                      sales: dayInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
                    };
                  })
                : [1, 2, 3, 4].map(week => {
                    const weekStart = new Date(dateRange.start);
                    weekStart.setDate(weekStart.getDate() + (week - 1) * 7);
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekEnd.getDate() + 6);

                    const weekInvoices = filteredInvoices.filter(inv => {
                      const invDate = new Date(inv.created_date || inv.issue_date);
                      return invDate >= weekStart && invDate <= weekEnd && inv.status === 'Paid';
                    });
                    return {
                      name: `Week ${week}`,
                      sales: weekInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0)
                    };
                  })
            }>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              <Bar dataKey="sales" fill="#10B981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
