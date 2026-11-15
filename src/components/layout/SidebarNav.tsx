import { useEffect, useRef } from 'react';
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
  MoreHorizontal,
  Settings,
  X,
} from 'lucide-react';
import { useActiveAssessment } from '../../hooks/useActiveAssessment';
import { STATUS_META } from '../../engine/thresholds';
import { AstronautAvatar } from '../ui/AstronautAvatar';
import { ArogyaMark } from '../ui/ArogyaMark';

interface NavItem {
  to: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard, end: true },
  { to: '/check-in', label: 'Check-In', shortLabel: 'Check-In', icon: ClipboardCheck },
  { to: '/vitals', label: 'Vitals', shortLabel: 'Vitals', icon: Activity },
  { to: '/mission', label: 'Mission', shortLabel: 'Mission', icon: Globe2 },
  { to: '/reports', label: 'Reports', shortLabel: 'Reports', icon: FileText },
];

const SECONDARY_NAV_ITEMS: NavItem[] = [
  { to: '/research', label: 'Research', shortLabel: 'Research', icon: Database },
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
        `group relative flex min-h-[40px] items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-[13px] transition-colors duration-150 ${
          isActive
            ? 'bg-[var(--arogya-chrome-active)] font-medium text-[var(--arogya-chrome-text)] shadow-[inset_0_0_0_1px_var(--arogya-chrome-border)]'
            : 'text-[var(--arogya-chrome-muted)] hover:bg-[var(--arogya-chrome-hover)] hover:text-[var(--arogya-chrome-text)]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            aria-hidden="true"
            className={`absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-[var(--arogya-chrome-accent)] transition-opacity duration-150 ${
              isActive ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <Icon
            aria-hidden="true"
            className={`h-4 w-4 shrink-0 transition-colors duration-150 ${
              isActive
                ? 'text-[var(--arogya-chrome-accent)]'
                : 'text-[var(--arogya-chrome-muted)] group-hover:text-[var(--arogya-chrome-text)]'
            }`}
          />
          <span className="truncate">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

interface SidebarNavProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenMobileMenu: () => void;
}

export function SidebarNav({ mobileOpen, onCloseMobile, onOpenMobileMenu }: SidebarNavProps) {
  const drawerRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const { astronaut, assessment } = useActiveAssessment();
  const statusMeta = STATUS_META[assessment.overallStatus];
  const secondaryActive = SECONDARY_NAV_ITEMS.some(
    (item) => location.pathname === item.to
  );

  useEffect(() => {
    if (!mobileOpen) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      drawerRef.current
        ?.querySelector<HTMLElement>('a[href], button:not([disabled])')
        ?.focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseMobile();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = Array.from(
        drawerRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [mobileOpen, onCloseMobile]);

  const navContent = (
    <div className="arogya-chrome flex h-full min-h-0 flex-col text-[var(--arogya-chrome-text)]">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-[var(--arogya-chrome-border)] px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
          <ArogyaMark className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold tracking-tight text-[var(--arogya-chrome-text)]">
            Arogya
          </p>
          <p className="truncate text-[10px] tracking-wide text-[var(--arogya-chrome-muted)]">
            Crew health console
          </p>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="-mr-1 inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-[var(--radius-md)] text-[var(--arogya-chrome-muted)] transition-colors hover:bg-[var(--arogya-chrome-hover)] hover:text-[var(--arogya-chrome-text)] lg:hidden"
          aria-label="Close navigation menu"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
        <p className="arogya-overline px-3 pb-2 text-[var(--arogya-chrome-muted)]">
          Operations
        </p>
        <nav aria-label="Primary Navigation" className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <SidebarLink key={item.to} item={item} onNavigate={onCloseMobile} />
          ))}
        </nav>

        <div
          aria-hidden="true"
          className="my-5 border-t border-[var(--arogya-chrome-border)]"
        />

        <p className="arogya-overline px-3 pb-2 text-[var(--arogya-chrome-muted)]">
          Reference
        </p>
        <nav
          aria-label="Reference and system navigation"
          className="space-y-0.5"
        >
          {SECONDARY_NAV_ITEMS.map((item) => (
            <SidebarLink key={item.to} item={item} onNavigate={onCloseMobile} />
          ))}
        </nav>
      </div>

      <div className="shrink-0 border-t border-[var(--arogya-chrome-border)] p-4">
        <p className="arogya-overline text-[var(--arogya-chrome-muted)]">Active crew</p>
        <div className="mt-3 flex items-center gap-2.5">
          <AstronautAvatar
            astronautId={astronaut.id}
            fullName={astronaut.fullName}
            status={assessment.overallStatus}
            size="sm"
          />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-[var(--arogya-chrome-text)]">
              {astronaut.fullName}
            </p>
            <p className="truncate font-mono-tabular text-[10px] text-[var(--arogya-chrome-muted)]">
              {astronaut.callSign}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[var(--arogya-chrome-muted)]">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: statusMeta.colorHex }}
            />
            <span className="truncate">{statusMeta.shortLabel}</span>
          </span>
          <span className="shrink-0 font-mono-tabular text-[10px] text-[var(--arogya-chrome-muted)]">
            Local-first data
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside
        aria-label="Application navigation"
        className="no-print sticky top-0 z-20 hidden h-screen w-[250px] shrink-0 p-3 lg:block"
      >
        <div className="h-full overflow-hidden rounded-2xl border border-white/10 bg-[#050b18]/55 shadow-[0_24px_70px_-30px_rgba(2,8,20,0.9)] backdrop-blur-xl">
          {navContent}
        </div>
      </aside>

      {mobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className="fixed inset-0 z-50 flex lg:hidden"
        >
          <div
            className="fixed inset-0 bg-[#020B16]/60 backdrop-blur-[2px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside
            ref={drawerRef}
            id="mobile-navigation-drawer"
            className="arogya-elevation-2 relative z-10 h-full w-[280px] max-w-[86vw] bg-[var(--arogya-chrome-bg)]"
          >
            {navContent}
          </aside>
        </div>
      )}

      <nav
        aria-label="Mobile Quick Navigation"
        className="arogya-chrome no-print fixed inset-x-0 bottom-0 z-40 border-t border-[var(--arogya-chrome-border)] bg-[var(--arogya-chrome-bg)] lg:hidden"
      >
        <div className="arogya-safe-bottom flex items-stretch justify-around gap-0.5 px-1 pt-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                aria-label={item.label}
                className={({ isActive }) =>
                  `relative flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-md)] px-1 text-[10px] font-medium transition-colors duration-150 ${
                    isActive
                      ? 'text-[var(--arogya-chrome-accent)]'
                      : 'text-[var(--arogya-chrome-muted)] hover:bg-[var(--arogya-chrome-hover)] hover:text-[var(--arogya-chrome-text)]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-3 top-0 h-0.5 rounded-full bg-[var(--arogya-chrome-accent)] transition-opacity duration-150 ${
                        isActive ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{item.shortLabel}</span>
                  </>
                )}
              </NavLink>
            );
          })}

          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="More navigation: research, settings, and about"
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation-drawer"
            className={`relative flex min-h-[48px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-md)] px-1 text-[10px] font-medium transition-colors duration-150 ${
              secondaryActive
                ? 'text-[var(--arogya-chrome-accent)]'
                : 'text-[var(--arogya-chrome-muted)] hover:bg-[var(--arogya-chrome-hover)] hover:text-[var(--arogya-chrome-text)]'
            }`}
          >
            <span
              aria-hidden="true"
              className={`absolute inset-x-3 top-0 h-0.5 rounded-full bg-[var(--arogya-chrome-accent)] transition-opacity duration-150 ${
                secondaryActive ? 'opacity-100' : 'opacity-0'
              }`}
            />
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
