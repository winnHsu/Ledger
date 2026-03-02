
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { MAX_HABITS, Habit } from '../types';
import { Archive, ArrowUp, ArrowDown, RotateCcw, Plus, AlertCircle, Trash } from 'lucide-react';
import { Button } from '../components/Button';

// Helper to generate time options (00:00 to 24:00 in 30 min intervals)
const generateTimeOptions = () => {
    const options = [];
    for (let i = 0; i <= 48; i++) {
        const totalMinutes = i * 30;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const label = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        options.push({ value: totalMinutes, label });
    }
    return options;
};

const TIME_OPTIONS = generateTimeOptions();

// Sub-component for individual habit rows to manage focus/error states locally
const HabitItem: React.FC<{
  habit: Habit;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (id: string, updates: { name?: string, time?: number }) => Promise<void>;
  onArchive: (id: string) => void;
  onMove: (index: number, direction: 'up' | 'down') => void;
}> = ({ habit, index, isFirst, isLast, onUpdate, onArchive, onMove }) => {
  const [name, setName] = useState(habit.name);
  const [time, setTime] = useState<number | undefined>(habit.time);
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
      setName(habit.name);
      setTime(habit.time);
  }, [habit.name, habit.time]);

  const handleBlur = async () => {
      setIsFocused(false);
      const trimmedName = name.trim();
      
      if (trimmedName === habit.name && time === habit.time) {
          setError('');
          return;
      }
      
      if (!trimmedName) {
          setName(habit.name); // Revert if empty
          return;
      }

      try {
          setError('');
          await onUpdate(habit.id, { name: trimmedName, time: time });
      } catch (e: any) {
          if (e.message.includes('already exists')) {
              setError('Name taken');
          } else {
              setError('Error');
          }
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
          e.currentTarget.blur();
      }
  };

  const handleTimeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      const newTime = val === '' ? undefined : parseInt(val);
      setTime(newTime);
      
      // Auto-save time change immediately (or wait for blur? Select usually triggers change immediately)
      // Since it's a select, let's save immediately for better UX, but handle errors
      try {
          await onUpdate(habit.id, { name: name.trim(), time: newTime });
      } catch (e: any) {
          console.error(e);
          // Revert on error?
      }
  };

  return (
    <div className={`bg-white dark:bg-ledger-surfaceDark p-4 rounded-xl shadow-sm border transition-all group relative ${error ? 'border-red-500' : 'border-ledger-border dark:border-ledger-borderDark hover:border-ledger-accent/50'}`}>
        <div className="flex items-start gap-3">
            <div className="flex flex-col gap-0.5 text-ledger-muted opacity-30 group-hover:opacity-100 transition-opacity mt-1.5">
                <button 
                    onClick={() => onMove(index, 'up')}
                    disabled={isFirst}
                    className="hover:text-ledger-accent disabled:opacity-20"
                >
                    <ArrowUp size={12} />
                </button>
                <button 
                    onClick={() => onMove(index, 'down')}
                    disabled={isLast}
                    className="hover:text-ledger-accent disabled:opacity-20"
                >
                    <ArrowDown size={12} />
                </button>
            </div>

            <div className="flex-1 relative flex flex-col gap-1">
                <input 
                    className={`w-full bg-transparent font-semibold text-lg focus:outline-none focus:text-ledger-accent placeholder-ledger-muted/50 ${error ? 'text-red-500' : 'text-ledger-text dark:text-ledger-textDark'}`}
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value);
                        setError('');
                    }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    maxLength={17}
                    placeholder="Habit Name"
                />
                <select
                    className="self-start bg-transparent font-mono text-sm text-ledger-muted focus:outline-none focus:text-ledger-accent cursor-pointer appearance-none hover:bg-gray-50 dark:hover:bg-white/5 rounded px-1 py-0.5 -ml-1"
                    value={time !== undefined ? time : ''}
                    onChange={handleTimeChange}
                    title="Optional time"
                >
                    <option value="">--:--</option>
                    {TIME_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex items-center pl-4 border-l border-gray-100 dark:border-gray-800 ml-2 self-center">
                <button 
                    onClick={() => onArchive(habit.id)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-ledger-muted hover:text-red-500 transition-colors"
                    title="Archive"
                >
                    <Archive size={18} />
                </button>
            </div>
        </div>
        
        {/* Footer Info: Error or Char Count */}
        {(isFocused || error) && (
            <div className="absolute bottom-1 right-4 flex items-center gap-2 pointer-events-none">
                {error && (
                    <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 rounded flex items-center gap-1">
                        <AlertCircle size={10} /> {error}
                    </span>
                )}
                {isFocused && (
                    <span className={`text-[10px] font-bold tracking-wider ${name.length >= 17 ? 'text-red-500' : 'text-ledger-muted/60'}`}>
                        {name.length}/17
                    </span>
                )}
            </div>
        )}
    </div>
  );
};

