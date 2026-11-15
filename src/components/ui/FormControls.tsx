import {
  cloneElement,
  isValidElement,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

interface FormFieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export function FormField({ id, label, hint, error, children }: FormFieldProps) {
  const hintId = hint && !error ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const enhancedChild = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        'aria-describedby':
          (children.props as Record<string, unknown>)['aria-describedby'] ?? describedBy,
        'aria-invalid':
          (children.props as Record<string, unknown>)['aria-invalid'] ??
          (error ? true : undefined),
      })
    : children;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-medium text-[var(--arogya-text-secondary)]"
      >
        {label}
      </label>
      {enhancedChild}
      {hint && !error && (
        <p id={hintId} className="text-[11px] text-[var(--arogya-text-muted)]">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-[11px] font-medium text-[var(--arogya-critical-text)]">
          {error}
        </p>
      )}
    </div>
  );
}

const INPUT_BASE =
  'w-full rounded-lg border border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)] px-3 text-sm text-[var(--arogya-text-primary)] placeholder:text-[var(--arogya-text-muted)] transition-colors duration-150 hover:border-[var(--arogya-text-muted)] disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-[var(--arogya-critical)]';

export function TextInput({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`h-10 ${INPUT_BASE} ${className}`} {...props} />;
}

export function NumberInput({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="number"
      className={`h-10 font-mono-tabular ${INPUT_BASE} ${className}`}
      {...props}
    />
  );
}

export function SelectInput({
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`h-10 ${INPUT_BASE} ${className}`} {...props}>
      {children}
    </select>
  );
}

export function TextAreaInput({
  className = '',
  rows = 3,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={rows}
      className={`py-2.5 ${INPUT_BASE} ${className}`}
      {...props}
    />
  );
}

interface ToggleSwitchProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ToggleSwitch({
  id,
  label,
  description,
  checked,
  onChange,
}: ToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--arogya-border)] bg-[var(--arogya-surface-elevated)] p-3.5">
      <label htmlFor={id} className="cursor-pointer">
        <span className="block text-sm font-medium text-[var(--arogya-text-primary)]">
          {label}
        </span>
        {description && (
          <span className="mt-0.5 block text-xs text-[var(--arogya-text-secondary)]">
            {description}
          </span>
        )}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-150 ${
          checked
            ? 'border-[#1E3A5F] bg-[#1E3A5F]'
            : 'border-[var(--arogya-border-strong)] bg-[var(--arogya-bg)]'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full transition-transform duration-150 ${
            checked ? 'translate-x-6 bg-white' : 'translate-x-1 bg-[#94A3B8]'
          }`}
        />
      </button>
    </div>
  );
}
