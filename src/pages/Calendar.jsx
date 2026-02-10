import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Calendar as CalendarIcon, FlaskConical, Clock, Filter, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TestModal from "../components/tests/TestModal";

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [filterTechnician, setFilterTechnician] = useState("All");

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

  const testsByDate = filteredTests.reduce((acc, test) => {
    if (test.scheduled_date) {
      const date = new Date(test.scheduled_date);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(test);
    }
    return acc;
  }, {});

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(selectedDate);
  
  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const getTestsForDay = (day) => {
    if (!day) return [];
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return testsByDate[dateKey] || [];
  };

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

  const handleTestClick = (test) => {
    setSelectedTest(test);
    setShowModal(true);
  };

  // Get assignable technicians
  const assignableTechnicians = technicians.filter(t => t.can_be_assigned_jobs);

  return (
    <div className="space-y-6">
      <div className="clay-card rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-500 bg-clip-text text-transparent">
              Test Calendar
            </h1>
            <p className="text-gray-500 mt-1">Schedule and manage test appointments</p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
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

            <button
              onClick={() => setSelectedDate(new Date(year, month - 1, 1))}
              className="clay-button rounded-2xl px-4 py-2 font-medium text-gray-600 hover:scale-105"
            >
              Previous
            </button>
            <div className="clay-card rounded-2xl px-6 py-3">
              <p className="text-xl font-bold text-gray-800">
                {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            <button
              onClick={() => setSelectedDate(new Date(year, month + 1, 1))}
              className="clay-button rounded-2xl px-4 py-2 font-medium text-gray-600 hover:scale-105"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Technician Legend - Collapsible */}
      {filterTechnician === "All" && assignableTechnicians.length > 0 && (
        <div className="clay-card rounded-3xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-gray-600">Technician Colors ({assignableTechnicians.length})</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {assignableTechnicians.slice(0, 8).map(tech => (
              <div key={tech.id} className="flex items-center gap-1 clay-button rounded-lg px-2 py-1">
                <div className={`w-3 h-3 rounded-full ${colorMap[tech.color_code]}`} />
                <span className="text-xs text-gray-700 font-medium">{tech.name}</span>
              </div>
            ))}
            {assignableTechnicians.length > 8 && (
              <div className="flex items-center gap-1 clay-button rounded-lg px-2 py-1 text-xs text-purple-600 font-medium">
                +{assignableTechnicians.length - 8} more (use filter to select)
              </div>
            )}
          </div>
        </div>
      )}

      <div className="clay-card rounded-3xl p-6">
        <div className="grid grid-cols-7 gap-2 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center">
              <p className="text-sm font-bold text-purple-600">{day}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((day, idx) => {
            const dayTests = getTestsForDay(day);
            const isToday = day === new Date().getDate() && 
                           month === new Date().getMonth() && 
                           year === new Date().getFullYear();
            
            return (
              <div
                key={idx}
                className={`clay-button rounded-2xl p-3 min-h-[120px] ${
                  !day ? 'opacity-0 pointer-events-none' : ''
                } ${isToday ? 'clay-nav-active' : ''}`}
              >
                {day && (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-sm font-bold ${isToday ? 'text-purple-700' : 'text-gray-700'}`}>
                        {day}
                      </span>
                      {dayTests.length > 0 && (
                        <Badge className="bg-purple-100 text-purple-700 rounded-lg px-2 py-0 text-xs">
                          {dayTests.length}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      {dayTests.slice(0, 3).map((test) => (
                        <div
                          key={test.id}
                          onClick={() => handleTestClick(test)}
                          className={`${getTestColor(test)} text-white rounded-lg px-2 py-1 text-xs truncate cursor-pointer hover:opacity-80 transition-opacity`}
                          title={`${test.test_number} - ${formatDateTime(test.scheduled_date)} - ${test.technician_name || 'Unassigned'}`}
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
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="clay-card rounded-3xl p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Upcoming Tests</h3>
        <div className="space-y-3">
          {filteredTests
            .filter(t => t.scheduled_date && new Date(t.scheduled_date) >= new Date())
            .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
            .slice(0, 10)
            .map((test) => {
              const technician = technicians.find(t => t.id === test.technician_id);
              
              return (
                <div 
                  key={test.id} 
                  onClick={() => handleTestClick(test)}
                  className="clay-button rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:scale-[1.01] transition-transform"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${getTestColor(test)}`}>
                    <FlaskConical className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-800">{test.test_number}</h4>
                    <p className="text-sm text-gray-500">{test.client_name}</p>
                    {technician && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`w-3 h-3 rounded-full ${colorMap[technician.color_code]}`} />
                        <p className="text-xs text-gray-600">{technician.name}</p>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">
                      {formatDateTime(test.scheduled_date)}
                    </p>
                    <Badge className={`${statusColors[test.status]} text-white rounded-lg px-3 py-1 text-xs mt-1`}>
                      {test.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

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