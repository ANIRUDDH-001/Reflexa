export interface BadgeOptions {
  label: string;
  variant?: 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'accent';
}

export function createBadge(options: BadgeOptions): HTMLElement {
  const badge = document.createElement('span');
  badge.className = 'badge';

  if (options.variant) {
    badge.classList.add(`badge--${options.variant}`);
  } else {
    badge.classList.add('badge--neutral');
  }

  badge.textContent = options.label;
  return badge;
}
