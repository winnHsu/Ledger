import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyles = "h-12 px-6 rounded-lg font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center";
  
  const variants = {
    primary: "bg-ledger-accent text-white hover:bg-ledger-accentHover",
    secondary: "bg-transparent border border-ledger-border dark:border-ledger-borderDark text-ledger-text dark:text-ledger-textDark hover:bg-black/5 dark:hover:bg-white/5",
    ghost: "bg-transparent text-ledger-text dark:text-ledger-textDark hover:bg-black/5 dark:hover:bg-white/5",
    danger: "bg-transparent text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};