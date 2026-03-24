
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ChevronLeft, ChevronRight, Check, Zap, X, Trophy, Star, Crown, Medal, Flame } from 'lucide-react';
import { toLocalISOString, getWeekParams, getWeekRange, getLeaderboard } from '../lib/firestore';
import { auth } from '../lib/firebase';

type ViewMode = 'Year' | 'Month' | 'Week';

interface TopHabitData {
    name: string;
    count: number;
}

const YearRecap: React.FC<{
    onClose: () => void;
    weeks: any[];
    currentWeekIdx: number;
    year: number;
    totalLogged: number;
    streak: number;
    motto: string;
    topHabit: TopHabitData | null;
    rank: number | null;
}> = ({ onClose, weeks, currentWeekIdx, year, totalLogged, streak, motto, topHabit, rank }) => {
    // Phases: intro -> grid -> statsCheckIns -> statsStreak -> topHabit -> rank? -> outro
    const [phase, setPhase] = useState<'intro' | 'grid' | 'statsCheckIns' | 'statsStreak' | 'topHabit' | 'rank' | 'outro'>('intro');
    const [gridIdx, setGridIdx] = useState(-1);
    
    // Auto-advance sequence
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        
        const next = (p: typeof phase, delay: number) => {
            timer = setTimeout(() => setPhase(p), delay);
        };

        if (phase === 'intro') {
            next('grid', 2200);
        } else if (phase === 'grid') {
            // Managed by interval, but safety
        } else if (phase === 'statsCheckIns') {
             next('statsStreak', 3500);
        } else if (phase === 'statsStreak') {
             next('topHabit', 3500);
        } else if (phase === 'topHabit') {
             next(rank ? 'rank' : 'outro', 4000);
        } else if (phase === 'rank') {
             next('outro', 4000);
        } else if (phase === 'outro') {
             timer = setTimeout(onClose, 4500);
        }
        return () => clearTimeout(timer);
    }, [phase, onClose, rank]);

    // Grid Animation Loop
    useEffect(() => {
        if (phase === 'grid') {
            const interval = setInterval(() => {
                setGridIdx(prev => {
                    if (prev >= currentWeekIdx + 2) { 
                        clearInterval(interval);
                        setTimeout(() => setPhase('statsCheckIns'), 800);
                        return prev;
                    }
                    return prev + 1;
                });
            }, 20); // Slightly faster
            return () => clearInterval(interval);
        }
    }, [phase, currentWeekIdx]);

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6 animate-fade-in text-white overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-800/30 via-black to-black" />
            
            {/* Close Button */}
            <button 
                onClick={onClose}
                className="absolute top-6 right-6 z-50 p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors backdrop-blur-sm"
            >
                <X size={24} className="text-white" />
            </button>

            {/* PHASE: INTRO */}
            {phase === 'intro' && (
                <div className="flex flex-col items-center animate-slide-up relative z-10">
                    <div className="w-20 h-1 bg-ledger-accent mb-8 rounded-full shadow-[0_0_20px_var(--ledger-accent)]" />
                    <h1 className="text-8xl font-black tracking-tighter mb-4 text-white drop-shadow-2xl">
                        {year}
                    </h1>
                    <p className="text-xl font-bold text-gray-400 tracking-[0.3em] uppercase animate-pulse">
                        Year in Review
                    </p>
                </div>
            )}

            {/* PHASE: GRID BACKGROUND */}
            {(phase === 'grid' || phase === 'statsCheckIns' || phase === 'statsStreak' || phase === 'topHabit' || phase === 'rank' || phase === 'outro') && (
                <div className={`transition-all duration-1000 absolute inset-0 flex flex-col items-center justify-center ${phase !== 'grid' ? 'opacity-5 scale-125 blur-sm grayscale' : 'opacity-100 scale-100'}`}>
                   <div className="grid grid-cols-7 gap-1.5 p-4 max-w-sm mx-auto">
                       {weeks.map((w, i) => {
                           if (phase === 'grid' && i > gridIdx) return <div key={i} className="w-3 h-3 sm:w-4 sm:h-4 opacity-0" />; 
                           
                           const isFilled = w.fillPercent > 0;
                           const isHighlight = i === gridIdx;
                           
                           return (
                               <div 
                                   key={i}
                                   className={`w-3 h-3 sm:w-4 sm:h-4 rounded-[2px] transition-all duration-300
                                      ${isFilled 
                                          ? 'bg-ledger-accent shadow-[0_0_8px_rgba(255,255,255,0.4)]' 
                                          : 'bg-gray-800/50'
                                      }
                                      ${isHighlight ? 'scale-150 bg-white shadow-[0_0_15px_white] z-20' : 'scale-100'}
                                   `}
                               />
                           )
                       })}
                   </div>
                   {phase === 'grid' && (
                       <p className="mt-12 text-center font-mono text-ledger-accent text-xs tracking-widest animate-pulse">
                           PROCESSING ACTIVITY...
                       </p>
                   )}
                </div>
            )}

            {/* PHASE: STATS - CHECK INS */}
            {phase === 'statsCheckIns' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 animate-fade-in p-8">
                     <div className="text-center transform transition-all duration-500 hover:scale-105 animate-slide-up">
                         <div className="w-20 h-20 bg-ledger-accent/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-ledger-accent/50 shadow-[0_0_40px_rgba(var(--ledger-accent),0.4)]">
                             <Check size={40} className="text-ledger-accent" strokeWidth={4} />
                         </div>
                         <h2 className="text-7xl font-black text-white mb-2 tracking-tighter drop-shadow-lg">{totalLogged}</h2>
                         <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] border-t border-gray-800 pt-4 inline-block px-8">Check-ins</p>
                     </div>
                </div>
            )}

            {/* PHASE: STATS - STREAK */}
            {phase === 'statsStreak' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 animate-fade-in p-8">
                     <div className="text-center transform transition-all duration-500 hover:scale-105 animate-slide-up">
                         <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-orange-500/50 shadow-[0_0_30px_rgba(249,115,22,0.3)]">
                             <Flame size={40} className="text-orange-500 fill-orange-500" />
                         </div>
                         <h2 className="text-7xl font-black text-white mb-2 tracking-tighter drop-shadow-lg">{streak} Days</h2>
                         <p className="text-sm font-bold text-gray-400 uppercase tracking-[0.2em] border-t border-gray-800 pt-4 inline-block px-8">Active Streak</p>
                     </div>
                </div>
            )}

            {/* PHASE: TOP HABIT */}
            {phase === 'topHabit' && topHabit && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 animate-fade-in p-8 text-center">
                    <p className="text-sm font-bold text-ledger-accent uppercase tracking-[0.3em] mb-8 animate-slide-up">Most Consistent</p>
                    
                    <div className="relative mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                        <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-ledger-accent to-black border border-ledger-accent flex items-center justify-center shadow-[0_0_60px_rgba(var(--ledger-accent),0.3)] rotate-3">
                            <Star size={64} className="text-white fill-white" />
                        </div>
                        <div className="absolute -bottom-4 -right-4 bg-white text-black font-black text-xl px-4 py-2 rounded-full shadow-lg">
                            {topHabit.count}
                        </div>
                    </div>
                    
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight animate-slide-up" style={{ animationDelay: '0.2s' }}>
                        {topHabit.name}
                    </h2>
                </div>
            )}

            {/* PHASE: RANK (Only if Ranked) */}
            {phase === 'rank' && rank && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 animate-fade-in p-8 text-center">
                    <p className="text-sm font-bold text-yellow-500 uppercase tracking-[0.3em] mb-10 animate-slide-up">Hall of Fame</p>
                    
                    <div className="relative mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                        <div className="w-40 h-40 rounded-full bg-gradient-to-b from-yellow-300/20 to-transparent border-2 border-yellow-500 flex items-center justify-center shadow-[0_0_80px_rgba(234,179,8,0.3)]">
                            <Crown size={80} className="text-yellow-500 fill-yellow-500/20" strokeWidth={1.5} />
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
                        <span className="text-2xl font-bold text-gray-400 mb-2">Global Rank</span>
                        <span className="text-8xl font-black text-white tracking-tighter drop-shadow-[0_4px_0_rgba(234,179,8,1)]">
                            #{rank}
                        </span>
                    </div>
                </div>
            )}

            {/* PHASE: OUTRO */}
            {phase === 'outro' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-20 animate-fade-in px-8 text-center max-w-lg mx-auto">
                    <p className="text-3xl md:text-4xl font-bold text-gray-200 mb-10 leading-snug italic font-serif">
                        "{motto || "Consistently relentless."}"
                    </p>
                    <div className="w-20 h-1.5 bg-ledger-accent rounded-full mb-8 shadow-[0_0_20px_var(--ledger-accent)]" />
                    <h3 className="text-xl font-black text-white uppercase tracking-[0.3em] animate-pulse">
                        Keep Building
                    </h3>
                </div>
            )}
        </div>
    );
};

