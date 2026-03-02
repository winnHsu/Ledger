
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Flame, Crown, Medal } from 'lucide-react';
import { getLeaderboard, LeaderboardEntry } from '../lib/firestore';
import { useApp } from '../context/AppContext';
import { auth } from '../lib/firebase';

export const Leaderboard: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useApp(); // Access global state if needed for theme, etc.
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Get current user ID synchronously for UI highlighting
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    const fetch = async () => {
        const data = await getLeaderboard();
        setEntries(data);
        setLoading(false);
    };
    fetch();
  }, []);

  const getRankVisual = (rank: number) => {
      // 1st Place
      if (rank === 1) {
          return (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-100 to-yellow-50 dark:from-yellow-900/40 dark:to-yellow-900/10 flex items-center justify-center ring-1 ring-yellow-500/30 shadow-[0_2px_8px_-2px_rgba(234,179,8,0.3)]">
                  <Crown size={18} className="text-yellow-600 dark:text-yellow-400 fill-yellow-600 dark:fill-yellow-400" strokeWidth={2.5} />
              </div>
          );
      }
      
      // 2nd Place
      if (rank === 2) {
          return (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-800/50 flex items-center justify-center ring-1 ring-slate-400/30 shadow-sm">
                  <Medal size={18} className="text-slate-500 dark:text-slate-300" strokeWidth={2.5} />
              </div>
          );
      }
      
      // 3rd Place
      if (rank === 3) {
          return (
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/40 dark:to-orange-900/10 flex items-center justify-center ring-1 ring-orange-500/30 shadow-sm">
                  <Medal size={18} className="text-orange-600 dark:text-orange-400" strokeWidth={2.5} />
              </div>
          );
      }
      
      // 4th - 10th Place (Elite)
      if (rank <= 10) {
          return (
              <div className="w-9 h-9 rounded-full bg-ledger-surface dark:bg-white/5 flex items-center justify-center border border-ledger-border dark:border-ledger-borderDark relative overflow-hidden group">
                  <div className="absolute inset-0 bg-indigo-500/5 dark:bg-indigo-400/10" />
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono relative z-10">{rank}</span>
              </div>
          );
      }
      
      // 11th+ Place (Standard)
      return (
          <div className="w-9 h-9 flex items-center justify-center">
              <span className="text-sm font-medium text-ledger-muted font-mono">{rank}</span>
          </div>
      );
  };

  return (
    <div className="h-full flex flex-col bg-ledger-bg dark:bg-ledger-bgDark">
      <header className="px-6 py-5 flex items-center gap-4 border-b border-ledger-border dark:border-ledger-borderDark bg-ledger-bg/95 dark:bg-ledger-bgDark/95 backdrop-blur-xl sticky top-0 z-50">
        <button onClick={() => navigate('/today')} className="p-2 -ml-2 text-ledger-muted hover:text-ledger-text dark:hover:text-white transition-colors">
            <ChevronLeft size={24} />
        </button>
        <div>
            <h1 className="text-xl font-bold text-ledger-text dark:text-ledger-textDark tracking-tight">Hall of Fame</h1>
            <p className="text-xs text-ledger-muted">Top streaks worldwide</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4">
          {loading ? (
              <div className="flex flex-col items-center justify-center h-64 opacity-50">
                  <div className="w-8 h-8 border-2 border-ledger-accent border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-xs text-ledger-muted">Loading rankings...</p>
              </div>
          ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-ledger-muted">
                  <p>No ranked users found.</p>
              </div>
          ) : (
              <div className="space-y-3 pb-12">
                  {entries.map((entry, index) => {
                      const rank = index + 1;
                      const isCurrentUser = entry.id === currentUserId;
                      
                      return (
                        <div 
                            key={entry.id}
                            className={`flex items-center p-3.5 rounded-2xl border transition-all animate-fade-in
                                ${isCurrentUser 
                                    ? 'bg-ledger-accent/5 border-ledger-accent shadow-[0_0_15px_-5px_rgba(var(--ledger-accent),0.2)]' 
                                    : 'bg-white dark:bg-ledger-surfaceDark border-ledger-border dark:border-ledger-borderDark hover:border-gray-300 dark:hover:border-gray-700'
                                }
                            `}
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            <div className="flex items-center justify-center mr-4 shrink-0">
                                {getRankVisual(rank)}
                            </div>
                            
                            <div className="flex-1 min-w-0 mr-4">
                                <h3 className={`font-bold text-sm truncate ${isCurrentUser ? 'text-ledger-accent' : 'text-ledger-text dark:text-ledger-textDark'}`}>
                                    {entry.userName} {isCurrentUser && <span className="text-[9px] font-extrabold bg-ledger-accent text-white px-1.5 py-0.5 rounded ml-1.5 align-middle tracking-wider">YOU</span>}
                                </h3>
                                {entry.motto ? (
                                    <p className="text-xs text-ledger-muted opacity-80 mt-0.5 line-clamp-1">
                                        "{entry.motto}"
                                    </p>
                                ) : (
                                    <p className="text-xs text-ledger-muted/40 mt-0.5 italic">No motto</p>
                                )}
                            </div>

                            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-transparent dark:border-white/5 shrink-0">
                                <span className="font-mono font-bold text-ledger-text dark:text-ledger-textDark text-sm">
                                    {entry.dayStreak}
                                </span>
                                <Flame size={14} className="text-orange-500 fill-orange-500" />
                            </div>
                        </div>
                      );
                  })}
              </div>
          )}
      </div>
    </div>
  );
};
