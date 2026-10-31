import React from 'react';
import { Search, Bell, Settings } from 'lucide-react';

// Card - Glassmorphism Frosted Container with Neon Border Glow
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export function Card({ children, className = '', hoverEffect = true, ...props }: CardProps) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-slate-800 font-sans transition-all duration-300 ${
        hoverEffect ? 'hover:border-blue-300 hover:-translate-y-0.5 hover:shadow-lg' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// Button - Radiant Gradient Glow Controls
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
    'inline-flex items-center justify-center font-bold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed select-none';
  const sizeStyle = size === 'sm' ? 'px-3.5 py-1.5 text-xs' : 'px-4.5 py-2 text-xs';

  let variantStyle = '';
  switch (variant) {
    case 'primary':
      variantStyle =
        'bg-gradient-to-r from-blue-700 to-sky-500 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5';
      break;
    case 'secondary':
      variantStyle =
        'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200';
      break;
    case 'action':
      variantStyle =
        'bg-gradient-to-r from-sky-500 to-blue-600 text-white font-extrabold shadow-md hover:shadow-lg hover:-translate-y-0.5';
      break;
    case 'danger':
      variantStyle =
        'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 backdrop-blur-sm';
      break;
    case 'outline':
      variantStyle =
        'bg-transparent text-zinc-300 border border-white/15 hover:bg-white/10 hover:text-white backdrop-blur-sm';
      break;
  }

  return (
    <button className={`${baseStyle} ${sizeStyle} ${variantStyle} ${className}`} {...props}>
      {children}
    </button>
  );
}

// Input - Glowing Glass Controls
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 ${className}`}
      {...props}
    />
  );
}

// Select - Glowing Glass Dropdown
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ className = '', children, ...props }: SelectProps) {
  return (
    <select
      className={`px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

// Badge - Glass Neon Pills
export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'info' | 'purple';
  className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  let style = 'bg-slate-100 text-slate-600 border-slate-300';
  if (variant === 'success')
    style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (variant === 'warning')
    style = 'bg-amber-50 text-amber-700 border-amber-200';
  if (variant === 'info')
    style = 'bg-sky-50 text-sky-700 border-sky-200';
  if (variant === 'purple')
    style = 'bg-indigo-50 text-indigo-700 border-indigo-200';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider border backdrop-blur-sm ${style} ${className}`}
    >
      {children}
    </span>
  );
}

// StatusPill - Pulsing Cyan Indicator
export function StatusPill({ status = 'Systems Online' }: { status?: string }) {
  return (
    <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      <span>{status}</span>
    </div>
  );
}

// TopHeader - Sticky Frosted Navigation
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
    <header className="bg-white/90 border-b border-slate-200 px-5 py-3 flex items-center justify-between gap-4 sticky top-0 z-30 backdrop-blur-xl">
      {/* Left Search Bar */}
      <div className="flex items-center space-x-2 flex-1 max-w-xs">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search events, communities..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        <StatusPill status="Systems Online" />

        <button
          className="p-1.5 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
        </button>

        <button
          className="p-1.5 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        <Badge variant="purple">{userRole}</Badge>
      </div>
    </header>
  );
}

// PageHeader - Glass Container with Animated Gradient Title
export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight gradient-text">
          {title}
        </h1>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
