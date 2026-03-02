
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, useLocation, Navigate, Link } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Onboarding } from './screens/Onboarding';
import { Today } from './screens/Today';
import { Progress } from './screens/Progress';
import { Habits } from './screens/Habits';
import { Account } from './screens/Account';
import { Leaderboard } from './screens/Leaderboard';
import { StreakNotification } from './components/StreakNotification';
import { Grid, BarChart2, List } from 'lucide-react';

// Layout component handles the Tab Bar
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  const hideNav = pathname === '/onboarding' || pathname === '/account' || pathname === '/leaderboard';

  return (
    <div className="max-w-md mx-auto h-screen bg-ledger-bg dark:bg-ledger-bgDark flex flex-col shadow-2xl overflow-hidden relative border-x border-gray-200 dark:border-gray-800">
      <div className="flex-1 overflow-hidden relative">
        {children}
      </div>
      
      {!hideNav && (
        <nav className="h-16 bg-white dark:bg-[#1A1A1A] border-t border-ledger-border dark:border-ledger-borderDark flex items-center justify-around px-2 z-20">
          <Link to="/today" className={`flex flex-col items-center gap-1 p-2 w-20 rounded-lg transition-colors ${pathname === '/today' ? 'text-ledger-accent' : 'text-ledger-muted hover:text-ledger-text dark:hover:text-white'}`}>
            <Grid size={22} strokeWidth={pathname === '/today' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Ledger</span>
          </Link>
          <Link to="/progress" className={`flex flex-col items-center gap-1 p-2 w-20 rounded-lg transition-colors ${pathname === '/progress' ? 'text-ledger-accent' : 'text-ledger-muted hover:text-ledger-text dark:hover:text-white'}`}>
            <BarChart2 size={22} strokeWidth={pathname === '/progress' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Progress</span>
          </Link>
          <Link to="/habits" className={`flex flex-col items-center gap-1 p-2 w-20 rounded-lg transition-colors ${pathname === '/habits' ? 'text-ledger-accent' : 'text-ledger-muted hover:text-ledger-text dark:hover:text-white'}`}>
            <List size={22} strokeWidth={pathname === '/habits' ? 2.5 : 2} />
            <span className="text-[10px] font-medium">Habits</span>
          </Link>
        </nav>
      )}
    </div>
  );
};

// Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state } = useApp();
  if (!state.isOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
};

const LoadingScreen = () => (
    <div className="h-screen w-full flex items-center justify-center bg-ledger-bg dark:bg-ledger-bgDark">
        <div className="w-8 h-8 border-2 border-ledger-accent border-t-transparent rounded-full animate-spin"></div>
    </div>
);

const AppContent: React.FC = () => {
    const { isLoading, streakNotification, dismissStreakNotification } = useApp();

    if (isLoading) {
        return <LoadingScreen />;
    }

    return (
        <HashRouter>
            <AppLayout>
              {streakNotification?.visible && (
                  <StreakNotification 
                    days={streakNotification.days} 
                    onComplete={dismissStreakNotification} 
                  />
              )}
              <Routes>
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/today" element={<ProtectedRoute><Today /></ProtectedRoute>} />
                <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
                <Route path="/habits" element={<ProtectedRoute><Habits /></ProtectedRoute>} />
                <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
                <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/today" replace />} />
              </Routes>
            </AppLayout>
        </HashRouter>
    );
};

const App: React.FC = () => {
  return (
    <AppProvider>
        <AppContent />
    </AppProvider>
  );
};

export default App;
