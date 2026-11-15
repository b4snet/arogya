import type { HealthStatusLevel } from '../../types';
import { STATUS_META } from '../../engine/thresholds';

const ROLE_AVATAR_THEMES: Record<string, string> = {
  'AST-01': 'border-[#1E3A5F]/40 bg-[#E2ECF7] text-[#1E3A5F]',
  'AST-02': 'border-[#6D28D9]/30 bg-[#F3E8FF] text-[#5B21B6]',
  'AST-03': 'border-[#1D4ED8]/30 bg-[#EFF6FF] text-[#1D4ED8]',
};

const RANK_PREFIXES = new Set([
  'commander',
  'flight',
  'engineer',
  'mission',
  'specialist',
  'crew',
  'medical',
  'officer',
  'dr.',
  'dr',
]);

export function getAstronautInitials(fullName: string): string {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter((token) => !RANK_PREFIXES.has(token.toLowerCase()));

  const source = parts.length >= 2 ? parts : fullName.trim().split(/\s+/);
  if (source.length === 0) return 'CR';
  if (source.length === 1) return source[0].slice(0, 2).toUpperCase();
  return `${source[0][0] ?? ''}${source[source.length - 1][0] ?? ''}`.toUpperCase();
}

interface AstronautAvatarProps {
  astronautId: string;
  fullName: string;
  status?: HealthStatusLevel;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  active?: boolean;
}

const SIZE_CLASSES: Record<NonNullable<AstronautAvatarProps['size']>, string> = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-xs',
  lg: 'h-11 w-11 text-sm',
};

const DOT_SIZE_CLASSES: Record<NonNullable<AstronautAvatarProps['size']>, string> = {
  xs: 'h-2 w-2 -bottom-0.5 -right-0.5',
  sm: 'h-2.5 w-2.5 -bottom-0.5 -right-0.5',
  md: 'h-3 w-3 -bottom-0.5 -right-0.5',
  lg: 'h-3 w-3 bottom-0 right-0',
};

export function AstronautAvatar({
  astronautId,
  fullName,
  status,
  size = 'md',
  active = false,
}: AstronautAvatarProps) {
  const initials = getAstronautInitials(fullName);
  const theme =
    ROLE_AVATAR_THEMES[astronautId] ??
    'border-[var(--arogya-border-strong)] bg-[var(--arogya-surface-elevated)] text-[var(--arogya-text-primary)]';

  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full border font-mono-tabular font-bold tracking-tight select-none ${
        SIZE_CLASSES[size]
      } ${theme} ${active ? 'ring-2 ring-[#1E3A5F]/70 ring-offset-1 ring-offset-white' : ''}`}
    >
      {initials}
      {status && (
        <span
          className={`absolute rounded-full border border-white ${DOT_SIZE_CLASSES[size]}`}
          style={{ backgroundColor: STATUS_META[status].colorHex }}
        />
      )}
    </span>
  );
}
