import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  FlaskConical, 
  Users, 
  TrendingUp, 
  DollarSign,
  AlertCircle,
  CheckCircle,
  Calendar as CalendarIcon,
  FileText,
  Receipt,
  MapPin,
  User as UserIcon,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

export default function Dashboard() {
  const [activeFilter, setActiveFilter] = useState("All Active");
  const [lastRefresh, setLastRefresh] = useState(new Date());

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

  const handleRefresh = async () => {
    await Promise.all([
      refetchTests(),
      refetchClients(),
      refetchInvoices(),
      refetchExpenses()
    ]);
    setLastRefresh(new Date());
  };

  // Calculate stats
  const activeTests = tests.filter(t => t.status === 'In Progress' || t.status === 'Scheduled').length;
  const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  // Action items KPIs
  const initialTests = tests.filter(t => t.test_category === 'Initial' && (t.status === 'Scheduled' || t.status === 'In Progress')).length;
  const clearanceTests = tests.filter(t => t.test_category === 'Clearance' && (t.status === 'Scheduled' || t.status === 'In Progress')).length;
  const completedNotSent = tests.filter(t => t.status === 'Completed' && !t.recommendation_pdf_url).length;
  const uninvoicedTests = tests.filter(t => {
    const hasInvoice = invoices.some(inv => inv.test_id === t.id);
    return !hasInvoice && (t.status === 'Completed' || t.status === 'Lab Analysis');
  }).length;
  const unpaidInvoices = invoices.filter(i => i.status === 'Sent' || i.status === 'Overdue').length;

  // Get today's and active tests based on filter
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

  // Test status distribution
  const statusData = [
    { name: 'Scheduled', value: tests.filter(t => t.status === 'Scheduled').length, color: '#A7C7E7' },
    { name: 'In Progress', value: tests.filter(t => t.status === 'In Progress').length, color: '#FFB6C1' },
    { name: 'Lab Analysis', value: tests.filter(t => t.status === 'Lab Analysis').length, color: '#DDA0DD' },
    { name: 'Completed', value: tests.filter(t => t.status === 'Completed').length, color: '#98D8C8' },
  ].filter(d => d.value > 0);

  // Monthly revenue trend - REAL DATA from last 6 months
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const month = new Date();
    month.setMonth(month.getMonth() - (5 - i));
    const monthStr = month.toLocaleDateString('en-US', { month: 'short' });

    const revenue = invoices
      .filter((inv) => {
        if (!inv.paid_date || inv.status !== 'Paid') return false;
        const invDate = new Date(inv.paid_date);
        return invDate.getMonth() === month.getMonth() && invDate.getFullYear() === month.getFullYear();
      })
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    return { month: monthStr, revenue };
  });

  const StatCard = ({ title, value, icon: Icon, color, trend, onClick }) => (
    <div 
      className={`clay-card clay-card-hover rounded-3xl p-6 relative overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
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
          {trend && (
            <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
              trend > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            }`}>
              <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <h3 className="text-gray-500 text-sm font-medium mb-1">{title}</h3>
        <p className="text-3xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );

  const statusColors = {
    'Scheduled': 'bg-blue-100 text-blue-700 border-blue-200',
    'In Progress': 'bg-purple-100 text-purple-700 border-purple-200',
    'Lab Analysis': 'bg-orange-100 text-orange-700 border-orange-200',
    'Completed': 'bg-green-100 text-green-700 border-green-200',
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="clay-card rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
              Dashboard Overview
            </h1>
            <p className="text-gray-500 mt-2">Welcome back! Here&apos;s what needs your attention today.</p>
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
      </div>

      {/* Action Items KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard 
          title="Initial Tests" 
          value={initialTests} 
          icon={FlaskConical} 
          color="#A78BFA"
          onClick={() => setActiveFilter("Initial")}
        />
        <StatCard 
          title="Clearance Tests" 
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
          value={unpaidInvoices} 
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
          title="Active Tests" 
          value={activeTests} 
          icon={FlaskConical} 
          color="#A78BFA"
          trend={12}
        />
        <StatCard 
          title="Total Clients" 
          value={clients.length} 
          icon={Users} 
          color="#60A5FA"
          trend={8}
        />
        <StatCard 
          title="Revenue" 
          value={`$${totalRevenue.toLocaleString()}`} 
          icon={DollarSign} 
          color="#34D399"
          trend={15}
        />
        <StatCard 
          title="Net Profit" 
          value={`$${netProfit.toLocaleString()}`} 
          icon={TrendingUp} 
          color="#F472B6"
          trend={18}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Test Status Distribution */}
        <div className="clay-card rounded-3xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Test Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {statusData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                <span className="text-xs text-gray-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Trend */}
        <div className="clay-card rounded-3xl p-6 lg:col-span-2">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#A78BFA" 
                strokeWidth={3}
                dot={{ fill: '#A78BFA', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}