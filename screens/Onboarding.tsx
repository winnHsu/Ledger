
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { DEFAULT_SUGGESTIONS } from '../types';
import { Button } from '../components/Button';
import { X, ChevronLeft, Eye, EyeOff, CheckCircle2, TrendingUp, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { checkUserHasHabits } from '../lib/firestore';

type Step = 'intro0' | 'intro1' | 'auth' | 'selection';

export const Onboarding: React.FC = () => {
  const { commitUserOnboarding } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('intro0');
  
  // Selection State
  const [selected, setSelected] = useState<string[]>([]);
  const [customHabit, setCustomHabit] = useState('');
  
  // Auth state
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const toggleSelection = (habit: string) => {
    if (selected.includes(habit)) {
      setSelected(prev => prev.filter(h => h !== habit));
    } else {
      setSelected(prev => [...prev, habit]);
    }
  };

  const addCustom = () => {
    if (!customHabit.trim()) return;
    setSelected(prev => [...prev, customHabit.trim()]);
    setCustomHabit('');
  };

  const finishSelection = async () => {
      if (selected.length === 0) return;
      setIsLoading(true);
      try {
          // Atomic commit of all selected habits and user status
          await commitUserOnboarding(selected);
          navigate('/today');
      } catch (error: any) {
          console.error(error);
          alert('Failed to complete onboarding: ' + error.message);
          setIsLoading(false);
      }
  };

  const handlePasswordReset = async () => {
    setAuthError('');
    setResetMessage('');
    if (!email) {
        setAuthError('Please enter your email address.');
        return;
    }
    
    setIsLoading(true);
    try {
        await sendPasswordResetEmail(auth, email);
        setResetMessage('Password reset email sent! Check your inbox.');
    } catch (error: any) {
        setAuthError(error.message);
    } finally {
        setIsLoading(false);
    }
  };

  const handleAuth = async () => {
    setAuthError('');
    if (!email || !password) {
        setAuthError('Please enter both email and password.');
        return;
    }

    setIsLoading(true);

    try {
        let cred;
        if (isSignUp) {
            cred = await createUserWithEmailAndPassword(auth, email, password);
            setIsLoading(false);
            setStep('selection');
        } else {
            cred = await signInWithEmailAndPassword(auth, email, password);
            // Check directly against Firestore using the UID from credentials
            // This avoids waiting for the AppContext listener to update
            const hasHabits = await checkUserHasHabits(cred.user.uid);
            
            if (hasHabits) {
                navigate('/today');
            } else {
                setIsLoading(false);
                setStep('selection');
            }
        }
    } catch (error: any) {
        setAuthError(error.message);
        setIsLoading(false);
    }
  };

  // --- VIEWS ---

  if (step === 'intro0') {
      return (
          <div className="h-full bg-ledger-bg dark:bg-ledger-bgDark flex flex-col relative overflow-hidden">
              {/* Abstract background grid */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
                   style={{
                       backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
                       backgroundSize: '32px 32px'
                   }}
              />

              <div className="flex-1 flex flex-col items-center justify-center px-6 z-10 animate-fade-in text-ledger-text dark:text-ledger-textDark">
                  
                  {/* Visual: A mock habit card representing the 'Log' */}
                  <div className="w-full max-w-[260px] bg-white dark:bg-ledger-surfaceDark rounded-2xl border border-ledger-border dark:border-ledger-borderDark shadow-2xl mb-12 transform -rotate-3 relative overflow-hidden group">
                       <div className="absolute top-0 left-0 right-0 h-1.5 bg-ledger-accent/20" />
                       <div className="p-5 flex items-center justify-between border-b border-gray-50 dark:border-gray-800">
                          <div className="flex flex-col gap-2">
                              <div className="h-2 w-12 bg-ledger-muted/20 rounded-full" />
                              <div className="h-4 w-28 bg-ledger-text dark:bg-ledger-textDark rounded-sm opacity-90" />
                          </div>
                          <div className="w-10 h-10 bg-ledger-accent rounded-xl flex items-center justify-center text-white shadow-lg shadow-ledger-accent/20">
                              <Check size={20} strokeWidth={4} />
                          </div>
                       </div>
                       <div className="p-5 space-y-4 opacity-40 bg-gray-50/50 dark:bg-white/[0.02]">
                          <div className="flex items-center justify-between">
                              <div className="h-3 w-20 bg-ledger-muted/50 rounded-sm" />
                              <div className="w-8 h-8 rounded-lg border-2 border-dashed border-ledger-border dark:border-ledger-borderDark" />
                          </div>
                          <div className="flex items-center justify-between">
                              <div className="h-3 w-24 bg-ledger-muted/50 rounded-sm" />
                              <div className="w-8 h-8 rounded-lg border-2 border-dashed border-ledger-border dark:border-ledger-borderDark" />
                          </div>
                       </div>
                  </div>

                  <h1 className="text-4xl md:text-5xl font-extrabold text-center tracking-tight leading-none mb-6">
                      The log<br/>
                      <span className="text-ledger-muted">does not lie.</span>
                  </h1>
                  
                  <p className="text-center text-ledger-muted text-lg max-w-xs font-medium leading-relaxed">
                      This is a place to record what you do. Not how you feel about it.
                  </p>
              </div>

              <div className="p-8 z-10 bg-gradient-to-t from-ledger-bg dark:from-ledger-bgDark to-transparent">
                  <Button fullWidth onClick={() => setStep('intro1')}>Continue</Button>
              </div>
          </div>
      );
  }

  if (step === 'intro1') {
      return (
          <div className="h-full bg-ledger-bg dark:bg-ledger-bgDark flex flex-col items-center justify-center p-8 text-center animate-fade-in relative">
              <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="w-20 h-20 bg-ledger-surface dark:bg-ledger-surfaceDark border border-ledger-border dark:border-ledger-borderDark rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-black/5 rotate-3">
                      <CheckCircle2 size={40} className="text-ledger-accent" />
                  </div>
                  <h1 className="text-3xl font-bold text-ledger-text dark:text-ledger-textDark mb-4 tracking-tight">
                      Accountability,<br/>Simplified.
                  </h1>
                  <p className="text-ledger-muted text-lg max-w-xs leading-relaxed">
                      No bells, no whistles.<br/>Just a serious tool to track what matters daily.
                  </p>
              </div>
              <div className="w-full space-y-4">
                  <Button fullWidth onClick={() => setStep('auth')}>Get Started</Button>
                  <button onClick={() => setStep('intro0')} className="w-full py-2 text-xs font-bold uppercase text-ledger-muted hover:text-ledger-text transition-colors tracking-widest">Back</button>
              </div>
          </div>
      );
  }

  // Auth Step
  if (step === 'auth') {
    if (isForgotPassword) {
        return (
            <div className="min-h-screen bg-ledger-bg dark:bg-ledger-bgDark p-6 flex flex-col max-w-md mx-auto animate-fade-in">
                <div className="mb-8 mt-2">
                    <button onClick={() => setIsForgotPassword(false)} className="flex items-center text-ledger-muted hover:text-ledger-text">
                        <ChevronLeft size={20} className="mr-1" /> Back
                    </button>
                </div>
                <h2 className="text-2xl font-bold text-ledger-text dark:text-ledger-textDark mb-2">Reset Password</h2>
                <div className="space-y-6 mt-6">
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full bg-transparent border-b border-ledger-border dark:border-ledger-borderDark py-2 text-ledger-text dark:text-ledger-textDark focus:outline-none focus:border-ledger-accent" />
                    {authError && <p className="text-red-500 text-sm">{authError}</p>}
                    {resetMessage && <p className="text-green-500 text-sm">{resetMessage}</p>}
                    <Button fullWidth onClick={handlePasswordReset} disabled={isLoading}>{isLoading ? 'Sending...' : 'Send Link'}</Button>
                </div>
            </div>
        );
    }

    return (
      <div className="min-h-screen bg-ledger-bg dark:bg-ledger-bgDark p-6 flex flex-col max-w-md mx-auto animate-fade-in">
         <div className="mb-8 mt-2">
            <button onClick={() => setStep('intro1')} className="flex items-center text-ledger-muted hover:text-ledger-text">
                <ChevronLeft size={20} className="mr-1" /> Back
            </button>
         </div>

         <div className="flex-1 flex flex-col justify-center">
            <h2 className="text-3xl font-bold text-ledger-text dark:text-ledger-textDark mb-2 tracking-tight">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-ledger-muted mb-10">Sync your data across devices.</p>

            <div className="space-y-8">
                <div>
                    <label className="text-xs font-bold uppercase text-ledger-muted mb-2 block tracking-wider">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-transparent border-b border-ledger-border dark:border-ledger-borderDark py-2 text-lg text-ledger-text dark:text-ledger-textDark focus:outline-none focus:border-ledger-accent placeholder-ledger-muted/30" placeholder="you@example.com" />
                </div>
                <div>
                    <label className="text-xs font-bold uppercase text-ledger-muted mb-2 block tracking-wider">Password</label>
                    <div className="relative">
                        <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-transparent border-b border-ledger-border dark:border-ledger-borderDark py-2 text-lg text-ledger-text dark:text-ledger-textDark focus:outline-none focus:border-ledger-accent pr-10 placeholder-ledger-muted/30" placeholder="••••••" onKeyDown={e => e.key === 'Enter' && handleAuth()} />
                        <button onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-2 text-ledger-muted hover:text-ledger-text transition-colors">
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>
                
                {!isSignUp && (
                    <div className="flex justify-end">
                        <button onClick={() => setIsForgotPassword(true)} className="text-xs font-medium text-ledger-muted hover:text-ledger-accent transition-colors">Forgot Password?</button>
                    </div>
                )}
            </div>

            {authError && <div className="mt-6 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg text-sm font-medium">{authError}</div>}

            <div className="mt-10 space-y-4">
                <Button fullWidth onClick={handleAuth} disabled={isLoading}>
                    {isLoading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Log In')}
                </Button>
                <button onClick={() => { setIsSignUp(!isSignUp); setAuthError(''); }} className="w-full text-center text-xs font-bold uppercase text-ledger-muted hover:text-ledger-text transition-colors tracking-widest">
                    {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
                </button>
            </div>
         </div>
      </div>
    );
  }

  // Selection Step
  if (step === 'selection') {
    return (
      <div className="h-full bg-ledger-bg dark:bg-ledger-bgDark flex flex-col max-w-md mx-auto relative animate-fade-in">
        <div className="flex-1 overflow-y-auto p-6 pb-24 no-scrollbar">
            <h2 className="text-3xl font-bold text-ledger-text dark:text-ledger-textDark mb-2 mt-8 tracking-tight">
              Habit Selection
            </h2>
            <p className="text-ledger-muted text-base mb-8">
              Select habits to start your journey.
            </p>

            {selected.length > 0 && (
                <div className="mb-6 space-y-2">
                    {selected.map((item) => (
                        <div key={item} className="flex items-center justify-between p-4 bg-white dark:bg-ledger-surfaceDark rounded-xl border border-ledger-border dark:border-ledger-borderDark animate-fade-in shadow-sm">
                            <span className="font-semibold text-ledger-text dark:text-ledger-textDark">{item}</span>
                            <button onClick={() => toggleSelection(item)} className="text-ledger-muted hover:text-red-500 transition-colors"><X size={18} /></button>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex flex-wrap gap-2.5 mb-8">
                {DEFAULT_SUGGESTIONS.map(suggestion => (
                    <button
                        key={suggestion}
                        onClick={() => toggleSelection(suggestion)}
                        className={`px-5 py-2.5 rounded-full text-sm font-semibold border transition-all ${selected.includes(suggestion) ? 'bg-ledger-accent text-white border-ledger-accent shadow-md' : 'border-ledger-border dark:border-ledger-borderDark text-ledger-text dark:text-ledger-textDark hover:bg-gray-50 dark:hover:bg-white/5'}`}
                    >
                        {suggestion}
                    </button>
                ))}
            </div>

            <div className="flex gap-3 items-end">
                <div className="flex-1">
                     <label className="text-[10px] font-bold uppercase text-ledger-muted mb-1 block">Custom Habit</label>
                     <input 
                        type="text" 
                        value={customHabit}
                        onChange={(e) => setCustomHabit(e.target.value)}
                        placeholder="e.g. Drink Water"
                        className="w-full bg-transparent border-b-2 border-ledger-border dark:border-ledger-borderDark py-2 text-lg font-medium text-ledger-text dark:text-ledger-textDark focus:outline-none focus:border-ledger-accent placeholder-ledger-muted/30"
                        onKeyDown={(e) => e.key === 'Enter' && addCustom()}
                        maxLength={17}
                    />
                </div>
                <button onClick={addCustom} disabled={!customHabit} className="mb-2 text-sm font-bold bg-ledger-accent text-white px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all">Add</button>
            </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-ledger-bg dark:from-ledger-bgDark via-ledger-bg dark:via-ledger-bgDark to-transparent pt-12">
            <Button fullWidth onClick={finishSelection} disabled={selected.length === 0 || isLoading}>
                {isLoading ? 'Creating Account...' : 'Complete Setup'}
            </Button>
        </div>
      </div>
    );
  }

  return null;
};
