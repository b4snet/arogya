import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Activity,
  BookOpen,
  ClipboardCheck,
  FileText,
  Globe2,
  LayoutDashboard,
  Scan,
  Settings,
  X,
} from 'lucide-react';
import { useActiveAssessment } from '../../hooks/useActiveAssessment';
import { AstronautAvatar } from '../ui/AstronautAvatar';
import { StatusPill, healthStatusToTone } from '../ui/StatusPill';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard, end: true },
  { to: '/atlas', label: '3D Health Atlas', shortLabel: 'Atlas', icon: Scan },
  { to: '/check-in', label: 'Daily Check-In', shortLabel: 'Check-In', icon: ClipboardCheck },
  { to: '/vitals', label: 'Vitals', shortLabel: 'Vitals', icon: Activity },
  { to: '/reports', label: 'Reports', shortLabel: 'Reports', icon: FileText },
  { to: '/mission', label: 'Mission', shortLabel: 'Mission', icon: Globe2 },
  { to: '/settings', label: 'Settings', shortLabel: 'Settings', icon: Settings },
  { to: '/about', label: 'About & Sources', shortLabel: 'About', icon: BookOpen },
];

interface SidebarNavProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function SidebarNav({ mobileOpen, onCloseMobile }: SidebarNavProps) {
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
    <div className="flex h-full flex-col justify-between border-r border-[var(--arogya-border)] bg-[var(--arogya-surface)] px-3 py-5">
      <div>
        <div className="mb-6 flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-surface-elevated)]">
              <span className="font-mono-tabular text-sm font-bold text-[#22D3EE]">A</span>
            </div>
            <div>
              <p className="text-base font-bold tracking-tight text-[var(--arogya-text-primary)]">
                Arogya
              </p>
              <p className="text-[11px] text-[var(--arogya-text-secondary)]">
                Crew Health Console
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-[var(--arogya-text-secondary)] hover:bg-white/5 hover:text-[var(--arogya-text-primary)] lg:hidden"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Primary Navigation" className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 whitespace-nowrap ${
                    isActive
                      ? 'border border-[#22D3EE]/35 bg-[#121C2B] text-[#22D3EE]'
                      : 'border border-transparent text-[var(--arogya-text-secondary)] hover:bg-white/[0.04] hover:text-[var(--arogya-text-primary)]'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="mt-6 rounded-xl border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3.5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--arogya-text-secondary)]">
          Active Crew
        </p>
        <div className="mt-2 flex items-center gap-2.5">
          <AstronautAvatar
            astronautId={astronaut.id}
            fullName={astronaut.fullName}
            status={assessment.overallStatus}
            size="sm"
            active
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--arogya-text-primary)]">
              {astronaut.fullName}
            </p>
            <p className="truncate font-mono-tabular text-[11px] text-[var(--arogya-text-secondary)]">
              {astronaut.callSign} · {astronaut.role}
            </p>
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className="font-mono-tabular text-xs text-[var(--arogya-text-secondary)]">
            {astronaut.id}
          </span>
          <StatusPill tone={tone} />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="no-print hidden w-60 shrink-0 lg:block">{navContent}</aside>

      {/* Mobile Slide-over Drawer */}
      {mobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
          className="fixed inset-0 z-50 flex lg:hidden"
        >
          <div
            className="fixed inset-0 bg-black/75"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-64 max-w-[82vw]">{navContent}</aside>
        </div>
      )}

      {/* Compact Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Quick Navigation"
        className="no-print fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-[var(--arogya-border)] bg-[var(--arogya-surface)] px-2 py-1.5 lg:hidden"
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
                    ? 'text-[#22D3EE]'
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
