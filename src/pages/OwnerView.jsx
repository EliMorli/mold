import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Crown, TrendingUp, Users, FlaskConical, DollarSign, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function OwnerViewPage() {
  const { data: tests = [] } = useQuery({
    queryKey: ['tests'],
    queryFn: () => base44.entities.Test.list(),
    initialData: [],
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => base44.entities.Client.list(),
    initialData: [],
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
    initialData: [],
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => base44.entities.Expense.list(),
    initialData: [],
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list(),
    initialData: [],
  });

  const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

  const completionRate = tests.length > 0 
    ? ((tests.filter(t => t.status === 'Completed').length / tests.length) * 100).toFixed(1)
    : 0;

  const avgRevenuePerTest = tests.length > 0 ? Math.round(totalRevenue / tests.length) : 0;

  // Monthly performance data
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const month = new Date();
    month.setMonth(month.getMonth() - (5 - i));
    const monthStr = month.toLocaleDateString('en-US', { month: 'short' });
    
    const revenue = invoices
      .filter(inv => {
        const invDate = new Date(inv.created_date);
        return invDate.getMonth() === month.getMonth() && invDate.getFullYear() === month.getFullYear() && inv.status === 'Paid';
      })
      .reduce((sum, inv) => sum + (inv.total || 0), 0);
      
    const monthExpenses = expenses
      .filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getMonth() === month.getMonth() && expDate.getFullYear() === month.getFullYear();
      })
      .reduce((sum, exp) => sum + (exp.amount || 0), 0);
      
    return { month: monthStr, revenue, expenses: monthExpenses, profit: revenue - monthExpenses };
  });

  // Top clients
  const topClients = clients
    .sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0))
    .slice(0, 5);

  // Performance alerts
  const alerts = [
    { type: 'warning', message: '3 invoices overdue - requires attention', count: invoices.filter(i => i.status === 'Overdue').length },
    { type: 'info', message: '5 tests pending lab analysis', count: tests.filter(t => t.status === 'Lab Analysis').length },
    { type: 'success', message: `${completionRate}% test completion rate this month` },
  ].filter(a => a.count === undefined || a.count > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="clay-card rounded-3xl p-8 bg-gradient-to-br from-yellow-50 to-orange-50">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center shadow-lg">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
              Owner's Dashboard
            </h1>
            <p className="text-gray-600 mt-1">Executive overview and key business metrics</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center shadow-inner">
              <DollarSign className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Net Profit</p>
              <p className="text-2xl font-bold text-gray-800">${netProfit.toLocaleString()}</p>
              <p className="text-xs text-green-600 mt-1 font-medium">Margin: {profitMargin}%</p>
            </div>
          </div>
        </div>

        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center shadow-inner">
              <FlaskConical className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Tests</p>
              <p className="text-2xl font-bold text-gray-800">{tests.length}</p>
              <p className="text-xs text-gray-600 mt-1">{completionRate}% completed</p>
            </div>
          </div>
        </div>

        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center shadow-inner">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Clients</p>
              <p className="text-2xl font-bold text-gray-800">{clients.filter(c => c.status === 'Active').length}</p>
              <p className="text-xs text-gray-600 mt-1">of {clients.length} total</p>
            </div>
          </div>
        </div>

        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center shadow-inner">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg Revenue/Test</p>
              <p className="text-2xl font-bold text-gray-800">${avgRevenuePerTest}</p>
              <p className="text-xs text-green-600 mt-1 font-medium">+8% vs last month</p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="clay-card rounded-3xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Financial Performance (6 Months)</h3>
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

        <div className="clay-card rounded-3xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Top 5 Clients by Revenue</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topClients} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis type="number" stroke="#9CA3AF" />
              <YAxis dataKey="name" type="category" stroke="#9CA3AF" width={100} />
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              <Bar dataKey="total_spent" fill="#F59E0B" radius={[0, 10, 10, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerts & Team Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="clay-card rounded-3xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Performance Alerts</h3>
          <div className="space-y-3">
            {alerts.map((alert, idx) => (
              <div key={idx} className="clay-button rounded-2xl p-4 flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  alert.type === 'warning' ? 'bg-orange-100' :
                  alert.type === 'success' ? 'bg-green-100' : 'bg-blue-100'
                }`}>
                  <AlertCircle className={`w-5 h-5 ${
                    alert.type === 'warning' ? 'text-orange-600' :
                    alert.type === 'success' ? 'text-green-600' : 'text-blue-600'
                  }`} />
                </div>
                <p className="text-sm text-gray-700 flex-1">{alert.message}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="clay-card rounded-3xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Team Performance</h3>
          <div className="space-y-3">
            {technicians.slice(0, 5).map((tech) => (
              <div key={tech.id} className="clay-button rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center shadow-inner">
                    <span className="text-white font-bold text-sm">{tech.name[0]}</span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{tech.name}</p>
                    <p className="text-xs text-gray-500">{tech.completed_tests || 0} tests completed</p>
                  </div>
                </div>
                <Badge className="bg-yellow-100 text-yellow-700 rounded-xl px-3 py-1">
                  ⭐ {tech.rating || 5.0}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}