export const Progress: React.FC = () => {
  const { state, stats, isLoading } = useApp();
  const [view, setView] = useState<ViewMode>('Year');
  
  // Navigation States
  const [selectedWeekOffset, setSelectedWeekOffset] = useState(0);
  
  // Animation State
  const [showRecap, setShowRecap] = useState(false);
  const [userRank, setUserRank] = useState<number | null>(null);
  
  // Scroll Refs
  const monthRefs = useRef<(HTMLDivElement | null)[]>([]);

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonthIndex = today.getMonth();
  const todayStr = toLocalISOString(today);

  // --- DATA PROCESSING ---

  // Top Habit Calculation
  const topHabit = useMemo(() => {
      const counts: Record<string, number> = {};
      state.logs.forEach(log => {
          if (log.checks) {
              Object.keys(log.checks).forEach(id => {
                  counts[id] = (counts[id] || 0) + 1;
              });
          }
      });
      
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      if (sorted.length === 0) return null;
      
      const [id, count] = sorted[0];
      const habit = state.habits.find(h => h.id === id);
      return habit ? { name: habit.name, count } : null;
  }, [state.logs, state.habits]);

  // Rank Fetching
  useEffect(() => {
      const fetchRank = async () => {
          if (!auth.currentUser || !state.isRanked) {
              setUserRank(null);
              return;
          }
          try {
              const leaderboard = await getLeaderboard();
              const idx = leaderboard.findIndex(e => e.id === auth.currentUser?.uid);
              if (idx !== -1) {
                  setUserRank(idx + 1);
              } else {
                  setUserRank(null);
              }
          } catch (e) {
              console.error("Rank fetch failed", e);
          }
      };

      // Fetch rank on mount or when showRecap changes to true (to ensure fresh data)
      fetchRank();
  }, [state.isRanked, showRecap]);


  // Helper: Is habit applicable on date?
  const isApplicable = (habitId: string, dateStr: string) => {
      const habit = state.habits.find(h => h.id === habitId);
      if (!habit) return false;
      return dateStr >= habit.activeFrom && (!habit.inactiveFrom || dateStr < habit.inactiveFrom);
  };

  // Generate Year Grid Data strictly
  const generateYearGrid = () => {
      const weeks = [];
      let d = new Date(currentYear, 0, 1);
      
      // Align to start of week (Sunday)
      while (d.getDay() !== 0) {
          d.setDate(d.getDate() - 1);
      }

      let currentWeekIdx = -1;

      // Generate 53 weeks to cover year boundaries safely
      for (let i = 0; i < 53; i++) {
          const weekStart = new Date(d);
          const weekEnd = new Date(d);
          weekEnd.setDate(weekEnd.getDate() + 6);
          
          const sStr = toLocalISOString(weekStart);
          const eStr = toLocalISOString(weekEnd);

          const isCurrent = todayStr >= sStr && todayStr <= eStr;
          if (isCurrent) currentWeekIdx = i;
          
          const weekId = `week${i + 1}`;
          const fillPercent = state.weeklyStats[weekId] || 0;

          weeks.push({
              id: i,
              fillPercent,
              startDate: weekStart,
              endDate: weekEnd,
              isCurrent,
              weekNum: i + 1,
              // Temporarily mark future until we know currentWeekIdx
              isFuture: false 
          });
          
          d.setDate(d.getDate() + 7);
      }
      
      // Post-process for isFuture using the found current index
      return { 
          weeks: weeks.map(w => ({
              ...w,
              isFuture: currentWeekIdx !== -1 && w.id > currentWeekIdx
          })), 
          currentWeekIdx 
      };
  };

  const { weeks: yearWeeks, currentWeekIdx } = generateYearGrid();

  // Auto-scroll effect
  useEffect(() => {
    if (view === 'Month' && monthRefs.current[currentMonthIndex]) {
        // Small delay to ensure layout is painted
        setTimeout(() => {
            monthRefs.current[currentMonthIndex]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
    }
  }, [view, currentMonthIndex]);

  // --- VIEW: YEAR ---
  const renderYearView = () => {
    return (
        <div className="grid grid-cols-7 gap-3 px-2">
            {yearWeeks.map((w) => (
                <button
                    key={w.id}
                    disabled={w.isFuture}
                    onClick={() => {
                        // Calculate offset relative to the actual current week index
                        const offset = w.id - currentWeekIdx;
                        setSelectedWeekOffset(offset);
                        setView('Week');
                    }}
                    className={`aspect-square rounded-md border relative overflow-hidden flex items-end justify-center transition-all
                        ${w.isFuture 
                             ? 'border-gray-100 dark:border-gray-800 opacity-20 cursor-default' 
                             : 'border-gray-200 dark:border-gray-800 cursor-pointer hover:border-ledger-accent'
                        }
                        ${w.isCurrent ? 'ring-2 ring-ledger-accent ring-offset-2 dark:ring-offset-ledger-bgDark' : ''}
                    `}
                >
                    {!w.isFuture && (
                        <div 
                            className="absolute inset-x-0 bottom-0 bg-ledger-accent transition-all duration-700 ease-out opacity-80"
                            style={{ height: `${Math.max(w.fillPercent, 0)}%` }}
                        />
                    )}
                    <span className="relative z-10 text-[10px] font-bold text-ledger-text dark:text-ledger-textDark mix-blend-difference mb-1">
                        {w.weekNum}
                    </span>
                </button>
            ))}
        </div>
    );
  };

  // --- VIEW: MONTH ---
  const renderMonthView = () => {
    // Render all 12 months in a scrollable list
    const months = Array.from({ length: 12 }, (_, i) => i);

    return (
        <div className="h-full flex flex-col -mt-2">
             {/* Sticky Headers for Days */}
             <div className="grid grid-cols-7 gap-3 px-4 py-3 bg-ledger-bg dark:bg-ledger-bgDark z-10 border-b border-gray-100 dark:border-gray-800">
                {['S','M','T','W','T','F','S'].map((d, i) => (
                    <div key={i} className="text-center text-[10px] font-bold text-ledger-muted uppercase">{d}</div>
                ))}
            </div>

             <div className="overflow-y-auto flex-1 px-4 pb-20 no-scrollbar">
                {months.map(monthIndex => {
                    const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
                    const firstDayIndex = new Date(currentYear, monthIndex, 1).getDay(); // 0-6
                    const monthName = new Date(currentYear, monthIndex, 1).toLocaleDateString('en-US', { month: 'long' });

                    const days = Array.from({ length: daysInMonth }, (_, i) => {
                        const d = new Date(currentYear, monthIndex, i + 1);
                        const dateStr = toLocalISOString(d);
                        const hasLog = !!state.logs.find(l => l.date === dateStr);
                        const isToday = dateStr === todayStr;
                        return { dateStr, dayNum: i + 1, hasLog, isToday, dateObj: d };
                    });

                    const blanks = Array.from({ length: firstDayIndex }, (_, i) => i);

                    return (
                        <div 
                            key={monthIndex} 
                            ref={el => { monthRefs.current[monthIndex] = el }}
                            className="pt-6 pb-2"
                        >
                            <h3 className="text-sm font-bold text-ledger-text dark:text-ledger-textDark mb-4 sticky top-0 bg-ledger-bg dark:bg-ledger-bgDark py-1 z-0 inline-block px-1 rounded-md">
                                {monthName}
                            </h3>
                            <div className="grid grid-cols-7 gap-3">
                                {blanks.map(i => <div key={`blank-${i}`} />)}

                                {days.map(d => {
                                    const isFuture = d.dateStr > todayStr;
                                    const isBeforeYearStart = d.dateStr < `${currentYear}-01-01`; 
                                    const isDisabled = isFuture || isBeforeYearStart;

                                    let className = "aspect-square rounded-lg flex items-center justify-center text-sm font-semibold transition-all relative ";
                                    
                                    if (d.isToday) {
                                        if (d.hasLog) {
                                            className += "bg-ledger-accent text-white shadow-sm border-2 border-ledger-text dark:border-white";
                                        } else {
                                            className += "bg-transparent text-ledger-accent border-2 border-ledger-accent";
                                        }
                                    } else {
                                        if (d.hasLog) {
                                             className += "bg-ledger-accent text-white shadow-sm";
                                        } else {
                                             className += "bg-white dark:bg-ledger-surfaceDark text-ledger-muted border border-gray-100 dark:border-gray-800";
                                        }
                                    }

                                    if (isDisabled) {
                                        className += " opacity-30 cursor-not-allowed";
                                    } else {
                                        className += " cursor-pointer hover:scale-105 active:scale-95";
                                    }

                                    return (
                                        <button 
                                            key={d.dateStr} 
                                            className={className}
                                            disabled={isDisabled}
                                            onClick={() => {
                                                // Jump to Week
                                                const t = new Date(d.dateObj);
                                                const c = new Date(today);
                                                
                                                // Align to Sundays
                                                t.setDate(t.getDate() - t.getDay());
                                                c.setDate(c.getDate() - c.getDay());
                                                
                                                t.setHours(0,0,0,0);
                                                c.setHours(0,0,0,0);
                                                
                                                const diff = t.getTime() - c.getTime();
                                                const weeks = Math.round(diff / (1000 * 60 * 60 * 24 * 7));
                                                
                                                setSelectedWeekOffset(weeks);
                                                setView('Week');
                                            }}
                                        >
                                            {d.dayNum}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
             </div>
        </div>
    );
  };

  // --- VIEW: WEEK ---
  const renderWeekView = () => {
      // Logic: x is SUN to SAT.
      // 1. Determine the Sunday of the selected week offset.
      const startOfSelectedWeek = new Date(today);
      const day = startOfSelectedWeek.getDay(); // 0 is Sunday
      const diff = startOfSelectedWeek.getDate() - day + (selectedWeekOffset * 7);
      startOfSelectedWeek.setDate(diff); // This is Sunday
      
      const weekDays = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(startOfSelectedWeek);
          d.setDate(d.getDate() + i);
          const dateStr = toLocalISOString(d);
          
          // 1. Get Checks for this day
          const log = state.logs.find(l => l.date === dateStr);
          const completedCount = log?.checks ? Object.keys(log.checks).length : 0;

          // 2. Determine Denominator (Total Possible)
          let dailyPossible = 0;

          // Use User's Reverse Logic: lastPercent -> Total Possible -> Daily Possible
          const { weekId, year } = getWeekParams(d);
          const lastPercent = state.weeklyStats[weekId];

          if (typeof lastPercent === 'number' && lastPercent > 0) {
             // Calculate Total Checks in this Week
             const checksInWeek = state.logs
                .filter(l => l.weekId === weekId)
                .reduce((sum, l) => sum + Object.keys(l.checks || {}).length, 0);
             
             // impliedTotalPossibleForWeek = (checksInWeek / lastPercent) * 100
             const impliedTotalPossibleForWeek = (checksInWeek / lastPercent) * 100;
             
             // Get days in this specific week (handle partial weeks at year start)
             const { start, end } = getWeekRange(parseInt(year), parseInt(weekId.replace('week','')));
             const daysInThisWeek = Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;
             
             // Daily possible is the implied total divided by number of days in that week
             dailyPossible = Math.round(impliedTotalPossibleForWeek / daysInThisWeek);
          }

          // Fallback if logic fails (e.g. lastPercent is 0 or missing, or not loaded)
          if (!dailyPossible || dailyPossible === 0) {
              state.habits.forEach(h => {
                  if (isApplicable(h.id, dateStr)) {
                      dailyPossible++;
                  }
              });
          }
          
          // y = checked / total (possible)
          const pct = dailyPossible > 0 ? (completedCount / dailyPossible) * 100 : 0;
          const isDifferentYear = d.getFullYear() !== currentYear;
          const isToday = dateStr === todayStr;
          
          // Hardcoded Sun-Sat labels for consistency with axis request
          const label = ['S','M','T','W','T','F','S'][i];

          return { 
              label, 
              pct, 
              dateStr,
              isDifferentYear,
              isToday,
              possible: dailyPossible
          };
      });
      
      const endOfSelectedWeek = new Date(startOfSelectedWeek);
      endOfSelectedWeek.setDate(endOfSelectedWeek.getDate() + 6);

      const isEarliestWeek = selectedWeekOffset <= -currentWeekIdx; // Correct bound check

      return (
          <div className="h-full overflow-y-auto no-scrollbar px-4 pb-12">
              <div className="flex items-center justify-between mb-8 bg-white dark:bg-ledger-surfaceDark p-3 rounded-lg border border-gray-100 dark:border-gray-800 shadow-sm">
                  <button 
                    onClick={() => setSelectedWeekOffset(p => p - 1)} 
                    disabled={isEarliestWeek}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                      <ChevronLeft size={20} className="text-ledger-text dark:text-ledger-textDark" />
                  </button>
                  <span className="text-sm font-bold text-ledger-text dark:text-ledger-textDark">
                      {startOfSelectedWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {endOfSelectedWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <button 
                    onClick={() => setSelectedWeekOffset(p => p + 1)} 
                    disabled={selectedWeekOffset >= 0} 
                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                      <ChevronRight size={20} className="text-ledger-text dark:text-ledger-textDark" />
                  </button>
              </div>

              <div className="h-64 flex items-end justify-between gap-3 p-4 bg-white dark:bg-ledger-surfaceDark rounded-xl border border-ledger-border dark:border-ledger-borderDark">
                  {weekDays.map((d, i) => (
                      <div key={i} className={`flex flex-col items-center gap-2 flex-1 h-full justify-end group ${d.isDifferentYear ? 'opacity-30 grayscale' : ''}`}>
                          {/* Bar */}
                          <div className="w-full bg-gray-100 dark:bg-white/5 rounded-t-sm relative h-full flex items-end overflow-hidden">
                              <div 
                                  className={`w-full bg-ledger-accent transition-all duration-500 ease-out rounded-t-sm ${d.isDifferentYear ? 'bg-gray-400' : ''}`}
                                  style={{ height: `${d.pct}%` }} 
                              />
                          </div>
                          
                          {/* Label (Sun-Sat) */}
                          <div className={`
                             flex items-center justify-center rounded-md px-1.5 py-0.5
                             ${d.isToday 
                                ? 'bg-ledger-accent text-white shadow-sm' 
                                : 'bg-transparent text-ledger-muted'
                             }
                          `}>
                              <span className="text-xs font-bold uppercase">{d.label}</span>
                          </div>
                      </div>
                  ))}
              </div>

              {/* History List */}
              <div className="mt-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                  <h3 className="text-xs font-bold text-ledger-muted uppercase tracking-wider mb-4 px-1">Weekly History</h3>
                  <div className="space-y-3">
                      {[...weekDays].reverse().map((d) => {
                          if (d.dateStr > todayStr) return null; // Don't show future days in history log

                          const [y, m, dayNum] = d.dateStr.split('-').map(Number);
                          const dateObj = new Date(y, m - 1, dayNum);
                          const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                          const dayDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          
                          const log = state.logs.find(l => l.date === d.dateStr);
                          const checks = log?.checks || {};
                          const completedHabitIds = Object.keys(checks);
                          const completedHabits = state.habits.filter(h => completedHabitIds.includes(h.id));

                          return (
                              <div key={d.dateStr} className="bg-white dark:bg-ledger-surfaceDark rounded-xl p-4 border border-ledger-border dark:border-ledger-borderDark shadow-sm">
                                   <div className="flex items-center justify-between mb-3 border-b border-gray-50 dark:border-gray-800 pb-2">
                                      <span className={`text-sm font-bold ${d.isToday ? 'text-ledger-accent' : 'text-ledger-text dark:text-ledger-textDark'}`}>
                                          {dayName}, {dayDate}
                                      </span>
                                      {d.isToday && <span className="text-[10px] font-bold bg-ledger-accent text-white px-2 py-0.5 rounded-full">TODAY</span>}
                                   </div>
                                   
                                   {completedHabits.length > 0 ? (
                                       <div className="grid grid-cols-1 gap-2">
                                           {completedHabits.map(h => (
                                               <div key={h.id} className="flex items-center gap-3">
                                                   <div className="w-4 h-4 rounded-full bg-ledger-accent flex items-center justify-center shrink-0">
                                                      <Check size={10} className="text-white" strokeWidth={4} />
                                                   </div>
                                                   <span className="text-sm font-medium text-ledger-text dark:text-ledger-textDark">{h.name}</span>
                                               </div>
                                           ))}
                                       </div>
                                   ) : (
                                       <p className="text-xs text-ledger-muted italic pl-1">No completed tasks.</p>
                                   )}
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="flex flex-col h-full bg-ledger-bg dark:bg-ledger-bgDark p-4 overflow-y-auto no-scrollbar relative">
      <header className="mb-6 flex items-center justify-between px-2">
        <h1 className="text-2xl font-bold text-ledger-text dark:text-ledger-textDark">Progress</h1>
        <button 
            onClick={() => setShowRecap(true)}
            className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-ledger-accent hover:text-white dark:hover:bg-ledger-accent text-ledger-text dark:text-ledger-textDark transition-all active:scale-95 shadow-sm"
            title="Year Recap"
        >
            <Zap size={20} className="fill-current" />
        </button>
      </header>

      {/* View Switcher */}
      <div className="flex p-1 bg-gray-200 dark:bg-[#1A1A1A] rounded-xl mb-6 mx-2 shrink-0">
          {(['Year', 'Month', 'Week'] as ViewMode[]).map(mode => (
              <button 
                key={mode}
                onClick={() => {
                    setView(mode);
                    if(mode === 'Week') setSelectedWeekOffset(0);
                }}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wide rounded-lg transition-all ${view === mode ? 'bg-white dark:bg-ledger-surfaceDark text-ledger-text dark:text-ledger-textDark shadow-sm' : 'text-ledger-muted'}`}
              >
                  {mode}
              </button>
          ))}
      </div>

      <div className="flex-1 animate-fade-in overflow-hidden">
          {view === 'Year' && (
              <div className="h-full overflow-y-auto no-scrollbar pb-10">
                  <h3 className="px-2 text-xs font-bold text-ledger-muted uppercase tracking-wider mb-4">{currentYear} Overview</h3>
                  {renderYearView()}
              </div>
          )}
          {view === 'Month' && renderMonthView()}
          {view === 'Week' && renderWeekView()}
      </div>

      {/* Recap Overlay */}
      {showRecap && (
          <YearRecap 
             onClose={() => setShowRecap(false)}
             weeks={yearWeeks}
             currentWeekIdx={currentWeekIdx}
             year={currentYear}
             totalLogged={stats.totalLoggedDays}
             streak={stats.currentStreak}
             motto={state.motto}
             topHabit={topHabit}
             rank={userRank}
          />
      )}
    </div>
  );
};
