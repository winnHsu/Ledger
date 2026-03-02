

export interface Habit {
  id: string;
  name: string;
  time?: number; // minutes from midnight (0-1440)
  status: 'active' | 'archived';
  activeFrom: string;   // YYYY-MM-DD
  inactiveFrom: string | null; // YYYY-MM-DD or null
  sortOrder: number;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  weekId: string;
  checks: Record<string, boolean>; // Map of habitId -> true
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  type: 'streak' | 'total_logs' | 'perfect_days';
  unlockedAt?: string; // ISO Date string
}

export type ThemeOption = 
  | 'light' 
  | 'dark' 
  | 'vintage' 
  | 'sepia' 
  | 'cyberpunk' 
  | 'nordic' 
  | 'high-contrast' 
  | 'zen' 
  | 'oled' 
  | 'blue-light';

export interface AppState {
  habits: Habit[];
  logs: DailyLog[];
  weeklyStats: Record<string, number>; // Map of weekId -> lastPercent (0-100)
  achievements: Achievement[];
  isOnboarded: boolean;
  theme: ThemeOption;
  dataYear: number;
  // User Profile
  userName: string;
  motto: string;
  isAdmin: boolean;
  alertTimes: string[] | null; // Array of times (e.g. "07:05", "20:00")
  isRanked: boolean;
  isActive: boolean;
  deleteTime: string | null;
  dayStreak: number;
  timeZone: string;
}

export const MAX_HABITS = 15;

export const DEFAULT_SUGGESTIONS = [
  "Exercise",
  "Reading",
  "Deep work",
  "Language practice",
  "Meditation",
  "No alcohol"
];

export const STATIC_ACHIEVEMENTS: Omit<Achievement, 'unlockedAt'>[] = [
  { id: 'streak_3', title: '3-Day Streak', description: 'Log activity 3 days in a row', targetValue: 3, type: 'streak' },
  { id: 'streak_7', title: '7-Day Streak', description: 'Log activity 7 days in a row', targetValue: 7, type: 'streak' },
  { id: 'streak_14', title: '14-Day Streak', description: 'Log activity 14 days in a row', targetValue: 14, type: 'streak' },
  { id: 'streak_30', title: '30-Day Streak', description: 'Log activity 30 days in a row', targetValue: 30, type: 'streak' },
  { id: 'perfect_1', title: 'Perfect Day', description: 'Complete all habits in a day', targetValue: 1, type: 'perfect_days' },
  { id: 'perfect_5', title: '5 Perfect Days', description: 'Complete all habits 5 times', targetValue: 5, type: 'perfect_days' },
  { id: 'perfect_10', title: '10 Perfect Days', description: 'Complete all habits 10 times', targetValue: 10, type: 'perfect_days' },
  { id: 'log_10', title: '10 Days Logged', description: 'Log any habit on 10 different days', targetValue: 10, type: 'total_logs' },
  { id: 'log_50', title: '50 Days Logged', description: 'Log any habit on 50 different days', targetValue: 50, type: 'total_logs' },
];
