import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  FlaskConical,
  User,
  MapPin,
  Wrench,
  Check,
  X,
  DollarSign,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createPageUrl } from "@/utils";

export default function DailyJobView() {
  const [selectedDate, setSelectedDate] = useState(new Date());

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

  // Get jobs for the selected date
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

  // Group jobs by technician
  const jobsByTechnician = useMemo(() => {
    const grouped = {};
    dailyJobs.forEach(job => {
      const techName = job.technician_name || 'Unassigned';
      if (!grouped[techName]) {
        grouped[techName] = [];
      }
      grouped[techName].push(job);
    });
    return grouped;
  }, [dailyJobs]);

  // Calculate daily totals
  const totalTechPay = dailyJobs.reduce((sum, job) => {
    const basePay = job.technician_pay || 0;
    const adjustment = job.pay_adjustment_amount || 0;
    return sum + basePay + adjustment;
  }, 0);

  const totalSamples = dailyJobs.reduce((sum, job) => sum + (job.sample_count || job.number_of_tests || 0), 0);

  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
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

  const statusColors = {
    'Scheduled': 'bg-blue-100 text-blue-700 border-blue-200',
    'In Progress': 'bg-purple-100 text-purple-700 border-purple-200',
    'Lab Analysis': 'bg-orange-100 text-orange-700 border-orange-200',
    'Completed': 'bg-green-100 text-green-700 border-green-200',
  };

  const handleExportCSV = () => {
    const headers = "Date,Time,Test #,Category,Client,Address,Technician,Status,In Reports,Out Reports,Tech Pay,Samples\n";

    const rows = dailyJobs.map(job => {
      return [
        new Date(job.scheduled_date).toLocaleDateString(),
        formatTime(job.scheduled_date),
        job.test_number || '',
        job.test_category || '',
        job.client_name || '',
        job.property_address || '',
        job.technician_name || '',
        job.status || '',
        job.in_reports ? 'Yes' : 'No',
        job.out_reports ? 'Yes' : 'No',
        (job.technician_pay || 0) + (job.pay_adjustment_amount || 0),
        job.sample_count || job.number_of_tests || 0
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
    a.download = `Daily_Jobs_${selectedDate.toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header with Date Navigation */}
      <div className="clay-card rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-500 bg-clip-text text-transparent">
              Daily Job View
            </h1>
            <p className="text-gray-500 mt-1">{dailyJobs.length} jobs scheduled</p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={handleExportCSV}
              disabled={dailyJobs.length === 0}
              className="clay-button rounded-2xl px-4 py-2 flex items-center gap-2 font-semibold text-blue-600 hover:scale-105"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>

            <div className="flex items-center gap-2 clay-card rounded-2xl p-2">
              <button
                onClick={() => navigateDate(-1)}
                className="clay-button rounded-xl p-2 hover:scale-110 transition-transform"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>

              <button
                onClick={goToToday}
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
          </div>
        </div>
      </div>

      {/* Daily Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="clay-card rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Jobs</p>
              <p className="text-2xl font-bold text-gray-800">{dailyJobs.length}</p>
            </div>
          </div>
        </div>

        <div className="clay-card rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center">
              <Check className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-gray-800">
                {dailyJobs.filter(j => j.status === 'Completed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="clay-card rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Samples</p>
              <p className="text-2xl font-bold text-gray-800">{totalSamples}</p>
            </div>
          </div>
        </div>

        <div className="clay-card rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tech Pay Total</p>
              <p className="text-2xl font-bold text-emerald-600">${totalTechPay.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="clay-card rounded-3xl p-6 overflow-x-auto">
        <table className="w-full min-w-[1100px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Time</th>
              <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Test #</th>
              <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Category</th>
              <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Client</th>
              <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Address</th>
              <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Technician</th>
              <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase">In Reports</th>
              <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Out Reports</th>
              <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase">Tech Pay</th>
            </tr>
          </thead>
          <tbody>
            {dailyJobs.map((job) => {
              const tech = technicians.find(t => t.name === job.technician_name || t.id === job.technician_id);
              const techColor = tech?.color_code || 'Blue';
              const techPay = (job.technician_pay || 0) + (job.pay_adjustment_amount || 0);

              return (
                <tr
                  key={job.id}
                  onClick={() => window.location.href = `${createPageUrl('TestProfile')}?id=${job.id}`}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-2">
                    <span className="text-sm font-medium text-gray-700">
                      {formatTime(job.scheduled_date)}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className="text-sm font-bold text-purple-600">{job.test_number}</span>
                  </td>
                  <td className="py-3 px-2">
                    <Badge className={`${job.test_category === 'Initial' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'} rounded-lg px-2 py-0.5 text-xs`}>
                      {job.test_category}
                    </Badge>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3 text-gray-400" />
                      <span className="text-sm text-gray-700">{job.client_name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2 max-w-[200px]">
                      <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-600 truncate">{job.property_address}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${colorMap[techColor]} flex items-center justify-center`}>
                        <Wrench className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm text-gray-700">{job.technician_name || '-'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <Badge className={`${statusColors[job.status]} border rounded-lg px-2 py-0.5 text-xs`}>
                      {job.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-2 text-center">
                    {job.in_reports ? (
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                        <Check className="w-4 h-4 text-green-600" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-gray-300 mx-auto" />
                    )}
                  </td>
                  <td className="py-3 px-2 text-center">
                    {job.out_reports ? (
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                        <Check className="w-4 h-4 text-green-600" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-gray-300 mx-auto" />
                    )}
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className={`text-sm font-bold ${techPay > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {techPay > 0 ? `$${techPay.toLocaleString()}` : '-'}
                    </span>
                    {job.pay_adjustment_type && job.pay_adjustment_type !== 'None' && (
                      <span className="text-xs text-orange-500 block">{job.pay_adjustment_type}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {dailyJobs.length === 0 && (
          <div className="text-center py-12">
            <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-700 mb-2">No jobs scheduled</h3>
            <p className="text-gray-500">No jobs are scheduled for {formatDate(selectedDate)}</p>
          </div>
        )}
      </div>

      {/* Jobs by Technician Summary */}
      {Object.keys(jobsByTechnician).length > 0 && (
        <div className="clay-card rounded-3xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Jobs by Technician</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(jobsByTechnician).map(([techName, jobs]) => {
              const tech = technicians.find(t => t.name === techName);
              const techColor = tech?.color_code || 'Blue';
              const techTotalPay = jobs.reduce((sum, j) => {
                return sum + (j.technician_pay || 0) + (j.pay_adjustment_amount || 0);
              }, 0);

              return (
                <div key={techName} className="clay-button rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[techColor]} flex items-center justify-center`}>
                      <Wrench className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-700">{techName}</p>
                      <p className="text-xs text-gray-500">{jobs.length} jobs</p>
                    </div>
                    <p className="ml-auto text-lg font-bold text-emerald-600">${techTotalPay.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    {jobs.map(job => (
                      <div key={job.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">{job.test_number}</span>
                        <span className="text-gray-500">{formatTime(job.scheduled_date)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
