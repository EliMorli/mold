import { Badge } from "@/components/ui/badge";
import { TECH_COLOR_BG } from "@/utils/technicianColors";

const isToday = (date) => {
  if (!date) return false;
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

const getTestColor = (test, technicians) => {
  const technician = technicians.find((t) => t.id === test.technician_id);
  return TECH_COLOR_BG[technician?.color_code] || TECH_COLOR_BG.Purple;
};

export default function MonthGrid({
  monthDays,
  getTestsForDay,
  getDailySales,
  technicians,
  onDayClick,
}) {
  return (
    <div>
      <div className="grid grid-cols-7 gap-2 mb-4">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-center">
            <p className="text-sm font-bold text-purple-600">{day}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {monthDays.map((day, idx) => {
          if (!day) {
            return <div key={idx} className="opacity-0 pointer-events-none min-h-[120px]" />;
          }

          const dayTests = getTestsForDay(day);
          const dailySales = getDailySales(day);

          return (
            <div
              key={idx}
              onClick={() => onDayClick?.(day)}
              className={`clay-button rounded-2xl p-3 min-h-[120px] cursor-pointer hover:scale-[1.02] transition-transform ${
                isToday(day) ? "clay-nav-active" : ""
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-sm font-bold ${isToday(day) ? "text-purple-700" : "text-gray-700"}`}>
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
                    className={`${getTestColor(test, technicians)} text-white rounded-lg px-2 py-0.5 text-xs truncate`}
                    title={test.test_number}
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
  );
}
