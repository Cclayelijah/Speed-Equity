import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../components/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { fetchUserProjects } from '../../lib/projectHelpers'; // <-- import the helper


interface UserProjects {
  id: string;
  name: string;
}

const DailyCheckInPage: React.FC = () => {
  const [projects, setProjects] = useState<UserProjects[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [hoursWorked, setHoursWorked] = useState('');
  const [completed, setCompleted] = useState('');
  const [hoursWasted, setHoursWasted] = useState('');
  const [planToComplete, setPlanToComplete] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [moneyMade, setMoneyMade] = useState<number>(0);
  const [moneyLost, setMoneyLost] = useState<number>(0);
  const [recentCheckin, setRecentCheckin] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjectsAndCheckin = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      const userProjects = await fetchUserProjects(user.id);
      setProjects(userProjects);

      if (userProjects && userProjects.length > 0) {
        const projectId = userProjects[0].id ?? '';
        setSelectedProjectId(projectId);
        const { data: recentEntries } = await supabase
          .from('daily_entries')
          .select('entry_date')
          .eq('created_by', user.id)
          .eq('project_id', projectId)
          .order('entry_date', { ascending: false })
          .limit(1);

        if (
          recentEntries &&
          recentEntries.length > 0 &&
          recentEntries[0].entry_date
        ) {
          const lastCheckin = new Date(recentEntries[0].entry_date).getTime();
          const now = Date.now();
          const hoursSince = (now - lastCheckin) / (1000 * 60 * 60);
          setRecentCheckin(hoursSince < 10);
        }
      }
      setInitialLoading(false); // <-- done loading
    };
    fetchProjectsAndCheckin();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    if (recentCheckin) {
      alert('You have already submitted a report within the last 10 hours.');
      setLoading(false);
      return;
    }

    if (!selectedProjectId) {
      alert('Please select a project.');
      setLoading(false);
      return;
    }

    const entryDate = new Date().toISOString().slice(0, 10);

    // Find implied_hour_value for selected project
    // Find implied_hour_value for selected project from project_dashboard view
    const { data: dashboardData, error: dashboardError } = await supabase
      .from('project_dashboard')
      .select('implied_hour_value, active_work_hours_until_completion, active_valuation')
      .eq('project_id', selectedProjectId)
      .single();

    const project = dashboardData;
    let impliedHourValue = project?.implied_hour_value;

    // Fallback calculation if implied_hour_value is not present
    if (impliedHourValue === undefined && project) {
      const totalPlannedHours = project.active_work_hours_until_completion ?? 1;
      impliedHourValue = totalPlannedHours > 0 ? (project.active_valuation ?? 0) / totalPlannedHours : 0;
    }

    const worked = Number(hoursWorked) || 0;
    const wasted = Number(hoursWasted) || 0;
    const made = worked * (impliedHourValue ?? 0);
    const lost = wasted * (impliedHourValue ?? 0);

    const { error } = await supabase
      .from('daily_entries')
      .insert([{
        project_id: selectedProjectId,
        entry_date: entryDate,
        hours_worked: worked,
        completed,
        hours_wasted: wasted,
        plan_to_complete: planToComplete,
        created_by: user.id,
      }]);

    setLoading(false);
    if (!error) {
      setMoneyMade(made);
      setMoneyLost(lost);
      setShowModal(true);
      setSuccess(true);
    }
    if (error) {
      console.error('Supabase insert error:', error);
    }
  };

  const handleContinue = () => {
    setShowModal(false);
    navigate('/dashboard');
  };

  // Add a loading skeleton for the form
  if (initialLoading) {
    return (
      <div className="px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Daily Check In</h1>
            <div className="flex gap-2">
              <a href="/dashboard" className="btn btn-outline">Dashboard</a>
            </div>
          </div>

          <div className="max-w-xl p-5 mx-auto mt-4 card sm:p-6">
            <div className="h-10 mb-4 skeleton"></div>
            <div className="h-10 mb-4 skeleton"></div>
            <div className="h-10 mb-4 skeleton"></div>
            <div className="h-10 mb-4 skeleton"></div>
            <div className="flex justify-center">
              <div className="loader"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Daily Check In</h1>
          <div className="flex gap-2">
            <a href="/dashboard" className="btn btn-outline">Dashboard</a>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="max-w-xl p-5 mx-auto mt-4 card sm:p-6">
          <label className="label">Project</label>
          <select
            className="mb-1 input"
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
            disabled={recentCheckin}
          >
            <option value="" disabled>Select a project</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <p className="mb-3 help">Choose which project this check-in is for.</p>

          <label className="label">How many hours did you work yesterday?</label>
          <input
            type="number"
            className="mb-3 input"
            value={hoursWorked}
            onChange={e => setHoursWorked(e.target.value)}
            required
            disabled={recentCheckin}
          />

          <label className="label">What did you achieve during that time?</label>
          <textarea
            className="input mb-3 min-h-[110px]"
            value={completed}
            onChange={e => setCompleted(e.target.value)}
            required
            disabled={recentCheckin}
          />

          <label className="label">How many hours did you waste yesterday?</label>
          <input
            type="number"
            className="mb-3 input"
            value={hoursWasted}
            onChange={e => setHoursWasted(e.target.value)}
            required
            disabled={recentCheckin}
          />

          <label className="label">What are you going to do today?</label>
          <textarea
            className="input mb-4 min-h-[110px]"
            value={planToComplete}
            onChange={e => setPlanToComplete(e.target.value)}
            required
            disabled={recentCheckin}
          />

          <button type="submit" className="w-full btn btn-primary" disabled={loading || recentCheckin}>
            {recentCheckin ? "Already Submitted Recently" : loading ? "Submitting..." : "Submit"}
          </button>

          {success && <p className="mt-3 text-emerald-400">Check-in saved!</p>}
        </form>

        {/* Replace MUI Dialog with Tailwind modal (quick simple) */}
        {showModal && (
          <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4">
            <div className="w-full max-w-md p-5 card">
              <h3 className="mb-2 text-xl font-semibold">Daily Earnings Breakdown</h3>
              <p><strong>Money Made:</strong> ${moneyMade.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              <p><strong>Money Lost:</strong> ${moneyLost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              <p className="mt-3 text-white/80">
                Based on your check-in, this is your sweat equity breakdown for yesterday.
              </p>
              <div className="flex justify-end gap-2 mt-5">
                <button className="btn btn-primary" onClick={handleContinue}>Continue to Dashboard</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyCheckInPage;