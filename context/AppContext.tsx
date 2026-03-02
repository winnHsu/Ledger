
import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, Habit, DailyLog, STATIC_ACHIEVEMENTS, Achievement, ThemeOption } from '../types';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
    collection, 
    query, 
    orderBy, 
    onSnapshot, 
    doc, 
    setDoc
} from 'firebase/firestore';
import { 
    getTodayStr, 
    toggleHabitCompletion, 
    createHabit, 
    updateHabitDetails, 
    archiveHabit, 
    restoreUserHabit,
    FirestoreHabit,
    reorderUserHabits,
    deleteUserAccount,
    checkUserHasHabits,
    commitOnboarding,
    getWeekParams,
    getWeekRange,
    updateUserProfile,
    toLocalISOString,
    updateAppStreak,
    deleteUserHabit
} from '../lib/firestore';

interface UserSettings {
    theme: ThemeOption;
    isOnboarded: boolean;
    userName: string;
    motto: string;
    isAdmin: boolean;
    // New Fields
    alertTimes: string[] | null;
    isRanked: boolean;
    isActive: boolean;
    deleteTime: string | null;
    dayStreak: number;
    timeZone: string;
}

interface AppContextType {
  state: AppState;
  streakNotification: { visible: boolean, days: number } | null;
  dismissStreakNotification: () => void;
  addHabit: (name: string, time?: number) => Promise<void>;
  toggleHabit: (habitId: string, date: string) => void;
  checkHasHabits: () => Promise<boolean>;
  updateHabit: (id: string, updates: { name?: string, time?: number }) => Promise<void>;
  archiveHabit: (id: string) => void;
  restoreHabit: (id: string) => void;
  deleteHabit: (id: string) => Promise<void>;
  reorderHabits: (fromIndex: number, toIndex: number) => void;
  commitUserOnboarding: (habitNames: string[]) => Promise<void>;
  setTheme: (theme: ThemeOption) => void;
  updateProfile: (data: { 
      userName?: string; 
      motto?: string; 
      alertTimes?: string[] | null;
      isRanked?: boolean;
      isActive?: boolean;
      deleteTime?: string | null; 
  }) => Promise<void>;
  resetData: () => void;
  exportData: () => void;
  logOut: () => void;
  deleteAccount: () => void;
  stats: {
    currentStreak: number;
    totalLoggedDays: number;
    perfectDays: number;
    weeklyScore: number;
    getHabitConsistency: (habitId: string) => number;
  };
  isLoading: boolean;
}

