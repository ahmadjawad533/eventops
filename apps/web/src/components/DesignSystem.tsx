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
      className={`bg-gradient-to-b from-white/[0.05] to-white/[0.015] border border-white/10 rounded-xl p-4 shadow-xl backdrop-blur-md text-zinc-100 font-sans transition-all duration-300 ${
        hoverEffect ? 'hover:border-[#00ffc8]/40 hover:-translate-y-1 hover:shadow-[0_15px_45px_rgba(0,255,200,0.12)]' : ''
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
        'bg-gradient-to-r from-[#7c3aed] to-[#00b4ff] text-white shadow-[0_8px_25px_rgba(124,58,237,0.35)] hover:shadow-[0_12px_35px_rgba(0,255,200,0.4)] hover:-translate-y-0.5';
      break;
    case 'secondary':
      variantStyle =
        'bg-white/10 hover:bg-white/15 text-white border border-white/10 hover:border-white/20 backdrop-blur-sm';
      break;
    case 'action':
      variantStyle =
        'bg-gradient-to-r from-[#00ffc8] to-[#00b4ff] text-black font-extrabold shadow-[0_8px_25px_rgba(0,255,200,0.3)] hover:shadow-[0_12px_35px_rgba(0,255,200,0.5)] hover:-translate-y-0.5';
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
      className={`w-full px-3 py-1.5 bg-white/[0.04] border border-white/10 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00ffc8] focus:ring-1 focus:ring-[#00ffc8]/50 transition-all duration-200 ${className}`}
      {...props}
    />
  );
}

// Select - Glowing Glass Dropdown
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ className = '', children, ...props }: SelectProps) {
  return (
    <select
      className={`px-3 py-1.5 bg-[#0b0e14] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-[#00ffc8] focus:ring-1 focus:ring-[#00ffc8]/50 transition-all duration-200 ${className}`}
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
  let style = 'bg-white/10 text-zinc-300 border-white/15';
  if (variant === 'success')
    style = 'bg-[#00ffc8]/10 text-[#00ffc8] border-[#00ffc8]/30 shadow-[0_0_10px_rgba(0,255,200,0.15)]';
  if (variant === 'warning')
    style = 'bg-amber-500/10 text-amber-300 border-amber-500/30';
  if (variant === 'info')
    style = 'bg-sky-500/10 text-sky-300 border-sky-500/30';
  if (variant === 'purple')
    style = 'bg-[#7c3aed]/15 text-[#a78bfa] border-[#7c3aed]/40 shadow-[0_0_12px_rgba(124,58,237,0.2)]';

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
    <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-[#00ffc8]/10 border border-[#00ffc8]/30 text-[#00ffc8] text-[11px] font-semibold backdrop-blur-md shadow-[0_0_15px_rgba(0,255,200,0.2)]">
      <span className="w-1.5 h-1.5 rounded-full bg-[#00ffc8] animate-pulse" />
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
    <header className="bg-gradient-to-b from-black/80 to-black/40 border-b border-white/10 px-5 py-2.5 flex items-center justify-between gap-4 sticky top-0 z-30 backdrop-blur-xl">
      {/* Left Search Bar */}
      <div className="flex items-center space-x-2 flex-1 max-w-xs">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search events, communities..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white/[0.04] border border-white/10 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00ffc8] focus:ring-1 focus:ring-[#00ffc8]/40 transition"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        <StatusPill status="Systems Online" />

        <button
          className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
        </button>

        <button
          className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition"
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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-b from-white/[0.05] to-white/[0.015] border border-white/10 p-5 rounded-xl backdrop-blur-md shadow-xl">
      <div>
        <h1 className="text-xl font-extrabold text-white tracking-tight gradient-text">
          {title}
        </h1>
        {subtitle && <p className="text-xs text-zinc-400 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
