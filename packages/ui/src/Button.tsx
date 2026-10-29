import type { ButtonHTMLAttributes, Ref } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  ref?: Ref<HTMLButtonElement>;
}

/** Touch target ≥44×44 CSS px (architecture.md §3.4); colours keep AA contrast on the warm palette. */
const BASE =
  'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full px-4 py-2 ' +
  'text-sm font-medium transition-colors motion-reduce:transition-none ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4e2c18] ' +
  'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50';

const VARIANTS: Readonly<Record<ButtonVariant, string>> = {
  primary: 'bg-[#7a4a2a] text-[#fbf7ee] hover:bg-[#6a3d22]',
  secondary: 'border border-[#7a4a2a] bg-[#fbf7ee] text-[#4e2c18] hover:bg-[#f1e4d3]',
  ghost: 'bg-transparent text-[#4e2c18] hover:bg-[#f1e4d3]',
};

export function buttonClassName(variant: ButtonVariant = 'primary', className = ''): string {
  return `${BASE} ${VARIANTS[variant]} ${className}`.trim();
}

export function Button({ variant = 'primary', className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClassName(variant, className)} {...props} />;
}