export const Habits: React.FC = () => {
  const { state, addHabit, updateHabit, archiveHabit, restoreHabit, reorderHabits, deleteHabit } = useApp();
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitTime, setNewHabitTime] = useState<number | undefined>(undefined);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const activeHabits = state.habits.filter(h => h.status === 'active');
  const archivedHabits = state.habits.filter(h => h.status === 'archived');
  const isLimitReached = activeHabits.length >= MAX_HABITS;

  const handleAdd = async () => {
    if (!newHabitName.trim()) return;
    
    try {
        setAddError('');
        await addHabit(newHabitName.trim(), newHabitTime);
        setNewHabitName('');
        setNewHabitTime(undefined);
        setIsAdding(false);
    } catch (e: any) {
        if (e.message && e.message.includes('already exists')) {
            setAddError('Habit name taken (check archive)');
        } else {
            setAddError(e.message || 'Failed to create');
        }
    }
  };

  const handleUpdateWrapper = async (id: string, updates: { name?: string, time?: number }) => {
     await updateHabit(id, updates);
  };

  const handleRestore = async (id: string) => {
      try {
          await restoreHabit(id);
      } catch (e: any) {
          if (e.message && e.message.includes('already exists')) {
              alert("A habit with this name already exists in your active list.");
          } else {
              alert(e.message);
          }
      }
  }

  const handleDelete = async (id: string) => {
      if (window.confirm("Permanently delete this habit? This cannot be undone.")) {
          try {
              await deleteHabit(id);
          } catch (e: any) {
              alert(e.message);
          }
      }
  }

  const moveHabit = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < activeHabits.length) {
        reorderHabits(index, newIndex);
    }
  };

  return (
    <div className="flex flex-col h-full bg-ledger-bg dark:bg-ledger-bgDark p-6 overflow-y-auto no-scrollbar">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-ledger-text dark:text-ledger-textDark">Habits</h1>
        <div className="text-[10px] font-bold text-ledger-muted uppercase bg-gray-200 dark:bg-white/10 px-2.5 py-1 rounded-full tracking-wider">
            {activeHabits.length} / {MAX_HABITS}
        </div>
      </header>

      {/* Active List */}
      <div className="space-y-3 mb-8">
        {activeHabits.map((habit, index) => (
            <HabitItem 
                key={habit.id}
                habit={habit}
                index={index}
                isFirst={index === 0}
                isLast={index === activeHabits.length - 1}
                onUpdate={handleUpdateWrapper}
                onArchive={archiveHabit}
                onMove={moveHabit}
            />
        ))}

        {isAdding ? (
            <div className={`p-4 bg-white dark:bg-ledger-surfaceDark rounded-xl border-2 ${addError ? 'border-red-500' : 'border-ledger-accent'} animate-fade-in shadow-md`}>
                <div className="flex flex-col gap-2 mb-1">
                    <input 
                        autoFocus
                        value={newHabitName}
                        onChange={e => {
                            setNewHabitName(e.target.value);
                            if (addError) setAddError('');
                        }}
                        placeholder="New habit name..."
                        className="w-full bg-transparent focus:outline-none text-lg font-semibold text-ledger-text dark:text-ledger-textDark placeholder-ledger-muted/50"
                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                        maxLength={17}
                    />
                    <div className="flex items-center justify-between">
                        <select
                            className="bg-transparent font-mono text-sm text-ledger-muted focus:outline-none focus:text-ledger-accent cursor-pointer appearance-none hover:bg-gray-50 dark:hover:bg-white/5 rounded px-1 py-0.5 -ml-1"
                            value={newHabitTime !== undefined ? newHabitTime : ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                setNewHabitTime(val === '' ? undefined : parseInt(val));
                                if (addError) setAddError('');
                            }}
                            title="Optional time"
                        >
                            <option value="">--:--</option>
                            {TIME_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        <button onClick={handleAdd} className="text-sm font-bold bg-ledger-accent text-white px-3 py-1.5 rounded-md hover:opacity-90">Save</button>
                    </div>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-red-500 h-4 flex items-center">
                        {addError && <><AlertCircle size={10} className="mr-1"/> {addError}</>}
                    </span>
                    <span className={`text-[10px] font-bold tracking-wider ${newHabitName.length >= 17 ? 'text-red-500' : 'text-ledger-muted'}`}>
                        {newHabitName.length}/17
                    </span>
                </div>
            </div>
        ) : (
             <Button 
                variant="secondary" 
                fullWidth 
                onClick={() => setIsAdding(true)}
                disabled={isLimitReached}
                className="border-dashed h-14"
            >
                <Plus size={20} className="mr-2 opacity-60" />
                {isLimitReached ? 'Limit reached' : 'Create new habit'}
            </Button>
        )}
      </div>

      {/* Archived Section */}
      {archivedHabits.length > 0 && (
        <div className="mt-auto pt-8 pb-4">
            <h3 className="text-[10px] font-bold uppercase text-ledger-muted tracking-widest mb-4 ml-1">Archived {archivedHabits.length > 20 && `(Showing 20 of ${archivedHabits.length})`}</h3>
            <div className="space-y-2 opacity-80 hover:opacity-100 transition-opacity">
                {archivedHabits.slice(0, 20).map(habit => (
                    <div key={habit.id} className="flex items-center justify-between p-3 rounded-lg border border-transparent hover:bg-white dark:hover:bg-white/5 transition-colors group">
                        <span className="text-ledger-muted line-through decoration-2 decoration-ledger-muted/30 font-medium">{habit.name}</span>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => handleRestore(habit.id)}
                                disabled={isLimitReached}
                                className="text-xs font-bold text-ledger-accent hover:bg-ledger-accent/10 px-3 py-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
                            >
                                <RotateCcw size={12} />
                                RESTORE
                            </button>
                            <button 
                                onClick={() => handleDelete(habit.id)}
                                className="text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 px-3 py-1.5 rounded transition-colors flex items-center gap-1.5"
                            >
                                <Trash size={12} />
                                DELETE
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};
