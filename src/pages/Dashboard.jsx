import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  FlaskConical,
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  Calendar as CalendarIcon,
  FileText,
  Receipt,
  MapPin,
  User as UserIcon,
  RefreshCw,
  Download,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Wrench,
  BarChart3,
  List,
  LayoutDashboard,
  Check
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("kpis");
  const [activeFilter, setActiveFilter] = useState("All Active");
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [timePeriod, setTimePeriod] = useState("Daily");
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: tests = [], isLoading, refetch: refetchTests } = useQuery({
    queryKey: ['tests'],
    queryFn: () => base44.entities.Test.list('-scheduled_date'),
    initialData: [],
  });

  const { data: clients = [], refetch: refetchClients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    initialData: [],
  });

  const { data: invoices = [], refetch: refetchInvoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
    initialData: [],
  });

  const { data: expenses = [], refetch: refetchExpenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
    initialData: [],
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list(),
    initialData: [],
  });

  const handleRefresh = async () => {
    await Promise.all([
      refetchTests(),
      refetchClients(),
      refetchInvoices(),
      refetchExpenses()
    ]);
    setLastRefresh(new Date());
  };

  // ============ OVERVIEW TAB CALCULATIONS ============
  const activeTests = tests.filter(t => t.status === 'In Progress' || t.status === 'Scheduled').length;
  const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalExpensesAll = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const netProfit = totalRevenue - totalExpensesAll;

  const initialTests = tests.filter(t => t.test_category === 'Initial' && (t.status === 'Scheduled' || t.status === 'In Progress')).length;
  const clearanceTests = tests.filter(t => t.test_category === 'Clearance' && (t.status === 'Scheduled' || t.status === 'In Progress')).length;
  const completedNotSent = tests.filter(t => t.status === 'Completed' && !t.recommendation_pdf_url).length;
  const uninvoicedTests = tests.filter(t => {
    const hasInvoice = invoices.some(inv => inv.test_id === t.id);
    return !hasInvoice && (t.status === 'Completed' || t.status === 'Lab Analysis');
  }).length;
  const unpaidInvoicesCount = invoices.filter(i => i.status === 'Sent' || i.status === 'Overdue').length;

  const getFilteredTests = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let filtered = tests.filter(t =>
      t.status === 'Scheduled' ||
      t.status === 'In Progress' ||
      t.status === 'Lab Analysis' ||
      (t.status === 'Completed' && !t.recommendation_pdf_url)
    );

    if (activeFilter === "Today") {
      filtered = filtered.filter(t => {
        if (!t.scheduled_date) return false;
        const testDate = new Date(t.scheduled_date);
        return testDate >= today && testDate < tomorrow;
      });
    } else if (activeFilter === "Initial") {
      filtered = filtered.filter(t => t.test_category === 'Initial');
    } else if (activeFilter === "Clearance") {
      filtered = filtered.filter(t => t.test_category === 'Clearance');
    } else if (activeFilter === "Not Sent") {
      filtered = tests.filter(t => t.status === 'Completed' && !t.recommendation_pdf_url);
    } else if (activeFilter === "Uninvoiced") {
      filtered = tests.filter(t => {
        const hasInvoice = invoices.some(inv => inv.test_id === t.id);
        return !hasInvoice && (t.status === 'Completed' || t.status === 'Lab Analysis');
      });
    } else if (activeFilter === "Unpaid") {
      filtered = tests.filter(t => {
        const testInvoice = invoices.find(inv => inv.test_id === t.id);
        return testInvoice && testInvoice.status !== 'Paid';
      });
    }

    return filtered.slice(0, 20);
  };

  const filteredTests = getFilteredTests();

  // ============ KPIs TAB CALCULATIONS ============
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

  const filteredInvoicesKPI = useMemo(() => {
    return invoices.filter(inv => {
      const invDate = new Date(inv.created_date || inv.issue_date);
      return invDate >= dateRange.start && invDate <= dateRange.end;
    });
  }, [invoices, timePeriod]);

  const filteredExpensesKPI = useMemo(() => {
    return expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate >= dateRange.start && expDate <= dateRange.end;
    });
  }, [expenses, timePeriod]);

  const filteredTestsKPI = useMemo(() => {
    return tests.filter(test => {
      const testDate = new Date(test.scheduled_date || test.created_date);
      return testDate >= dateRange.start && testDate <= dateRange.end;
    });
  }, [tests, timePeriod]);

  const totalSalesKPI = filteredInvoicesKPI
    .filter(inv => inv.status === 'Paid')
    .reduce((sum, inv) => sum + (inv.total || 0), 0);

  const totalExpensesKPI = filteredExpensesKPI
    .reduce((sum, exp) => sum + (exp.amount || 0), 0);

  const netProfitKPI = totalSalesKPI - totalExpensesKPI;

  const unpaidInvoices = invoices.filter(inv =>
    inv.status === 'Sent' || inv.status === 'Overdue'
  );
  const unpaidTotal = unpaidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

  const partiallyPaidInvoices = invoices.filter(inv => inv.status === 'Partially Paid');
  const partiallyPaidRemaining = partiallyPaidInvoices.reduce((sum, inv) => {
    const remaining = (inv.total || 0) - (inv.amount_paid || 0);
    return sum + remaining;
  }, 0);

  const totalOpenToCollect = unpaidTotal + partiallyPaidRemaining;

  const technicianPay = useMemo(() => {
    return technicians.map(tech => {
      const techTests = filteredTestsKPI.filter(test =>
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
  }, [technicians, filteredTestsKPI, timePeriod]);

  const totalTechPay = technicianPay.reduce((sum, t) => sum + t.totalPay, 0);

  // ============ DAILY JOBS TAB CALCULATIONS ============
  const dailyJobs = useMemo(() => {
    const dateStart = new Date(selectedDate);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(selectedDate);
    dateEnd.setHours(23, 59, 59, 999);

    return tests.filter(test => {
      const testDate = new Date(test.scheduled_date);
      return testDate >= dateStart && testDate <= dateEnd;
    }).sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));
  }, [tests, selectedDate]);

  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction);
    setSelectedDate(newDate);
  };

  // ============ EXPORT FUNCTIONS ============
  const handleExportReport = (type) => {
    let data = [];
    let filename = '';
    let headers = '';

    if (type === 'jobs') {
      headers = "Test #,Category,Client,Address,Technician,Status,Date,In Reports,Out Reports\n";
      data = tests.map(t => [
        t.test_number,
        t.test_category,
        t.client_name,
        t.property_address,
        t.technician_name,
        t.status,
        t.scheduled_date ? new Date(t.scheduled_date).toLocaleDateString() : '',
        t.in_reports ? 'Yes' : 'No',
        t.out_reports ? 'Yes' : 'No'
      ]);
      filename = 'Jobs_Report';
    } else if (type === 'invoices') {
      headers = "Invoice #,Client,Amount,Status,Due Date,Paid Date\n";
      data = invoices.map(i => [
        i.invoice_number,
        i.client_name,
        i.total,
        i.status,
        i.due_date ? new Date(i.due_date).toLocaleDateString() : '',
        i.paid_date ? new Date(i.paid_date).toLocaleDateString() : ''
      ]);
      filename = 'Invoices_Report';
    } else if (type === 'expenses') {
      headers = "Description,Category,Amount,Date,Vendor\n";
      data = expenses.map(e => [
        e.description,
        e.category,
        e.amount,
        e.date ? new Date(e.date).toLocaleDateString() : '',
        e.vendor
      ]);
      filename = 'Expenses_Report';
    } else if (type === 'financials') {
      headers = "Metric,Amount\n";
      data = [
        ['Total Revenue', totalRevenue],
        ['Total Expenses', totalExpensesAll],
        ['Net Profit', netProfit],
        ['Open to Collect - Unpaid', unpaidTotal],
        ['Open to Collect - Partial', partiallyPaidRemaining]
      ];
      filename = 'Financial_Summary';
    }

    const rows = data.map(row => row.map(val => {
      const str = String(val || '');
      return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(',')).join('\n');

    const csv = headers + rows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  // ============ SHARED COMPONENTS ============
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

  const statusColors = {
    'Scheduled': 'bg-blue-100 text-blue-700 border-blue-200',
    'In Progress': 'bg-purple-100 text-purple-700 border-purple-200',
    'Lab Analysis': 'bg-orange-100 text-orange-700 border-orange-200',
    'Completed': 'bg-green-100 text-green-700 border-green-200',
  };

  const colorMap = {
    'Pink': 'from-pink-400 to-pink-500',
    'Blue': 'from-blue-400 to-blue-500',
    'Green': 'from-green-400 to-green-500',
    'Orange': 'from-orange-400 to-orange-500',
    'Purple': 'from-purple-400 to-purple-500',
  };

  const formatDateTime = (dateTime) => {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTestAlerts = (test) => {
    const alerts = [];
    if (!test.lab_report_url && test.status === 'Lab Analysis') {
      alerts.push('No Lab Report');
    }
    if (!test.recommendation_pdf_url && test.status === 'Completed') {
      alerts.push('Report Not Sent');
    }
    const testInvoice = invoices.find(inv => inv.test_id === test.id);
    if (!testInvoice && (test.status === 'Completed' || test.status === 'Lab Analysis')) {
      alerts.push('No Invoice');
    } else if (testInvoice && testInvoice.status !== 'Paid') {
      alerts.push('Unpaid');
    }
    return alerts;
  };

  const tabs = [
    { id: 'kpis', label: 'Overview', icon: BarChart3 },
    { id: 'daily', label: 'Daily Jobs', icon: List },
    { id: 'overview', label: 'Jobs', icon: LayoutDashboard },
    { id: 'reports', label: 'Reports', icon: Download },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="clay-card rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-gray-500 mt-1">Welcome back! Here's what needs your attention.</p>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-400">
              Last updated: {lastRefresh.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </p>
            <Button
              onClick={handleRefresh}
              disabled={isLoading}
              className="clay-button rounded-2xl px-4 py-2 flex items-center gap-2 font-semibold text-blue-600 hover:scale-105"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-2xl flex items-center gap-2 font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'clay-nav-active text-purple-700'
                  : 'clay-button text-gray-600 hover:scale-105'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ============ OVERVIEW TAB ============ */}
      {activeTab === 'overview' && (
        <>
          {/* Action Items KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard
              title="Initial Jobs"
              value={initialTests}
              icon={FlaskConical}
              color="#A78BFA"
              onClick={() => setActiveFilter("Initial")}
            />
            <StatCard
              title="Clearance Jobs"
              value={clearanceTests}
              icon={CheckCircle}
              color="#10B981"
              onClick={() => setActiveFilter("Clearance")}
            />
            <StatCard
              title="Not Sent"
              value={completedNotSent}
              icon={FileText}
              color="#F59E0B"
              onClick={() => setActiveFilter("Not Sent")}
            />
            <StatCard
              title="Uninvoiced"
              value={uninvoicedTests}
              icon={Receipt}
              color="#EF4444"
              onClick={() => setActiveFilter("Uninvoiced")}
            />
            <StatCard
              title="Unpaid"
              value={unpaidInvoicesCount}
              icon={DollarSign}
              color="#EC4899"
              onClick={() => setActiveFilter("Unpaid")}
            />
          </div>

          {/* Active Jobs Section */}
          <div className="clay-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Active Jobs</h2>
              <div className="flex gap-2 overflow-x-auto">
                {['All Active', 'Today', 'Initial', 'Clearance', 'Not Sent', 'Uninvoiced', 'Unpaid'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-4 py-2 rounded-xl whitespace-nowrap font-medium transition-all text-sm ${
                      activeFilter === filter
                        ? 'clay-nav-active text-purple-700'
                        : 'clay-button text-gray-600 hover:scale-105'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Showing <span className="font-bold text-gray-700">{filteredTests.length}</span> jobs
            </p>

            <div className="space-y-3">
              {filteredTests.map((test) => {
                const alerts = getTestAlerts(test);

                return (
                  <div
                    key={test.id}
                    onClick={() => window.location.href = `${createPageUrl('TestProfile')}?id=${test.id}`}
                    className="clay-button rounded-2xl p-4 cursor-pointer hover:scale-[1.01] transition-transform relative"
                  >
                    {alerts.length > 0 && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-red-500 text-white rounded-full px-2 py-0.5 text-xs flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {alerts.length}
                        </Badge>
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center shadow-inner flex-shrink-0">
                        <FlaskConical className="w-6 h-6 text-white" />
                      </div>

                      <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div>
                          <p className="font-bold text-gray-800 text-sm">{test.test_number}</p>
                          <p className="text-xs text-gray-500 truncate">{test.test_category}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <UserIcon className="w-3 h-3 text-purple-400 flex-shrink-0" />
                          <p className="text-sm text-gray-600 truncate">{test.client_name}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3 text-blue-400 flex-shrink-0" />
                          <p className="text-sm text-gray-600 truncate">{test.property_address}</p>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          {test.scheduled_date && (
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3 text-pink-400" />
                              <p className="text-xs text-gray-500">{formatDateTime(test.scheduled_date)}</p>
                            </div>
                          )}
                          <Badge className={`${statusColors[test.status]} border rounded-lg px-2 py-0.5 text-xs ml-auto`}>
                            {test.status}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {alerts.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200">
                        {alerts.map((alert, idx) => (
                          <Badge key={idx} className="bg-red-100 text-red-700 rounded-lg px-2 py-0.5 text-xs">
                            {alert}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredTests.length === 0 && (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-700 mb-2">All caught up!</h3>
                  <p className="text-gray-500">No jobs match this filter</p>
                </div>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Active Jobs"
              value={activeTests}
              icon={FlaskConical}
              color="#A78BFA"
            />
            <StatCard
              title="Total Clients"
              value={clients.length}
              icon={Users}
              color="#60A5FA"
            />
            <StatCard
              title="Revenue"
              value={`$${totalRevenue.toLocaleString()}`}
              icon={DollarSign}
              color="#34D399"
            />
            <StatCard
              title="Net Profit"
              value={`$${netProfit.toLocaleString()}`}
              icon={TrendingUp}
              color="#F472B6"
            />
          </div>
        </>
      )}

      {/* ============ KPIs TAB ============ */}
      {activeTab === 'kpis' && (
        <>
          {/* Time Period Toggle */}
          <div className="flex justify-end">
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

          {/* Main Financial KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Sales"
              value={`$${totalSalesKPI.toLocaleString()}`}
              icon={DollarSign}
              color="#10B981"
              subtitle={`${filteredInvoicesKPI.filter(i => i.status === 'Paid').length} paid invoices`}
            />
            <StatCard
              title="Total Expenses"
              value={`$${totalExpensesKPI.toLocaleString()}`}
              icon={Wallet}
              color="#EF4444"
              subtitle={`${filteredExpensesKPI.length} expenses`}
            />
            <StatCard
              title="Net Profit"
              value={`$${netProfitKPI.toLocaleString()}`}
              icon={netProfitKPI >= 0 ? TrendingUp : TrendingDown}
              color={netProfitKPI >= 0 ? "#22C55E" : "#EF4444"}
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
                  <div key={inv.id} className="clay-button rounded-xl p-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-700 text-sm">{inv.invoice_number}</p>
                      <p className="text-xs text-gray-500">{inv.client_name}</p>
                    </div>
                    <p className="font-bold text-gray-800">${(inv.total || 0).toLocaleString()}</p>
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
                    <div key={inv.id} className="clay-button rounded-xl p-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-700 text-sm">{inv.invoice_number}</p>
                        <p className="text-xs text-gray-500">{inv.client_name}</p>
                      </div>
                      <p className="font-bold text-gray-800">${remaining.toLocaleString()}</p>
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

          {/* Technician Pay */}
          <div className="clay-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Technician Pay</h3>
              <p className="text-lg font-bold text-purple-600">${totalTechPay.toLocaleString()}</p>
            </div>

            {technicianPay.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {technicianPay.map(tech => (
                  <div key={tech.id} className="clay-button rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[tech.color] || 'from-blue-400 to-blue-500'} flex items-center justify-center`}>
                          <Wrench className="w-5 h-5 text-white" />
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
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No technician pay this {timePeriod.toLowerCase()}</p>
              </div>
            )}
          </div>

          {/* Today's Schedule */}
          <div className="clay-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-purple-500" />
                Today's Schedule
              </h3>
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-100 text-purple-700 rounded-lg px-3 py-1">
                  {tests.filter(t => {
                    if (!t.scheduled_date) return false;
                    const testDate = new Date(t.scheduled_date);
                    const today = new Date();
                    return testDate.toDateString() === today.toDateString();
                  }).length} jobs today
                </Badge>
                <button
                  onClick={() => setActiveTab('daily')}
                  className="text-sm text-purple-600 font-medium hover:underline"
                >
                  View All →
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {tests
                .filter(t => {
                  if (!t.scheduled_date) return false;
                  const testDate = new Date(t.scheduled_date);
                  const today = new Date();
                  return testDate.toDateString() === today.toDateString();
                })
                .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
                .slice(0, 6)
                .map(test => {
                  const technician = technicians.find(t => t.id === test.technician_id);
                  return (
                    <div
                      key={test.id}
                      onClick={() => window.location.href = `${createPageUrl('TestProfile')}?id=${test.id}`}
                      className="clay-button rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:scale-[1.01] transition-transform"
                    >
                      <div className="text-center min-w-[60px]">
                        <p className="text-sm font-bold text-purple-600">
                          {new Date(test.scheduled_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </p>
                      </div>
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorMap[technician?.color_code] || 'from-purple-400 to-purple-500'} flex items-center justify-center`}>
                        <FlaskConical className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm">{test.test_number}</p>
                        <p className="text-xs text-gray-500 truncate">{test.property_address}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={`${statusColors[test.status]} border rounded-lg px-2 py-0.5 text-xs`}>
                          {test.status}
                        </Badge>
                        {technician && (
                          <p className="text-xs text-gray-500 mt-1">{technician.name}</p>
                        )}
                      </div>
                    </div>
                  );
                })}

              {tests.filter(t => {
                if (!t.scheduled_date) return false;
                const testDate = new Date(t.scheduled_date);
                const today = new Date();
                return testDate.toDateString() === today.toDateString();
              }).length === 0 && (
                <div className="text-center py-6">
                  <CalendarIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No jobs scheduled for today</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ============ DAILY JOBS TAB ============ */}
      {activeTab === 'daily' && (
        <>
          {/* Date Navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 clay-card rounded-2xl p-2">
              <button
                onClick={() => navigateDate(-1)}
                className="clay-button rounded-xl p-2 hover:scale-110 transition-transform"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>

              <button
                onClick={() => setSelectedDate(new Date())}
                className="clay-button rounded-xl px-4 py-2 text-sm font-medium text-purple-600 hover:scale-105"
              >
                Today
              </button>

              <div className="flex items-center gap-2 px-4">
                <CalendarIcon className="w-5 h-5 text-purple-500" />
                <span className="font-semibold text-gray-700 min-w-[200px] text-center">
                  {formatDate(selectedDate)}
                </span>
              </div>

              <button
                onClick={() => navigateDate(1)}
                className="clay-button rounded-xl p-2 hover:scale-110 transition-transform"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <Button
              onClick={() => handleExportReport('jobs')}
              className="clay-button rounded-2xl px-4 py-2 flex items-center gap-2 font-semibold text-blue-600 hover:scale-105"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>

          {/* Daily Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Total Jobs"
              value={dailyJobs.length}
              icon={FlaskConical}
              color="#A78BFA"
            />
            <StatCard
              title="Completed"
              value={dailyJobs.filter(j => j.status === 'Completed').length}
              icon={CheckCircle}
              color="#10B981"
            />
            <StatCard
              title="Total Samples"
              value={dailyJobs.reduce((sum, j) => sum + (j.sample_count || j.number_of_tests || 0), 0)}
              icon={FlaskConical}
              color="#60A5FA"
            />
            <StatCard
              title="Tech Pay"
              value={`$${dailyJobs.reduce((sum, j) => sum + (j.technician_pay || 0) + (j.pay_adjustment_amount || 0), 0).toLocaleString()}`}
              icon={DollarSign}
              color="#22C55E"
            />
          </div>

          {/* Jobs Table */}
          <div className="clay-card rounded-3xl p-6 overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Time</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Job #</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Client</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Address</th>
                  <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Tech</th>
                  <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase">In</th>
                  <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Out</th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Pay</th>
                </tr>
              </thead>
              <tbody>
                {dailyJobs.map((job) => (
                  <tr
                    key={job.id}
                    onClick={() => window.location.href = `${createPageUrl('TestProfile')}?id=${job.id}`}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-2 text-sm font-medium text-gray-700">{formatTime(job.scheduled_date)}</td>
                    <td className="py-3 px-2 text-sm font-bold text-purple-600">{job.test_number}</td>
                    <td className="py-3 px-2 text-sm text-gray-700">{job.client_name}</td>
                    <td className="py-3 px-2 text-sm text-gray-600 truncate max-w-[200px]">{job.property_address}</td>
                    <td className="py-3 px-2 text-sm text-gray-700">{job.technician_name || '-'}</td>
                    <td className="py-3 px-2 text-center">
                      <Badge className={`${statusColors[job.status]} border rounded-lg px-2 py-0.5 text-xs`}>
                        {job.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-center">
                      {job.in_reports ? (
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 mx-auto" />
                      )}
                    </td>
                    <td className="py-3 px-2 text-center">
                      {job.out_reports ? (
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 mx-auto" />
                      )}
                    </td>
                    <td className="py-3 px-2 text-right text-sm font-bold text-emerald-600">
                      ${((job.technician_pay || 0) + (job.pay_adjustment_amount || 0)).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {dailyJobs.length === 0 && (
              <div className="text-center py-12">
                <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-700 mb-2">No jobs scheduled</h3>
                <p className="text-gray-500">No jobs for {formatDate(selectedDate)}</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ============ REPORTS TAB ============ */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div
            onClick={() => handleExportReport('jobs')}
            className="clay-card clay-card-hover rounded-3xl p-8 cursor-pointer text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center mx-auto mb-4">
              <FlaskConical className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Jobs Report</h3>
            <p className="text-sm text-gray-500">Export all jobs with status, technician, and tracking info</p>
            <Button className="clay-button rounded-2xl px-6 py-2 mt-4 font-semibold text-purple-600">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <div
            onClick={() => handleExportReport('invoices')}
            className="clay-card clay-card-hover rounded-3xl p-8 cursor-pointer text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center mx-auto mb-4">
              <Receipt className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Invoices Report</h3>
            <p className="text-sm text-gray-500">Export all invoices with amounts and payment status</p>
            <Button className="clay-button rounded-2xl px-6 py-2 mt-4 font-semibold text-green-600">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <div
            onClick={() => handleExportReport('expenses')}
            className="clay-card clay-card-hover rounded-3xl p-8 cursor-pointer text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-400 to-pink-400 flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Expenses Report</h3>
            <p className="text-sm text-gray-500">Export all expenses by category and vendor</p>
            <Button className="clay-button rounded-2xl px-6 py-2 mt-4 font-semibold text-red-600">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          <div
            onClick={() => handleExportReport('financials')}
            className="clay-card clay-card-hover rounded-3xl p-8 cursor-pointer text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Financial Summary</h3>
            <p className="text-sm text-gray-500">Export revenue, expenses, profit, and collections</p>
            <Button className="clay-button rounded-2xl px-6 py-2 mt-4 font-semibold text-blue-600">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
