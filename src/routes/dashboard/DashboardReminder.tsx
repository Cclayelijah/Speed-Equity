import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function DashboardReminder() {
  const [showReminder, setShowReminder] = useState(false);
  const [dailyEntries, setDailyEntries] = useState<{ entry_date: string }[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Example: Fetch dailyEntries from API or context here
    // setDailyEntries(fetchedEntries);

    const today = new Date().toISOString().slice(0, 10);
    const hasCheckedInToday = dailyEntries.some((e) => e.entry_date === today);
    setShowReminder(!hasCheckedInToday);
  }, [dailyEntries]);

  // Close on ESC and lock body scroll while open
  useEffect(() => {
    if (!showReminder) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setShowReminder(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [showReminder]);

  const goCheckIn = () => {
    setShowReminder(false);
    navigate("/checkin");
  };

  return (
    <>
      {/* ...existing dashboard content... */}

      {showReminder && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center p-4"
          onClick={() => setShowReminder(false)}
          aria-hidden="true"
        >
          {/* Dark, readable overlay */}
          <div className="absolute inset-0 bg-[#05060A]/90 backdrop-blur-sm" />

          {/* Dialog */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkin-title"
            className="relative w-full max-w-md p-5 sm:p-6 card bg-black/[0.8] border-white/15 shadow-card text-white/90"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Accent bar + close */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-fuchsia-500 via-rose-400 to-cyan-400" />
            <button
              aria-label="Close"
              onClick={() => setShowReminder(false)}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition"
            >
              ×
            </button>

            <h2 id="checkin-title" className="text-xl font-semibold">
              Daily Check-In Reminder
            </h2>

            <p className="mt-2 text-white/85">
              Don’t forget to log your daily check-in!
            </p>

            <div className="flex justify-end gap-2 mt-5">
              <button className="btn btn-outline" onClick={() => setShowReminder(false)}>
                Dismiss
              </button>
              <button className="btn btn-primary" onClick={goCheckIn}>
                Check In Now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}