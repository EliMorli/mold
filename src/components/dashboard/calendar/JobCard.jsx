import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Edit, FileText, CheckCircle, Trash2, MapPin, User as UserIcon } from "lucide-react";
import { getTechColorClasses } from "@/utils/technicianColors";

const STATUS_BADGES = {
  Scheduled: "bg-blue-100 text-blue-700",
  "In Progress": "bg-purple-100 text-purple-700",
  "Lab Analysis": "bg-orange-100 text-orange-700",
  Completed: "bg-green-100 text-green-700",
  Cancelled: "bg-gray-100 text-gray-600",
};

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export default function JobCard({
  test,
  technician,
  style,
  onEdit,
  onCreateInvoice,
  onMarkComplete,
  onDelete,
}) {
  const [open, setOpen] = useState(false);
  const tech = technician || { color_code: "Purple" };
  const colorClasses = getTechColorClasses(tech);

  const handleAction = (fn) => (e) => {
    e.stopPropagation();
    setOpen(false);
    fn?.();
  };

  const isCompleted = test.status === "Completed" || test.status === "Cancelled";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={`absolute rounded-lg border-l-4 ${colorClasses.border} ${colorClasses.soft} shadow-sm hover:shadow-md transition-shadow text-left px-2 py-1 overflow-hidden cursor-pointer ${isCompleted ? "opacity-60" : ""}`}
          style={style}
        >
          <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-500">
            <span>{formatTime(test.scheduled_date)}</span>
            {test.status && (
              <span
                className={`ml-auto px-1.5 py-0.5 rounded text-[9px] font-semibold ${STATUS_BADGES[test.status] || STATUS_BADGES.Scheduled}`}
              >
                {test.status}
              </span>
            )}
          </div>
          <div className="text-xs font-bold text-gray-800 truncate mt-0.5">
            {test.test_number}
          </div>
          <div className="text-[11px] text-gray-700 truncate">
            {test.client_name}
          </div>
          {test.property_address && (
            <div className="text-[10px] text-gray-500 truncate flex items-center gap-1 mt-0.5">
              <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate">{test.property_address}</span>
            </div>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-1">
          <div className="px-2 py-1.5 border-b border-gray-100">
            <div className="text-sm font-bold text-gray-800">{test.test_number}</div>
            <div className="text-xs text-gray-600 truncate">{test.client_name}</div>
            {test.technician_name && (
              <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                <UserIcon className="w-3 h-3" />
                {test.technician_name}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleAction(onEdit)}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Edit className="w-4 h-4 text-purple-500" />
            Edit Job
          </button>
          <button
            type="button"
            onClick={handleAction(onCreateInvoice)}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <FileText className="w-4 h-4 text-blue-500" />
            Create Invoice
          </button>
          {!isCompleted && (
            <button
              type="button"
              onClick={handleAction(onMarkComplete)}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <CheckCircle className="w-4 h-4 text-green-500" />
              Mark Complete
            </button>
          )}
          <button
            type="button"
            onClick={handleAction(onDelete)}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Job
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
