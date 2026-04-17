import { useMemo } from "react";
import { getTechColorClasses } from "@/utils/technicianColors";
import { getJobDuration } from "@/utils/jobDuration";
import JobCard from "./JobCard";
import NowIndicator from "./NowIndicator";

const START_HOUR = 8;
const END_HOUR = 20;
const SLOT_HOURS = 2;
const SLOT_MINUTES = SLOT_HOURS * 60;
const SLOT_COUNT = (END_HOUR - START_HOUR) / SLOT_HOURS;
const SLOT_HEIGHT_PX = 96;
const PX_PER_MIN = SLOT_HEIGHT_PX / SLOT_MINUTES;
const GRID_HEIGHT_PX = SLOT_HEIGHT_PX * SLOT_COUNT;

const formatSlotLabel = (startHour) => {
  const end = startHour + SLOT_HOURS;
  const fmt = (h) => {
    const period = h >= 12 ? "PM" : "AM";
    const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${display} ${period}`;
  };
  return `${fmt(startHour)} – ${fmt(end)}`;
};

const isSameDay = (a, b) => {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
};

// Lane-pack overlapping jobs within a column
const packLanes = (jobs) => {
  const sorted = [...jobs].sort((a, b) => a.startMin - b.startMin);
  const lanes = []; // each lane = array of jobs, we only need end time of last
  const laneAssignments = new Map();

  for (const job of sorted) {
    let placed = false;
    for (let i = 0; i < lanes.length; i++) {
      if (lanes[i].endMin <= job.startMin) {
        lanes[i] = { endMin: job.endMin };
        laneAssignments.set(job.id, i);
        placed = true;
        break;
      }
    }
    if (!placed) {
      lanes.push({ endMin: job.endMin });
      laneAssignments.set(job.id, lanes.length - 1);
    }
  }

  return { lanes: lanes.length, assignments: laneAssignments };
};

export default function DayCalendarGrid({
  date,
  tests,
  technicians,
  onSlotClick,
  onEditJob,
  onCreateInvoice,
  onMarkComplete,
  onDeleteJob,
}) {
  const dateStart = useMemo(() => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [date]);

  // Columns: Unassigned first, then each assignable tech
  const columns = useMemo(() => {
    const assignable = technicians.filter((t) => t.can_be_assigned_jobs !== false);
    return [
      { id: "__unassigned__", name: "Unassigned", technician: null },
      ...assignable.map((t) => ({ id: t.id, name: t.name, technician: t })),
    ];
  }, [technicians]);

  // Categorize jobs: out-of-range, all-day, or normal (placed in columns)
  const { columnJobs, earlyJobs, lateJobs, allDayJobs } = useMemo(() => {
    const result = {
      columnJobs: new Map(), // columnId -> [{id, test, startMin, endMin}]
      earlyJobs: [],
      lateJobs: [],
      allDayJobs: [],
    };
    columns.forEach((c) => result.columnJobs.set(c.id, []));

    const knownTechIds = new Set(technicians.map((t) => t.id));
    const knownTechNames = new Set(technicians.map((t) => t.name));

    for (const test of tests) {
      const scheduled = test.scheduled_date ? new Date(test.scheduled_date) : null;
      if (!scheduled || isNaN(scheduled.getTime())) {
        result.allDayJobs.push(test);
        continue;
      }

      const hours = scheduled.getHours();
      const mins = scheduled.getMinutes();
      const duration = getJobDuration(test);
      const scheduledMin = hours * 60 + mins;
      const startMin = scheduledMin - START_HOUR * 60;
      const endMin = startMin + duration;

      if (endMin <= 0) {
        result.earlyJobs.push(test);
        continue;
      }
      if (startMin >= SLOT_COUNT * SLOT_MINUTES) {
        result.lateJobs.push(test);
        continue;
      }

      // Clamp to grid
      const clampedStart = Math.max(0, startMin);
      const clampedEnd = Math.min(SLOT_COUNT * SLOT_MINUTES, endMin);

      // Pick column: tech by id, else by name, else "Other" column (created on demand)
      let columnId = "__unassigned__";
      if (test.technician_id && knownTechIds.has(test.technician_id)) {
        columnId = test.technician_id;
      } else if (test.technician_name && knownTechNames.has(test.technician_name)) {
        const tech = technicians.find((t) => t.name === test.technician_name);
        if (tech) columnId = tech.id;
      } else if (test.technician_name) {
        // Tech name present but not in known list -> bucket into Unassigned
        columnId = "__unassigned__";
      }

      const bucket = result.columnJobs.get(columnId) || [];
      bucket.push({
        id: test.id,
        test,
        startMin: clampedStart,
        endMin: clampedEnd,
      });
      result.columnJobs.set(columnId, bucket);
    }

    return result;
  }, [tests, columns, technicians]);

  const handleSlotClick = (slotIndex, column) => {
    if (!onSlotClick) return;
    const slotStart = new Date(dateStart);
    slotStart.setHours(START_HOUR + slotIndex * SLOT_HOURS, 0, 0, 0);
    onSlotClick(slotStart, column.technician);
  };

  const showNowIndicator = isSameDay(date, new Date());

  return (
    <div className="clay-card rounded-3xl p-4 md:p-6">
      {/* Out-of-range chips */}
      {(earlyJobs.length > 0 || allDayJobs.length > 0) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {allDayJobs.length > 0 && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700">
              All-day · {allDayJobs.length}
            </div>
          )}
          {earlyJobs.length > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700">
              +{earlyJobs.length} before 8 AM
            </div>
          )}
        </div>
      )}

      {/* Grid: sticky time gutter + horizontally scrolling columns */}
      <div className="flex rounded-2xl border border-gray-200 overflow-hidden bg-white">
        {/* Time Gutter */}
        <div className="flex-shrink-0 w-20 border-r border-gray-200 bg-gray-50">
          <div className="h-12 border-b border-gray-200" />
          <div>
            {Array.from({ length: SLOT_COUNT }).map((_, i) => (
              <div
                key={i}
                className="flex items-start justify-center px-1 text-[11px] font-semibold text-gray-500 border-b border-gray-200"
                style={{ height: SLOT_HEIGHT_PX }}
              >
                <span className="pt-1 whitespace-nowrap">
                  {formatSlotLabel(START_HOUR + i * SLOT_HOURS)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable columns */}
        <div className="flex-1 overflow-x-auto">
          <div
            className="flex min-w-full"
            style={{ minWidth: `${columns.length * 176}px` }}
          >
            {columns.map((col, colIdx) => {
              const colorClasses = col.technician
                ? getTechColorClasses(col.technician)
                : { bg: "bg-gray-300", text: "text-gray-600" };

              const rawJobs = columnJobs.get(col.id) || [];
              const { lanes, assignments } = packLanes(rawJobs);

              return (
                <div
                  key={col.id}
                  className={`flex-1 min-w-[176px] ${colIdx < columns.length - 1 ? "border-r border-gray-200" : ""}`}
                >
                  {/* Header */}
                  <div className="h-12 px-3 flex items-center gap-2 border-b border-gray-200 bg-white sticky top-0 z-10">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${colorClasses.bg}`} />
                    <span className="text-sm font-semibold text-gray-700 truncate">
                      {col.name}
                    </span>
                    <span className="ml-auto text-xs text-gray-400">
                      {rawJobs.length}
                    </span>
                  </div>

                  {/* Column body */}
                  <div
                    className="relative"
                    style={{ height: GRID_HEIGHT_PX }}
                  >
                    {/* Slot backgrounds + click targets */}
                    {Array.from({ length: SLOT_COUNT }).map((_, slotIdx) => (
                      <button
                        key={slotIdx}
                        type="button"
                        onClick={() => handleSlotClick(slotIdx, col)}
                        className="absolute left-0 right-0 border-b border-gray-100 hover:bg-purple-50/50 transition-colors"
                        style={{
                          top: slotIdx * SLOT_HEIGHT_PX,
                          height: SLOT_HEIGHT_PX,
                        }}
                        aria-label={`Add job at ${formatSlotLabel(START_HOUR + slotIdx * SLOT_HOURS)} for ${col.name}`}
                      />
                    ))}

                    {/* Now indicator */}
                    {showNowIndicator && (
                      <NowIndicator
                        startHour={START_HOUR}
                        endHour={END_HOUR}
                        pxPerMin={PX_PER_MIN}
                      />
                    )}

                    {/* Job cards */}
                    {rawJobs.map((jobEntry) => {
                      const laneIdx = assignments.get(jobEntry.id) || 0;
                      const widthPct = 100 / lanes;
                      const leftPct = laneIdx * widthPct;
                      const top = jobEntry.startMin * PX_PER_MIN;
                      const height = Math.max(
                        32,
                        (jobEntry.endMin - jobEntry.startMin) * PX_PER_MIN
                      );

                      return (
                        <JobCard
                          key={jobEntry.id}
                          test={jobEntry.test}
                          technician={col.technician}
                          style={{
                            top,
                            height,
                            left: `calc(${leftPct}% + 2px)`,
                            width: `calc(${widthPct}% - 4px)`,
                          }}
                          onEdit={() => onEditJob?.(jobEntry.test)}
                          onCreateInvoice={() => onCreateInvoice?.(jobEntry.test)}
                          onMarkComplete={() => onMarkComplete?.(jobEntry.test)}
                          onDelete={() => onDeleteJob?.(jobEntry.test)}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Late jobs chip */}
      {lateJobs.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700">
            +{lateJobs.length} after 8 PM
          </div>
        </div>
      )}

      {tests.length === 0 && (
        <div className="text-center py-6 text-sm text-gray-500">
          No jobs scheduled. Click any time slot to create one.
        </div>
      )}
    </div>
  );
}
