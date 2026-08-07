import type { ButtonHTMLAttributes } from 'react';

export type UiButtonTone = 'neutral' | 'primary';

export interface UiButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: UiButtonTone;
}

export function UiButton({ className, tone = 'neutral', ...props }: UiButtonProps) {
  const classes = ['ui-button', `ui-button--${tone}`, className].filter(Boolean).join(' ');

  return <button className={classes} {...props} />;
}
