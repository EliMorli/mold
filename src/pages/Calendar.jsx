import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Calendar as CalendarIcon,
  FlaskConical,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  MapPin,
  Search,
  Navigation,
  Plus
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TestModal from "../components/tests/TestModal";
import { createPageUrl } from "@/utils";

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [filterTechnician, setFilterTechnician] = useState("All");
  const [viewMode, setViewMode] = useState("month"); // day, week, month
  const [searchAddress, setSearchAddress] = useState("");
  const [showFindTech, setShowFindTech] = useState(false);

  const queryClient = useQueryClient();

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

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => base44.entities.Technician.list(),
    initialData: [],
  });

  const { data: labs = [] } = useQuery({
    queryKey: ['labs'],
    queryFn: () => base44.entities.Lab.list(),
    initialData: [],
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => base44.entities.Invoice.list(),
    initialData: [],
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Test.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tests']);
      setShowModal(false);
      setSelectedTest(null);
    },
  });

  // Filter tests by technician
  const filteredTests = filterTechnician === "All"
    ? tests
    : tests.filter(t => t.technician_id === filterTechnician);

  // Color mapping for technicians
  const colorMap = {
    'Pink': 'bg-pink-400',
    'Blue': 'bg-blue-400',
    'Green': 'bg-green-400',
    'Orange': 'bg-orange-400',
    'Purple': 'bg-purple-400',
    'Red': 'bg-red-400',
    'Cyan': 'bg-cyan-400',
    'Yellow': 'bg-yellow-400',
  };

  const colorMapText = {
    'Pink': 'text-pink-600',
    'Blue': 'text-blue-600',
    'Green': 'text-green-600',
    'Orange': 'text-orange-600',
    'Purple': 'text-purple-600',
    'Red': 'text-red-600',
    'Cyan': 'text-cyan-600',
    'Yellow': 'text-yellow-600',
  };

  const getTestColor = (test) => {
    const technician = technicians.find(t => t.id === test.technician_id);
    if (technician && technician.color_code) {
      return colorMap[technician.color_code] || 'bg-purple-400';
    }
    return 'bg-purple-400';
  };

  const statusColors = {
    'Scheduled': 'bg-blue-400',
    'In Progress': 'bg-purple-400',
    'Lab Analysis': 'bg-orange-400',
    'Completed': 'bg-green-400',
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

  const formatTime = (dateTime) => {
    if (!dateTime) return '';
    const date = new Date(dateTime);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleTestClick = (test) => {
    setSelectedTest(test);
    setShowModal(true);
  };

  // Get assignable technicians
  const assignableTechnicians = technicians.filter(t => t.can_be_assigned_jobs);

  // Navigation functions
  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + direction);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Get tests for a specific day
  const getTestsForDay = (date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return filteredTests.filter(test => {
      if (!test.scheduled_date) return false;
      const testDate = new Date(test.scheduled_date);
      const testDateStr = `${testDate.getFullYear()}-${String(testDate.getMonth() + 1).padStart(2, '0')}-${String(testDate.getDate()).padStart(2, '0')}`;
      return testDateStr === dateStr;
    });
  };

  // Calculate daily sales for a date
  const getDailySales = (date) => {
    const dayTests = getTestsForDay(date);
    return dayTests.reduce((sum, test) => {
      const invoice = invoices.find(inv => inv.test_id === test.id);
      return sum + (invoice?.total || 0);
    }, 0);
  };

  // Get week days
  const getWeekDays = () => {
    const startOfWeek = new Date(selectedDate);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Get month days
  const getMonthDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  // Weekly/Monthly totals
  const periodTotals = useMemo(() => {
    let totalJobs = 0;
    let totalSales = 0;
    let totalSamples = 0;

    if (viewMode === 'day') {
      const dayTests = getTestsForDay(selectedDate);
      totalJobs = dayTests.length;
      totalSales = getDailySales(selectedDate);
      totalSamples = dayTests.reduce((sum, t) => sum + (t.sample_count || t.number_of_tests || 0), 0);
    } else if (viewMode === 'week') {
      const weekDays = getWeekDays();
      weekDays.forEach(day => {
        const dayTests = getTestsForDay(day);
        totalJobs += dayTests.length;
        totalSales += getDailySales(day);
        totalSamples += dayTests.reduce((sum, t) => sum + (t.sample_count || t.number_of_tests || 0), 0);
      });
    } else {
      const monthDays = getMonthDays().filter(d => d !== null);
      monthDays.forEach(day => {
        const dayTests = getTestsForDay(day);
        totalJobs += dayTests.length;
        totalSales += getDailySales(day);
        totalSamples += dayTests.reduce((sum, t) => sum + (t.sample_count || t.number_of_tests || 0), 0);
      });
    }

    return { totalJobs, totalSales, totalSamples };
  }, [filteredTests, invoices, selectedDate, viewMode]);

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="clay-card rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-500 bg-clip-text text-transparent">
              Calendar
            </h1>
            <p className="text-gray-500 mt-1">Schedule and manage job appointments</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex gap-1 clay-button rounded-2xl p-1">
              {['day', 'week', 'month'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all capitalize ${
                    viewMode === mode
                      ? 'clay-nav-active text-purple-700'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Find Nearest Tech Button */}
            <Button
              onClick={() => setShowFindTech(!showFindTech)}
              className={`clay-button rounded-2xl px-4 py-2 flex items-center gap-2 font-medium ${showFindTech ? 'text-purple-700' : 'text-gray-600'} hover:scale-105`}
            >
              <Navigation className="w-4 h-4" />
              Find Tech
            </Button>
          </div>
        </div>
      </div>

      {/* Find Nearest Tech Panel */}
      {showFindTech && (
        <div className="clay-card rounded-3xl p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-purple-500" />
            Find Nearest Technician
          </h3>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400" />
              <Input
                placeholder="Enter job address to find nearest tech..."
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                className="pl-12 clay-button rounded-2xl border-0 h-12 text-gray-700"
              />
            </div>
            <Button
              className="clay-button rounded-2xl px-6 py-3 font-semibold text-purple-600 hover:scale-105"
              disabled={!searchAddress}
            >
              <MapPin className="w-4 h-4 mr-2" />
              Drop Pin & Find
            </Button>
          </div>

          {/* Tech Location Legend */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-3">Today's technician locations:</p>
            <div className="flex flex-wrap gap-3">
              {assignableTechnicians.map((tech, idx) => {
                const techTests = getTestsForDay(new Date()).filter(t => t.technician_id === tech.id);
                return (
                  <div key={tech.id} className="clay-button rounded-xl px-3 py-2 flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full ${colorMap[tech.color_code]} flex items-center justify-center text-white text-xs font-bold`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{tech.name}</span>
                    <Badge className="bg-gray-100 text-gray-600 text-xs">{techTests.length} jobs</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Period Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="clay-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <FlaskConical className="w-5 h-5 text-purple-500" />
            <span className="text-sm text-gray-500">Total Jobs</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{periodTotals.totalJobs}</p>
        </div>
        <div className="clay-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-500">Total Sales</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">${periodTotals.totalSales.toLocaleString()}</p>
        </div>
        <div className="clay-card rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <FlaskConical className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-gray-500">Total Samples</span>
          </div>
          <p className="text-2xl font-bold text-gray-800">{periodTotals.totalSamples}</p>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div className="clay-card rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
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
            <div className="clay-card rounded-2xl px-6 py-3">
              <p className="text-xl font-bold text-gray-800">
                {viewMode === 'day' && selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                {viewMode === 'week' && `Week of ${getWeekDays()[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${getWeekDays()[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                {viewMode === 'month' && selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            <button
              onClick={() => navigateDate(1)}
              className="clay-button rounded-xl p-2 hover:scale-110 transition-transform"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Technician Filter */}
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            <Select value={filterTechnician} onValueChange={setFilterTechnician}>
              <SelectTrigger className="clay-button rounded-2xl border-0 w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Technicians</SelectItem>
                {assignableTechnicians.map(tech => (
                  <SelectItem key={tech.id} value={tech.id}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${colorMap[tech.color_code]}`} />
                      {tech.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Day View */}
        {viewMode === 'day' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-100 text-purple-700 rounded-lg px-3 py-1">
                  {getTestsForDay(selectedDate).length} jobs
                </Badge>
                <Badge className="bg-green-100 text-green-700 rounded-lg px-3 py-1">
                  ${getDailySales(selectedDate).toLocaleString()}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              {getTestsForDay(selectedDate)
                .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
                .map((test) => {
                  const technician = technicians.find(t => t.id === test.technician_id);
                  const invoice = invoices.find(inv => inv.test_id === test.id);

                  return (
                    <div
                      key={test.id}
                      onClick={() => handleTestClick(test)}
                      className="clay-button rounded-2xl p-4 cursor-pointer hover:scale-[1.01] transition-transform"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-xl ${getTestColor(test)} flex items-center justify-center shadow-inner`}>
                          <FlaskConical className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-gray-800">{test.test_number}</span>
                            <Badge className={`${statusColors[test.status]} text-white rounded-lg px-2 py-0.5 text-xs`}>
                              {test.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{test.client_name}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{test.property_address}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-700">{formatTime(test.scheduled_date)}</p>
                          {technician && (
                            <div className="flex items-center gap-1 justify-end mt-1">
                              <div className={`w-3 h-3 rounded-full ${colorMap[technician.color_code]}`} />
                              <span className="text-xs text-gray-600">{technician.name}</span>
                            </div>
                          )}
                          {invoice && (
                            <p className="text-sm font-semibold text-emerald-600 mt-1">${invoice.total?.toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

              {getTestsForDay(selectedDate).length === 0 && (
                <div className="text-center py-12">
                  <CalendarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-700 mb-2">No jobs scheduled</h3>
                  <p className="text-gray-500">No jobs for this day</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Week View */}
        {viewMode === 'week' && (
          <div>
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center">
                  <p className="text-sm font-bold text-purple-600">{day}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {getWeekDays().map((day, idx) => {
                const dayTests = getTestsForDay(day);
                const dailySales = getDailySales(day);

                return (
                  <div
                    key={idx}
                    onClick={() => { setSelectedDate(day); setViewMode('day'); }}
                    className={`clay-button rounded-2xl p-3 min-h-[200px] cursor-pointer hover:scale-[1.02] transition-transform ${
                      isToday(day) ? 'clay-nav-active' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-lg font-bold ${isToday(day) ? 'text-purple-700' : 'text-gray-700'}`}>
                        {day.getDate()}
                      </span>
                      {dayTests.length > 0 && (
                        <Badge className="bg-purple-100 text-purple-700 rounded-lg px-2 py-0 text-xs">
                          {dayTests.length}
                        </Badge>
                      )}
                    </div>

                    {dailySales > 0 && (
                      <div className="mb-2 text-xs font-semibold text-emerald-600">
                        ${dailySales.toLocaleString()}
                      </div>
                    )}

                    <div className="space-y-1">
                      {dayTests.slice(0, 4).map((test) => (
                        <div
                          key={test.id}
                          className={`${getTestColor(test)} text-white rounded-lg px-2 py-1 text-xs truncate`}
                        >
                          {formatTime(test.scheduled_date)} - {test.test_number}
                        </div>
                      ))}
                      {dayTests.length > 4 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{dayTests.length - 4} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Month View */}
        {viewMode === 'month' && (
          <div>
            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center">
                  <p className="text-sm font-bold text-purple-600">{day}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {getMonthDays().map((day, idx) => {
                if (!day) {
                  return <div key={idx} className="opacity-0 pointer-events-none min-h-[120px]" />;
                }

                const dayTests = getTestsForDay(day);
                const dailySales = getDailySales(day);

                return (
                  <div
                    key={idx}
                    onClick={() => { setSelectedDate(day); setViewMode('day'); }}
                    className={`clay-button rounded-2xl p-3 min-h-[120px] cursor-pointer hover:scale-[1.02] transition-transform ${
                      isToday(day) ? 'clay-nav-active' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-sm font-bold ${isToday(day) ? 'text-purple-700' : 'text-gray-700'}`}>
                        {day.getDate()}
                      </span>
                      {dayTests.length > 0 && (
                        <Badge className="bg-purple-100 text-purple-700 rounded-lg px-2 py-0 text-xs">
                          {dayTests.length}
                        </Badge>
                      )}
                    </div>

                    {dailySales > 0 && (
                      <div className="mb-1 text-xs font-semibold text-emerald-600">
                        ${dailySales.toLocaleString()}
                      </div>
                    )}

                    <div className="space-y-1">
                      {dayTests.slice(0, 3).map((test) => (
                        <div
                          key={test.id}
                          className={`${getTestColor(test)} text-white rounded-lg px-2 py-0.5 text-xs truncate`}
                          title={`${test.test_number} - ${formatDateTime(test.scheduled_date)}`}
                        >
                          {test.test_number}
                        </div>
                      ))}
                      {dayTests.length > 3 && (
                        <div className="text-xs text-gray-500 text-center">
                          +{dayTests.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Technician Legend */}
      {filterTechnician === "All" && assignableTechnicians.length > 0 && (
        <div className="clay-card rounded-3xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-gray-600">Technician Colors</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {assignableTechnicians.slice(0, 8).map(tech => (
              <div key={tech.id} className="flex items-center gap-1 clay-button rounded-lg px-2 py-1">
                <div className={`w-3 h-3 rounded-full ${colorMap[tech.color_code]}`} />
                <span className="text-xs text-gray-700 font-medium">{tech.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Modal */}
      {showModal && (
        <TestModal
          test={selectedTest}
          clients={clients}
          technicians={assignableTechnicians}
          labs={labs}
          onClose={() => {
            setShowModal(false);
            setSelectedTest(null);
          }}
          onSave={(data) => {
            updateMutation.mutate({ id: selectedTest.id, data });
          }}
        />
      )}
    </div>
  );
}
