
import React from 'react';
import { useApp } from '../context/AppContext';
import { User, Check, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toLocalISOString } from '../lib/firestore';
import { ProgressRing } from '../components/ProgressRing';

export const Today: React.FC = () => {
  const { state, toggleHabit } = useApp();
  const navigate = useNavigate();
  
  // Date Logic (Local Time Safe via toLocalISOString)
  const today = new Date();
  const todayStr = toLocalISOString(today);
  const currentYear = today.getFullYear();
  const dayOfWeek = today.getDay(); // 0 (Sun) - 6 (Sat)
  
  // Calculate Start of Week (Sunday)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  // Generate Week Days (Show full week even if crossing year boundary)
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dateStr = toLocalISOString(d);
    return {
        dateStr,
        label: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
        dayNum: d.getDate(),
        isToday: dateStr === todayStr,
        isFuture: dateStr > todayStr
    };
  });

  const displayHabits = state.habits
    .filter(h => h.status === 'active')
    .sort((a, b) => {
        // 1. Timed habits first, sorted by time
        if (a.time !== undefined && b.time !== undefined) {
            if (a.time !== b.time) return a.time - b.time;
            return a.sortOrder - b.sortOrder; // Stable sort if same time
        }
        if (a.time !== undefined) return -1;
        if (b.time !== undefined) return 1;
        
        // 2. Untimed habits by sortOrder
        return a.sortOrder - b.sortOrder;
    });

  // Stats Logic: 
  // Total Potential = Active Habits * Number of Days Displayed
  const totalPotential = displayHabits.length * weekDays.length;
  
  // Calculate actual completions based on visible days
  let totalCompleted = 0;
  displayHabits.forEach(h => {
      weekDays.forEach(day => {
          const log = state.logs.find(l => l.date === day.dateStr);
          if (log && log.checks && log.checks[h.id]) {
              totalCompleted++;
          }
      });
  });
  
  const weeklyPercentage = totalPotential > 0 ? (totalCompleted / totalPotential) * 100 : 0;

  // --- INTERACTION HANDLERS ---

  const handleCellClick = (id: string, date: string, isFuture: boolean) => {
    if (isFuture) return;
    toggleHabit(id, date);
  };

  return (
    <div className="flex flex-col h-full bg-ledger-bg dark:bg-ledger-bgDark relative font-sans">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between sticky top-0 z-50 bg-ledger-bg/95 dark:bg-ledger-bgDark/95 backdrop-blur-xl border-b border-ledger-border dark:border-ledger-borderDark">
        <div>
            <h1 className="text-base font-bold text-ledger-text dark:text-ledger-textDark tracking-tight">
                Current Week
            </h1>
            <p className="text-xs text-ledger-muted mt-0.5 font-medium">
                {weekDays.length > 0 && (
                   <>{new Date(weekDays[0].dateStr.replace(/-/g, '/')).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(weekDays[weekDays.length-1].dateStr.replace(/-/g, '/')).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                )}
            </p>
        </div>
        <div className="flex items-center gap-1">
            <button 
                onClick={() => navigate('/leaderboard')} 
                className="p-2 text-yellow-500 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
                title="Leaderboard"
            >
                <Crown size={22} strokeWidth={2} fill="currentColor" className="opacity-100" />
            </button>
            <button onClick={() => navigate('/account')} className="p-2 -mr-2 text-ledger-text dark:text-ledger-textDark hover:opacity-70 transition-opacity">
                <User size={22} strokeWidth={2} />
            </button>
        </div>
      </header>

      {/* KPI Section - Compact Height */}
      <div className="relative py-4 bg-white dark:bg-[#111111] border-b border-ledger-border dark:border-ledger-borderDark flex flex-col items-center justify-center overflow-hidden">
         {/* Background Decoration */}
         <div className="absolute inset-0 bg-[radial-gradient(#00000005_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:16px_16px]" />
         
         <div className="relative z-10 flex flex-col items-center">
            <ProgressRing 
                radius={65} 
                stroke={8} 
                progress={weeklyPercentage} 
                className="mb-1"
            />
            <div className="flex flex-col items-center mt-1">
                 <div className="text-sm font-semibold text-ledger-text dark:text-ledger-textDark tracking-tight">
                     {totalCompleted} / {totalPotential}
                 </div>
                 <div className="text-[10px] font-bold text-ledger-muted uppercase tracking-wider">
                     Check-ins
                 </div>
            </div>
         </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 overflow-auto no-scrollbar pb-24 relative bg-ledger-bg dark:bg-ledger-bgDark">
         <table className="border-collapse min-w-full">
            <thead className="sticky top-0 z-40 bg-ledger-bg dark:bg-ledger-bgDark shadow-sm">
                <tr>
                    <th className="sticky left-0 top-0 z-50 bg-ledger-bg dark:bg-ledger-bgDark border-b border-r border-gray-100 dark:border-gray-800 px-4 py-4 text-left shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] dark:shadow-none bg-opacity-95 backdrop-blur-sm">
                        <span className="font-bold text-[10px] text-ledger-muted uppercase tracking-wider whitespace-nowrap">Task</span>
                    </th>
                    {weekDays.map(d => (
                        <th key={d.dateStr} className="sticky top-0 z-40 bg-ledger-bg dark:bg-ledger-bgDark border-b border-gray-100 dark:border-gray-800 px-2 py-4 min-w-[60px] bg-opacity-95 backdrop-blur-sm">
                            <div className={`flex flex-col items-center justify-center gap-1.5 ${d.isToday ? 'text-ledger-accent' : 'text-ledger-muted'}`}>
                                <span className="text-[10px] font-bold uppercase tracking-wider">{d.label}</span>
                                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-colors ${d.isToday ? 'bg-ledger-accent text-white shadow-md' : 'bg-transparent text-inherit'}`}>
                                    {d.dayNum}
                                </span>
                            </div>
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                {displayHabits.map(habit => (
                    <tr key={habit.id} className="group bg-white dark:bg-ledger-bgDark">
                        <td className="sticky left-0 z-30 bg-white dark:bg-ledger-bgDark border-r border-gray-100 dark:border-gray-800 px-4 py-3 whitespace-nowrap shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] dark:shadow-none">
                            <div className="flex flex-col items-start gap-1">
                                <span className="text-sm font-semibold text-ledger-text dark:text-ledger-textDark leading-tight">
                                    {habit.name}
                                </span>
                                {habit.time !== undefined && (
                                    <span className="text-[10px] font-mono text-ledger-muted bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded">
                                        {String(Math.floor(habit.time / 60)).padStart(2, '0')}:{String(habit.time % 60).padStart(2, '0')}
                                    </span>
                                )}
                            </div>
                        </td>
                        
                        {weekDays.map(d => {
                             const log = state.logs.find(l => l.date === d.dateStr);
                             const isCompleted = log?.checks && log.checks[habit.id];
                             
                             // Logic
                             const isPast = d.dateStr < todayStr;
                             
                             // Styles
                             let cellContent = null;
                             let cellClass = "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 border-2 mx-auto relative overflow-hidden";
                             
                             if (d.isFuture) {
                                 // FUTURE: Visible but disabled/faded
                                 // Using border-2 to maintain size, but made border distinct or transparent with background
                                 cellClass += " border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-white/5 opacity-50 cursor-not-allowed";
                             } else if (isCompleted) {
                                 // Completed
                                 cellClass += " border-ledger-accent bg-ledger-accent text-white shadow-sm cursor-pointer active:scale-95 hover:brightness-110";
                                 cellContent = <Check size={20} strokeWidth={4} />;
                             } else {
                                 // Not completed (Past or Today) -> ALWAYS EDITABLE
                                 if (isPast) {
                                     // Past
                                     cellClass += " border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-ledger-surfaceDark hover:border-ledger-accent cursor-pointer group-hover:bg-gray-50 dark:group-hover:bg-white/5";
                                 } else {
                                     // Today
                                     cellClass += " border-gray-200 dark:border-gray-700 bg-white dark:bg-ledger-surfaceDark hover:border-ledger-accent cursor-pointer";
                                 }
                             }

                            return (
                                <td key={d.dateStr} className="px-2 py-2">
                                     <button
                                        onClick={() => handleCellClick(habit.id, d.dateStr, d.isFuture)}
                                        disabled={d.isFuture} 
                                        className="block w-full disabled:cursor-auto"
                                     >
                                         <div className={cellClass}>
                                             {cellContent}
                                             
                                             {/* Past Indicator for unfilled days to hint editability */}
                                             {isPast && !isCompleted && (
                                                 <div className="absolute top-0 right-0 p-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-ledger-accent/20" />
                                                 </div>
                                             )}
                                         </div>
                                     </button>
                                </td>
                            );
                        })}
                    </tr>
                ))}
            </tbody>
         </table>
      </div>
    </div>
  );
};