const defaultState: AppState = {
  habits: [],
  logs: [],
  weeklyStats: {},
  achievements: STATIC_ACHIEVEMENTS.map(a => ({ ...a })),
  isOnboarded: false,
  theme: 'dark',
  dataYear: new Date().getFullYear(),
  userName: '',
  motto: '',
  isAdmin: false,
  alertTimes: null,
  isRanked: true, // Default to true
  isActive: true,
  deleteTime: null,
  dayStreak: 0,
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [streakNotification, setStreakNotification] = useState<{ visible: boolean, days: number } | null>(null);
  
  // Data State
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<Record<string, number>>({});
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setHabits([]);
        setLogs([]);
        setWeeklyStats({});
        setUserSettings(null);
        setIsLoading(false);
        setStreakNotification(null);
      } else {
         // Check streak on login/load
         // We do this once here, not inside onSnapshot to avoid loops
         updateAppStreak(u.uid).then((res) => {
             if (res && res.showedAnimation) {
                 setStreakNotification({ visible: true, days: res.streak });
             }
         });
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Data Listeners
  useEffect(() => {
    if (!user) return;

    const userId = user.uid;
    const today = new Date();
    // CRITICAL: Use the year from getWeekParams to ensure we listen to the correct collection
    const { year: currentWeekYear } = getWeekParams(today);
    
    // A. Habits
    const habitsQuery = query(collection(db, `users/${userId}/habits`), orderBy('sortOrder'));
    const unsubHabits = onSnapshot(habitsQuery, (snapshot) => {
      const loadedHabits: Habit[] = snapshot.docs.map(d => {
        const data = d.data() as FirestoreHabit;
        return {
          id: d.id,
          name: data.name,
          time: data.time,
          status: data.status,
          activeFrom: data.activeFrom,
          inactiveFrom: data.inactiveFrom,
          sortOrder: data.sortOrder
        };
      });
      setHabits(loadedHabits);
    });

    // B. Logs & Weekly Stats (Listen to the Calculated Year Collection)
    const yearCollection = collection(db, `users/${userId}/${currentWeekYear}`);
    const unsubYear = onSnapshot(yearCollection, (snapshot) => {
        let allLogs: DailyLog[] = [];
        let stats: Record<string, number> = {};

        snapshot.docs.forEach(doc => {
            const weekId = doc.id;
            const data = doc.data();
            
            // 1. Capture Weekly Percent
            if (typeof data.lastPercent === 'number') {
                stats[weekId] = data.lastPercent;
            }

            // 2. Reconstruct Logs from strict Week Ranges
            const weekNum = parseInt(weekId.replace('week', ''));
            const { start, end } = getWeekRange(parseInt(currentWeekYear), weekNum);
            
            // Iterate from start to end of that week
            const current = new Date(start);
            while (current <= end) {
                const dayName = current.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
                const habitIds = data[dayName];
                
                if (Array.isArray(habitIds) && habitIds.length > 0) {
                    const dateStr = toLocalISOString(current);
                    const checks: Record<string, boolean> = {};
                    habitIds.forEach((hid: string) => checks[hid] = true);
                    
                    allLogs.push({
                        date: dateStr,
                        weekId,
                        checks
                    });
                }
                
                current.setDate(current.getDate() + 1);
            }
        });
        
        setLogs(allLogs);
        setWeeklyStats(stats);
    });

    // C. User Settings (and Profile)
    const userRef = doc(db, `users`, userId);
    const unsubUser = onSnapshot(userRef, (docSnap) => {
        if(docSnap.exists()) {
            const data = docSnap.data();
            setUserSettings({
                theme: data.theme || 'dark',
                isOnboarded: data.isOnboarded || false,
                userName: data.userName || user.email || 'User',
                motto: data.motto || '',
                isAdmin: data.isAdmin || false,
                // Map New Fields
                alertTimes: data.alertTimes || null,
                isRanked: data.isRanked !== undefined ? data.isRanked : true, // Handle undefined as true
                isActive: data.isActive !== undefined ? data.isActive : true,
                deleteTime: data.deleteTime || null,
                dayStreak: data.dayStreak || 0,
                timeZone: data.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
            });
            setIsLoading(false);
        } else {
            setIsLoading(false);
        }
    });

    return () => {
      unsubHabits();
      unsubYear();
      unsubUser();
    };
  }, [user]);

  // --- ACTIONS ---

  const dismissStreakNotification = () => {
      setStreakNotification(null);
  };

  const addHabit = async (name: string, time?: number) => {
      if (!user) return;
      await createHabit(user.uid, name, time);
  };

  const toggleHabit = async (habitId: string, date: string) => {
      if (!user) return;
      // Pass the count of currently active habits to update the week's lastPercent
      const activeCount = habits.filter(h => h.status === 'active').length;
      await toggleHabitCompletion(user.uid, habitId, date, activeCount);
  };

  const checkHasHabits = async () => {
      if (!user) return false;
      return await checkUserHasHabits(user.uid);
  };

  const updateHabitAction = async (id: string, updates: { name?: string, time?: number }) => {
      if (!user) return;
      await updateHabitDetails(user.uid, id, updates);
  };

  const archiveHabitAction = async (id: string) => {
      if (!user) return;
      await archiveHabit(user.uid, id);
  };

  const restoreHabitAction = async (id: string) => {
      if (!user) return;
      await restoreUserHabit(user.uid, id);
  };

  const deleteHabitAction = async (id: string) => {
      if (!user) return;
      await deleteUserHabit(user.uid, id);
  };

  const reorderHabitsAction = async (fromIndex: number, toIndex: number) => {
      if (!user) return;
      const active = habits.filter(h => h.status === 'active');
      const moved = active[fromIndex];
      const newActive = [...active];
      newActive.splice(fromIndex, 1);
      newActive.splice(toIndex, 0, moved);
      await reorderUserHabits(user.uid, newActive);
  };

  const commitUserOnboarding = async (habitNames: string[]) => {
      if (!user) return;
      await commitOnboarding(user.uid, habitNames, user.email || 'User');
  };

  const setTheme = async (theme: ThemeOption) => {
      if (!user) return;
      const ref = doc(db, 'users', user.uid);
      await setDoc(ref, { theme }, { merge: true });
  };

  const updateProfileAction = async (data: { 
      userName?: string; 
      motto?: string; 
      alertTimes?: string[] | null;
      isRanked?: boolean;
      isActive?: boolean;
      deleteTime?: string | null;
  }) => {
      if (!user) return;
      await updateUserProfile(user.uid, data);
  };

  const logOut = async () => {
      await signOut(auth);
  };

  const resetData = async () => {
     await deleteAccountAction();
  };

  const deleteAccountAction = async () => {
      if (!user) return;
      try {
          await deleteUserAccount(user.uid);
          alert("Account deleted.");
      } catch(e) {
          console.error(e);
          alert("Error deleting account.");
      }
  };

  const exportData = () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ habits, logs }));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "ledger_export.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  // --- THEME ---
  useEffect(() => {
    const html = document.documentElement;
    // Clear all potential themes
    html.classList.remove(
      'dark', 'theme-light', 'theme-dark', 'theme-vintage', 'theme-sepia', 
      'theme-cyberpunk', 'theme-nordic', 'theme-high-contrast', 
      'theme-zen', 'theme-oled', 'theme-blue-light'
    );
    
    const theme = userSettings?.theme || 'dark';
    
    // Logic: Dark is default in root. 
    // If 'light', add theme-light and REMOVE dark class.
    // If 'dark' (or others which are dark-based), add theme class AND 'dark' class.
    
    if (theme === 'light') {
        html.classList.add('theme-light');
        html.classList.remove('dark');
    } else {
        // For 'dark', we don't technically need a class since it's root, 
        // but for consistency/overrides we add it if needed, or rely on root.
        // We add 'dark' for Tailwind's dark mode selector.
        if (theme !== 'dark') {
            html.classList.add(`theme-${theme}`);
        }
        html.classList.add('dark');
    }
  }, [userSettings?.theme]);

  // --- STATS CALCULATION ---
  const isHabitApplicable = (habit: Habit, date: string) => {
      if (date < habit.activeFrom) return false;
      if (habit.inactiveFrom && date >= habit.inactiveFrom) return false;
      return true;
  };

  const calculateStats = () => {
      const todayStr = getTodayStr();
      
      const validLogs = logs.filter(l => Object.keys(l.checks || {}).length > 0);
      const totalLoggedDays = validLogs.length;

      // Streak
      let currentStreak = 0;
      const sortedDates = validLogs.map(l => l.date).sort().reverse();
      if (sortedDates.length > 0) {
          const lastDate = new Date(sortedDates[0]);
          const today = new Date(todayStr);
          const diff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
          if(diff <= 1) {
              currentStreak = 1;
              let prev = lastDate;
              for(let i=1; i<sortedDates.length; i++) {
                  const curr = new Date(sortedDates[i]);
                  const gap = Math.floor((prev.getTime() - curr.getTime()) / (1000 * 3600 * 24));
                  if(gap === 1) {
                      currentStreak++;
                      prev = curr;
                  } else break;
              }
          }
      }

      // Perfect Days & Weekly Score
      let perfectDays = 0;
      let totalWeekChecks = 0;
      let totalWeekPossible = 0;

      const d = new Date();
      d.setHours(0,0,0,0);
      const day = d.getDay();
      d.setDate(d.getDate() - day); // Sunday
      
      for(let i=0; i<7; i++) {
          const y = d.getFullYear();
          const m = String(d.getMonth()+1).padStart(2,'0');
          const dy = String(d.getDate()).padStart(2,'0');
          const dateStr = `${y}-${m}-${dy}`;

          let dayPossible = 0;
          let dayChecks = 0;
          
          habits.forEach(h => {
              if (isHabitApplicable(h, dateStr)) {
                  dayPossible++;
                  const log = logs.find(l => l.date === dateStr);
                  if (log && log.checks && log.checks[h.id]) {
                      dayChecks++;
                  }
              }
          });
          
          totalWeekChecks += dayChecks;
          totalWeekPossible += dayPossible;
          d.setDate(d.getDate() + 1);
      }

      validLogs.forEach(log => {
          let dayPossible = 0;
          let dayChecks = 0;
          habits.forEach(h => {
              if(isHabitApplicable(h, log.date)) {
                  dayPossible++;
                  if(log.checks[h.id]) dayChecks++;
              }
          });
          if(dayPossible > 0 && dayChecks >= dayPossible) perfectDays++;
      });
      
      const weeklyScore = totalWeekPossible > 0 ? totalWeekChecks / totalWeekPossible : 0;

      return { currentStreak, totalLoggedDays, perfectDays, weeklyScore };
  };

  const state: AppState = {
      habits,
      logs,
      weeklyStats,
      achievements: STATIC_ACHIEVEMENTS,
      isOnboarded: userSettings?.isOnboarded || false,
      theme: userSettings?.theme || 'dark',
      dataYear: new Date().getFullYear(),
      userName: userSettings?.userName || '',
      motto: userSettings?.motto || '',
      isAdmin: userSettings?.isAdmin || false,
      alertTimes: userSettings?.alertTimes || null,
      isRanked: userSettings?.isRanked !== undefined ? userSettings?.isRanked : true,
      isActive: userSettings?.isActive !== undefined ? userSettings?.isActive : true,
      deleteTime: userSettings?.deleteTime || null,
      dayStreak: userSettings?.dayStreak || 0,
      timeZone: userSettings?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone
  };

  return (
    <AppContext.Provider value={{ 
      state, 
      streakNotification,
      dismissStreakNotification,
      addHabit, 
      toggleHabit, 
      checkHasHabits,
      updateHabit: updateHabitAction, 
      archiveHabit: archiveHabitAction, 
      restoreHabit: restoreHabitAction, 
      deleteHabit: deleteHabitAction,
      reorderHabits: reorderHabitsAction, 
      commitUserOnboarding, 
      setTheme, 
      updateProfile: updateProfileAction,
      resetData, 
      exportData, 
      logOut,
      deleteAccount: deleteAccountAction,
      stats: {
          ...calculateStats(),
          getHabitConsistency: (habitId) => {
              let checks = 0;
              const today = new Date();
              for(let i=0; i<7; i++) {
                 const d = new Date(today);
                 d.setDate(d.getDate() - i);
                 const y = d.getFullYear();
                 const m = String(d.getMonth()+1).padStart(2,'0');
                 const dy = String(d.getDate()).padStart(2,'0');
                 const ds = `${y}-${m}-${dy}`;
                 
                 const log = logs.find(l => l.date === ds);
                 if(log?.checks[habitId]) checks++;
              }
              return (checks / 7) * 100;
          }
      },
      isLoading
    }}>
      {children}
    </AppContext.Provider>
  );
};
