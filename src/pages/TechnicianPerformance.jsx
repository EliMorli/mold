import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, Award, Clock, CheckCircle, Star, Users, FlaskConical, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

export default function TechnicianPerformancePage() {
  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list('-created_date'),
    initialData: [],
  });

  const { data: tests = [] } = useQuery({
    queryKey: ['tests'],
    queryFn: () => base44.entities.Test.list(),
    initialData: [],
  });

  // Calculate performance metrics for each technician
  const techPerformance = technicians.map(tech => {
    const techTests = tests.filter(t => t.technician_id === tech.id);
    const completedTests = techTests.filter(t => t.status === 'Completed');
    const scheduledTests = techTests.filter(t => t.status === 'Scheduled');
    const inProgressTests = techTests.filter(t => t.status === 'In Progress');

    return {
      ...tech,
      totalTests: techTests.length,
      completedTests: completedTests.length,
      scheduledTests: scheduledTests.length,
      inProgressTests: inProgressTests.length,
      completionRate: techTests.length > 0
        ? Math.round((completedTests.length / techTests.length) * 100)
        : 0,
    };
  }).sort((a, b) => b.completedTests - a.completedTests);

  // Overall stats
  const totalCompleted = tests.filter(t => t.status === 'Completed').length;
  const totalScheduled = tests.filter(t => t.status === 'Scheduled').length;
  const activeTechnicians = technicians.filter(t => t.status === 'Active').length;

  // Chart data
  const chartData = techPerformance.slice(0, 10).map(tech => ({
    name: tech.name?.split(' ')[0] || 'Unknown',
    completed: tech.completedTests,
    scheduled: tech.scheduledTests,
    inProgress: tech.inProgressTests,
  }));

  const statusDistribution = [
    { name: 'Completed', value: totalCompleted, color: '#10B981' },
    { name: 'In Progress', value: tests.filter(t => t.status === 'In Progress').length, color: '#A78BFA' },
    { name: 'Scheduled', value: totalScheduled, color: '#60A5FA' },
    { name: 'Lab Analysis', value: tests.filter(t => t.status === 'Lab Analysis').length, color: '#F59E0B' },
  ].filter(d => d.value > 0);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="clay-card rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-pink-500 bg-clip-text text-transparent">
              Technician Performance
            </h1>
            <p className="text-gray-500 mt-1">Track and analyze technician productivity</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center shadow-inner">
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed Tests</p>
              <p className="text-3xl font-bold text-gray-800">{totalCompleted}</p>
            </div>
          </div>
        </div>

        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center shadow-inner">
              <Clock className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Scheduled</p>
              <p className="text-3xl font-bold text-gray-800">{totalScheduled}</p>
            </div>
          </div>
        </div>

        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center shadow-inner">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Technicians</p>
              <p className="text-3xl font-bold text-gray-800">{activeTechnicians}</p>
            </div>
          </div>
        </div>

        <div className="clay-card rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center shadow-inner">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg Completion Rate</p>
              <p className="text-3xl font-bold text-gray-800">
                {techPerformance.length > 0
                  ? Math.round(techPerformance.reduce((sum, t) => sum + t.completionRate, 0) / techPerformance.length)
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Bar Chart */}
        <div className="clay-card rounded-3xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Tests by Technician</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" stroke="#9CA3AF" />
                <YAxis dataKey="name" type="category" stroke="#9CA3AF" width={80} />
                <Tooltip />
                <Bar dataKey="completed" fill="#10B981" name="Completed" radius={[0, 4, 4, 0]} />
                <Bar dataKey="inProgress" fill="#A78BFA" name="In Progress" radius={[0, 4, 4, 0]} />
                <Bar dataKey="scheduled" fill="#60A5FA" name="Scheduled" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-12">
              <FlaskConical className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No test data available</p>
            </div>
          )}
        </div>

        {/* Status Distribution */}
        <div className="clay-card rounded-3xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Test Status Distribution</h3>
          {statusDistribution.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {statusDistribution.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                    <span className="text-xs text-gray-600">{item.name}: {item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <FlaskConical className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No test data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Technician Leaderboard */}
      <div className="clay-card rounded-3xl p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Technician Leaderboard</h3>
        <div className="space-y-4">
          {techPerformance.map((tech, index) => (
            <div
              key={tech.id}
              onClick={() => window.location.href = `${createPageUrl('TechnicianProfile')}?id=${tech.id}`}
              className="clay-button rounded-2xl p-4 cursor-pointer hover:scale-[1.01] transition-transform"
            >
              <div className="flex items-center gap-4">
                {/* Rank */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                  index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white' :
                  index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                  index === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-400 text-white' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {index + 1}
                </div>

                {/* Avatar */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorMap[tech.color_code] || 'from-purple-400 to-blue-400'} flex items-center justify-center shadow-inner`}>
                  <span className="text-white font-bold">{tech.name?.[0]?.toUpperCase() || 'T'}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-gray-800">{tech.name}</h4>
                    {index < 3 && <Award className="w-4 h-4 text-yellow-500" />}
                  </div>
                  <p className="text-sm text-gray-500">{tech.permission_level}</p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-800">{tech.completedTests}</p>
                    <p className="text-xs text-gray-500">Completed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{tech.inProgressTests}</p>
                    <p className="text-xs text-gray-500">In Progress</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{tech.scheduledTests}</p>
                    <p className="text-xs text-gray-500">Scheduled</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="text-lg font-bold text-gray-800">{tech.rating || 5.0}</span>
                    </div>
                    <p className="text-xs text-gray-500">Rating</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {techPerformance.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">No technicians found</h3>
            <p className="text-gray-500">Add technicians to see performance metrics</p>
          </div>
        )}
      </div>
    </div>
  );
}
