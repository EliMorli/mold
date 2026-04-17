import { useEffect, useState } from "react";

export default function NowIndicator({ startHour, endHour, pxPerMin }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const hour = now.getHours();
  const minute = now.getMinutes();

  if (hour < startHour || hour >= endHour) return null;

  const minutesFromStart = (hour - startHour) * 60 + minute;
  const top = minutesFromStart * pxPerMin;

  return (
    <div
      className="absolute left-0 right-0 pointer-events-none z-10"
      style={{ top }}
    >
      <div className="relative h-0.5 bg-red-500">
        <div className="absolute -left-1 -top-[3px] w-2 h-2 rounded-full bg-red-500" />
      </div>
    </div>
  );
}
