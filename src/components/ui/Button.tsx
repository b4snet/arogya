import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-[#1E3A5F] text-white border border-transparent hover:bg-[#2D4A6F] font-semibold shadow-sm',
  secondary:
    'bg-white text-[var(--arogya-text-primary)] border border-[var(--arogya-border)] hover:bg-[var(--arogya-bg)] shadow-sm font-medium',
  ghost:
    'bg-transparent text-[var(--arogya-text-secondary)] border border-transparent hover:bg-[var(--arogya-bg)] hover:text-[var(--arogya-text-primary)]',
  danger:
    'bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/30 hover:bg-[#DC2626]/20 font-medium',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  loading = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {leftIcon && <span className="shrink-0" aria-hidden="true">{leftIcon}</span>}
      <span>{loading ? 'Processing...' : children}</span>
      {rightIcon && <span className="shrink-0" aria-hidden="true">{rightIcon}</span>}
    </button>
  );
}
