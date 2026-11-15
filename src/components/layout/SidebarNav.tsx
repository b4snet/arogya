import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  BookOpen,
  ClipboardCheck,
  Database,
  FileText,
  Globe2,
  LayoutDashboard,
  Settings,
  X,
} from 'lucide-react';
import { useActiveAssessment } from '../../hooks/useActiveAssessment';
import { AstronautAvatar } from '../ui/AstronautAvatar';
import { StatusPill, healthStatusToTone } from '../ui/StatusPill';

interface NavItem {
  to: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard, end: true },
  { to: '/check-in', label: 'Daily Check-In', shortLabel: 'Check-In', icon: ClipboardCheck },
  { to: '/vitals', label: 'Vitals', shortLabel: 'Vitals', icon: Activity },
  { to: '/mission', label: 'Mission', shortLabel: 'Mission', icon: Globe2 },
  { to: '/reports', label: 'Reports', shortLabel: 'Reports', icon: FileText },
];

const SECONDARY_NAV_ITEMS: NavItem[] = [
  { to: '/research', label: 'Research Context', shortLabel: 'Research', icon: Database },
  { to: '/settings', label: 'Settings', shortLabel: 'Settings', icon: Settings },
  { to: '/about', label: 'About & Sources', shortLabel: 'About', icon: BookOpen },
];

function SidebarLink({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors duration-150 whitespace-nowrap ${
          isActive
            ? 'border border-[#1E3A5F]/20 bg-[#1E3A5F]/8 text-[#1E3A5F] shadow-sm'
            : 'border border-transparent text-[var(--arogya-text-secondary)] hover:bg-[var(--arogya-bg)] hover:text-[var(--arogya-text-primary)]'
        }`
      }
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{item.label}</span>
    </NavLink>
  );
}

interface SidebarNavProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function SidebarNav({ mobileOpen, onCloseMobile }: SidebarNavProps) {
  const location = useLocation();
  const isDashboard = location.pathname === '/';
  const { astronaut, assessment } = useActiveAssessment();
  const tone = healthStatusToTone(assessment.overallStatus);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseMobile();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen, onCloseMobile]);

  const navContent = (
    <div
      className={`flex h-full flex-col justify-between transition-all duration-200 ${
        isDashboard
          ? 'm-3 rounded-2xl border border-[var(--arogya-border)] bg-white p-4 shadow-sm'
          : 'border-r border-[var(--arogya-border)] bg-white px-3 py-5'
      }`}
    >
      <div>
        <div className="mb-6 flex items-center justify-between px-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--arogya-border)] bg-[#1E3A5F] shadow-sm">
              <span className="font-mono-tabular text-sm font-bold text-white">A</span>
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-[var(--arogya-text-primary)]">
                Arogya
              </p>
              <p className="text-[10px] text-[var(--arogya-text-muted)]">
                Crew Health Console
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-[var(--arogya-text-secondary)] hover:bg-[var(--arogya-bg)] hover:text-[var(--arogya-text-primary)] lg:hidden"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Primary Navigation" className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.to} item={item} onNavigate={onCloseMobile} />
          ))}
        </nav>

        <nav
          aria-label="Reference and system navigation"
          className="mt-5 space-y-1 border-t border-[var(--arogya-border)] pt-4"
        >
          <p className="px-3 pb-1 text-[10px] font-medium uppercase tracking-wider text-[var(--arogya-text-muted)]">
            Reference
          </p>
          {SECONDARY_NAV_ITEMS.map((item) => (
            <SidebarLink key={item.to} item={item} onNavigate={onCloseMobile} />
          ))}
        </nav>
      </div>

      <div className="mt-4 rounded-xl border border-[var(--arogya-border)] bg-[var(--arogya-bg)] p-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--arogya-text-muted)]">
          Active Crew
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <AstronautAvatar
            astronautId={astronaut.id}
            fullName={astronaut.fullName}
            status={assessment.overallStatus}
            size="sm"
            active
          />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-[var(--arogya-text-primary)]">
              {astronaut.fullName}
            </p>
            <p className="truncate font-mono-tabular text-[10px] text-[var(--arogya-text-muted)]">
              {astronaut.callSign}
            </p>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--arogya-text-muted)]">
          <span>Mission Control v2.0</span>
          <StatusPill tone={tone} size="sm" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={`no-print hidden shrink-0 transition-all duration-200 lg:block ${
          isDashboard ? 'w-[205px]' : 'w-60'
        }`}
      >
        {navContent}
      </aside>

      {/* Mobile Slide-over Drawer */}
      {mobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
          className="fixed inset-0 z-50 flex lg:hidden"
        >
          <div
            className="fixed inset-0 bg-black/30"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-64 max-w-[82vw]">{navContent}</aside>
        </div>
      )}

      {/* Compact Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Quick Navigation"
        className="no-print fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-[var(--arogya-border)] bg-white px-2 py-1.5 lg:hidden"
      >
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex min-h-[44px] min-w-[52px] flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-[11px] font-medium transition-colors ${
                  isActive
                    ? 'text-[#1E3A5F]'
                    : 'text-[var(--arogya-text-secondary)] hover:text-[var(--arogya-text-primary)]'
                }`
              }
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{item.shortLabel}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}
