
import React, { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';

interface StreakNotificationProps {
  days: number;
  onComplete: () => void;
}

export const StreakNotification: React.FC<StreakNotificationProps> = ({ days, onComplete }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Entrance animation
    requestAnimationFrame(() => setVisible(true));
    
    // Auto dismiss
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 300); // Wait for exit animation
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
        className={`fixed inset-0 z-[100] flex items-center justify-center pointer-events-none transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        
        {/* Card */}
        <div className={`relative bg-white dark:bg-[#1A1A1A] rounded-3xl p-8 flex flex-col items-center shadow-2xl border border-ledger-border dark:border-ledger-borderDark transform transition-all duration-500 ${visible ? 'scale-100 translate-y-0' : 'scale-90 translate-y-4'}`}>
            <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mb-4 animate-pulse">
                <Flame size={48} className="text-orange-500" fill="currentColor" />
            </div>
            
            <h2 className="text-4xl font-bold text-ledger-text dark:text-ledger-textDark mb-1">
                {days} {days === 1 ? 'Day' : 'Days'}
            </h2>
            <p className="text-sm font-bold text-ledger-muted uppercase tracking-wider">
                Daily Streak
            </p>
            
            {/* Confetti-ish decoration */}
            <div className="absolute -top-2 -left-2 w-4 h-4 bg-yellow-400 rounded-full opacity-50 animate-bounce" style={{ animationDelay: '0.1s' }} />
            <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-400 rounded-full opacity-50 animate-bounce" style={{ animationDelay: '0.3s' }} />
            <div className="absolute top-1/2 -right-4 w-3 h-3 bg-green-400 rounded-full opacity-50 animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
    </div>
  );
};
