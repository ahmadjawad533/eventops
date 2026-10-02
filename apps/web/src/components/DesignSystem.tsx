import React from 'react';
import { Search, Bell, Settings, Zap } from 'lucide-react';

// Card
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export function Card({ children, className = '', hoverEffect = false, ...props }: CardProps) {
  return (
    <div
      className={`bg-[#121215] border border-zinc-800/80 rounded-xl p-4 shadow-sm text-zinc-100 font-sans transition ${
        hoverEffect ? 'hover:border-zinc-700/90 hover:bg-[#16161a] hover:-translate-y-0.5' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// Button
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'action' | 'danger' | 'outline';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'sm',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyle =
    'inline-flex items-center justify-center font-bold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed select-none';
  const sizeStyle = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-xs';

  let variantStyle = '';
  switch (variant) {
    case 'primary':
      variantStyle = 'bg-white text-black hover:bg-zinc-200 shadow-sm';
      break;
    case 'secondary':
      variantStyle = 'bg-[#18181b] hover:bg-zinc-800 text-zinc-300 border border-zinc-800';
      break;
    case 'action':
      variantStyle = 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md';
      break;
    case 'danger':
      variantStyle = 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30';
      break;
    case 'outline':
      variantStyle = 'bg-transparent text-zinc-300 border border-zinc-700 hover:bg-zinc-800/50';
      break;
  }

  return (
    <button className={`${baseStyle} ${sizeStyle} ${variantStyle} ${className}`} {...props}>
      {children}
    </button>
  );
}

// Input
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`w-full px-3 py-1.5 bg-[#141417] border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition ${className}`}
      {...props}
    />
  );
}

// Select
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ className = '', children, ...props }: SelectProps) {
  return (
    <select
      className={`px-3 py-1.5 bg-[#141417] border border-zinc-800 rounded-lg text-xs text-white focus:outline-none focus:border-zinc-600 transition ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

// Badge
export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'info' | 'purple';
  className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  let style = 'bg-zinc-800 text-zinc-300 border-zinc-700/60';
  if (variant === 'success') style = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  if (variant === 'warning') style = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  if (variant === 'info') style = 'bg-sky-500/10 text-sky-400 border-sky-500/30';
  if (variant === 'purple') style = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider border ${style} ${className}`}
    >
      {children}
    </span>
  );
}

// StatusPill
export function StatusPill({ status = 'Systems Online' }: { status?: string }) {
  return (
    <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      <span>{status}</span>
    </div>
  );
}

// TopHeader
export interface TopHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  userRole?: string;
  onToggleMobileMenu?: () => void;
}

export function TopHeader({
  searchQuery,
  onSearchChange,
  userRole = 'ORGANIZER',
}: TopHeaderProps) {
  return (
    <header className="bg-[#121215] border-b border-zinc-800/80 px-4 py-2.5 flex items-center justify-between gap-4 sticky top-0 z-20">
      {/* Left Search Bar */}
      <div className="flex items-center space-x-2 flex-1 max-w-xs">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search events, communities..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-[#18181b] border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        <StatusPill status="Systems Online" />

        <button
          className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/60 transition"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
        </button>

        <button
          className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/60 transition"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        <Badge variant="purple">{userRole}</Badge>
      </div>
    </header>
  );
}

// PageHeader
export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121215] border border-zinc-800/80 p-4 rounded-xl">
      <div>
        <h1 className="text-lg font-bold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
