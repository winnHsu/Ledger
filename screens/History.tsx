import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, CheckCircle, XCircle } from 'lucide-react';

export const History: React.FC = () => {
  const { state } = useApp();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Generate last 30 days
  const today = new Date();
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split('T')[0];
  });

  const getLogForDate = (date: string) => state.logs.find(l => l.date === date);

  const getDayScore = (date: string) => {
    const log = getLogForDate(date);
    // Find active habits AT THAT TIME is hard without history tracking of habit activation. 
    // MVP Assumption: Score based on CURRENT active habits to keep data model simple, 
    // or just raw count. Let's use current active habits count as denominator.
    const activeCount = state.habits.filter(h => h.status === 'active').length;
    if (activeCount === 0) return 0;
    
    const completedCount = Object.keys(log?.checks || {}).filter(id => {
         // Filter to ensure we only count habits that are still in the system (even if archived, they exist)
         return state.habits.find(h => h.id === id);
    }).length || 0;

    return completedCount / activeCount;
  };

  const totalLoggedDays = state.logs.length;
  // Simple average calc
  const averageScore = state.logs.reduce((acc, log) => {
     const activeCount = state.habits.filter(h => h.status === 'active').length || 1;
     const completedCount = Object.keys(log.checks || {}).length;
     return acc + (completedCount / activeCount);
  }, 0) / (totalLoggedDays || 1);


  return (
    <div className="flex flex-col h-full bg-ledger-bg dark:bg-ledger-bgDark p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-ledger-text dark:text-ledger-textDark">History</h1>
      </header>

      {/* 30 Day Grid */}
      <div className="grid grid-cols-7 gap-2 mb-8">
        {days.map((date) => {
          const score = getDayScore(date);
          const isToday = date === today.toISOString().split('T')[0];
          
          let bgColor = 'bg-gray-200 dark:bg-[#262626]'; // Default 0%
          if (score >= 1) bgColor = 'bg-ledger-accent';
          else if (score > 0) bgColor = 'bg-ledger-accent opacity-50'; // Simplification for partial

          return (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`aspect-square rounded-sm ${bgColor} relative hover:opacity-80 transition-opacity`}
            >
                {isToday && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-white rounded-full shadow-sm" />}
            </button>
          );
        })}
      </div>

      {/* Summary */}
      <div className="bg-white dark:bg-ledger-surfaceDark rounded-lg p-6 border border-ledger-border dark:border-ledger-borderDark shadow-sm">
        <h3 className="text-sm font-medium text-ledger-muted uppercase tracking-wider mb-4">This Month</h3>
        <div className="flex justify-between items-end">
            <div>
                <p className="text-3xl font-semibold text-ledger-text dark:text-ledger-textDark">{Math.round(averageScore * 100)}%</p>
                <p className="text-sm text-ledger-muted mt-1">Consistency</p>
            </div>
            <div className="text-right">
                <p className="text-3xl font-semibold text-ledger-text dark:text-ledger-textDark">{totalLoggedDays}</p>
                <p className="text-sm text-ledger-muted mt-1">Days logged</p>
            </div>
        </div>
      </div>

      {/* Bottom Sheet Modal */}
      {selectedDate && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/20 backdrop-blur-sm transition-opacity" onClick={() => setSelectedDate(null)}>
          <div 
            className="w-full bg-white dark:bg-[#1A1A1A] rounded-t-2xl p-6 animate-slide-up shadow-2xl" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-ledger-text dark:text-ledger-textDark">
                {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
              <button onClick={() => setSelectedDate(null)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                <X size={16} />
              </button>
            </div>
            
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                {state.habits.filter(h => h.status === 'active').map(habit => {
                    const log = getLogForDate(selectedDate);
                    const isCompleted = log?.checks && log.checks[habit.id];
                    
                    return (
                        <div key={habit.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                            <span className="text-ledger-text dark:text-ledger-textDark">{habit.name}</span>
                            <div className="flex items-center gap-2">
                                {isCompleted ? (
                                    <>
                                        <span className="text-xs font-medium text-ledger-accent uppercase">Complete</span>
                                        <CheckCircle size={18} className="text-ledger-accent" />
                                    </>
                                ) : (
                                    <>
                                        <span className="text-xs font-medium text-ledger-muted uppercase">Missed</span>
                                        <XCircle size={18} className="text-ledger-muted" />
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
                 {state.habits.filter(h => h.status === 'active').length === 0 && (
                     <p className="text-center text-ledger-muted py-4">No active habits tracked.</p>
                 )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};