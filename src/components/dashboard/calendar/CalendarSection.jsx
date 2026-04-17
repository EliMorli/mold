import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, FlaskConical, DollarSign } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TECH_COLOR_BG } from "@/utils/technicianColors";
import DayCalendarGrid from "./DayCalendarGrid";
import WeekGrid from "./WeekGrid";
import MonthGrid from "./MonthGrid";

const toDateKey = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export default function CalendarSection({
  selectedDate,
  setSelectedDate,
  tests,
  technicians,
  invoices,
  onSlotClick,
  onEditJob,
  onCreateInvoice,
  onMarkComplete,
  onDeleteJob,
}) {
  const [viewMode, setViewMode] = useState("month");
  const [filterTechnician, setFilterTechnician] = useState("All");

  const assignableTechnicians = useMemo(
    () => technicians.filter((t) => t.can_be_assigned_jobs !== false),
    [technicians]
  );

  const filteredTests = useMemo(
    () => (filterTechnician === "All" ? tests : tests.filter((t) => t.technician_id === filterTechnician)),
    [tests, filterTechnician]
  );

  const getTestsForDay = (date) => {
    const dateStr = toDateKey(date);
    return filteredTests.filter((test) => {
      if (!test.scheduled_date) return false;
      return toDateKey(new Date(test.scheduled_date)) === dateStr;
    });
  };

  const getDailySales = (date) => {
    const dayTests = getTestsForDay(date);
    return dayTests.reduce((sum, test) => {
      const invoice = invoices.find((inv) => inv.test_id === test.id);
      return sum + (invoice?.total || 0);
    }, 0);
  };

  const weekDays = useMemo(() => {
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
  }, [selectedDate]);

  const monthDays = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
    return days;
  }, [selectedDate]);

  const periodTotals = useMemo(() => {
    let totalJobs = 0;
    let totalSales = 0;
    let totalSamples = 0;
    const days = viewMode === "day" ? [selectedDate] : viewMode === "week" ? weekDays : monthDays.filter(Boolean);
    days.forEach((day) => {
      const dayTests = getTestsForDay(day);
      totalJobs += dayTests.length;
      totalSales += getDailySales(day);
      totalSamples += dayTests.reduce((sum, t) => sum + (t.sample_count || t.number_of_tests || 0), 0);
    });
    return { totalJobs, totalSales, totalSamples };
  }, [viewMode, selectedDate, weekDays, monthDays, filteredTests, invoices]);

  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate);
    if (viewMode === "day") newDate.setDate(newDate.getDate() + direction);
    else if (viewMode === "week") newDate.setDate(newDate.getDate() + direction * 7);
    else newDate.setMonth(newDate.getMonth() + direction);
    setSelectedDate(newDate);
  };

  const goToToday = () => setSelectedDate(new Date());

  const handleDayClick = (day) => {
    setSelectedDate(day);
    setViewMode("day");
  };

  const headerLabel = useMemo(() => {
    if (viewMode === "day") {
      return selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    }
    if (viewMode === "week") {
      return `Week of ${weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }, [viewMode, selectedDate, weekDays]);

  return (
    <div className="clay-card rounded-3xl p-6 space-y-4">
      {/* Header: title + view toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-500 bg-clip-text text-transparent">
            Schedule at a Glance
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Day, week, and month overview of all jobs</p>
        </div>
        <div className="flex gap-1 clay-button rounded-2xl p-1 w-fit">
          {["day", "week", "month"].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 rounded-xl font-medium transition-all capitalize text-sm ${
                viewMode === mode ? "clay-nav-active text-purple-700" : "text-gray-600 hover:text-gray-800"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Period Stats (week/month only) */}
      {viewMode !== "day" && (
        <div className="grid grid-cols-3 gap-3">
          <div className="clay-button rounded-2xl p-3">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <FlaskConical className="w-4 h-4 text-purple-500" />
              Total Jobs
            </div>
            <p className="text-xl font-bold text-gray-800">{periodTotals.totalJobs}</p>
          </div>
          <div className="clay-button rounded-2xl p-3">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <DollarSign className="w-4 h-4 text-green-500" />
              Total Sales
            </div>
            <p className="text-xl font-bold text-emerald-600">${periodTotals.totalSales.toLocaleString()}</p>
          </div>
          <div className="clay-button rounded-2xl p-3">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <FlaskConical className="w-4 h-4 text-blue-500" />
              Total Samples
            </div>
            <p className="text-xl font-bold text-gray-800">{periodTotals.totalSamples}</p>
          </div>
        </div>
      )}

      {/* Date Navigation + Tech filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateDate(-1)}
            className="clay-button rounded-xl p-2 hover:scale-110 transition-transform"
            aria-label="Previous"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={goToToday}
            className="clay-button rounded-xl px-3 py-1.5 text-sm font-medium text-purple-600 hover:scale-105"
          >
            Today
          </button>
          <button
            onClick={() => navigateDate(1)}
            className="clay-button rounded-xl p-2 hover:scale-110 transition-transform"
            aria-label="Next"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
          <div className="clay-card rounded-xl px-4 py-2 ml-2">
            <p className="text-sm font-bold text-gray-800">{headerLabel}</p>
          </div>
        </div>

        {assignableTechnicians.length > 0 && (
          <Select value={filterTechnician} onValueChange={setFilterTechnician}>
            <SelectTrigger className="clay-button rounded-xl border-0 w-full md:w-56 h-10 text-sm">
              <SelectValue placeholder="Filter technician" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Technicians</SelectItem>
              {assignableTechnicians.map((tech) => (
                <SelectItem key={tech.id} value={tech.id}>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${TECH_COLOR_BG[tech.color_code] || TECH_COLOR_BG.Purple}`} />
                    {tech.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* View Body */}
      {viewMode === "day" && (
        <DayCalendarGrid
          date={selectedDate}
          tests={getTestsForDay(selectedDate)}
          technicians={technicians}
          onSlotClick={onSlotClick}
          onEditJob={onEditJob}
          onCreateInvoice={onCreateInvoice}
          onMarkComplete={onMarkComplete}
          onDeleteJob={onDeleteJob}
        />
      )}
      {viewMode === "week" && (
        <WeekGrid
          weekDays={weekDays}
          getTestsForDay={getTestsForDay}
          getDailySales={getDailySales}
          technicians={technicians}
          onDayClick={handleDayClick}
        />
      )}
      {viewMode === "month" && (
        <MonthGrid
          monthDays={monthDays}
          getTestsForDay={getTestsForDay}
          getDailySales={getDailySales}
          technicians={technicians}
          onDayClick={handleDayClick}
        />
      )}
    </div>
  );
}
