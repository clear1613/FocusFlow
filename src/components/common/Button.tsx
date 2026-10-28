import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type Props = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost';
  }
>;

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: Props) {
  const base =
    'min-h-11 rounded-xl px-4 py-2 font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-white dark:focus-visible:ring-offset-neutral-950';
  const variants = {
    primary:
      'bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200',
    secondary:
      'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700',
    ghost:
      'bg-transparent text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800',
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
