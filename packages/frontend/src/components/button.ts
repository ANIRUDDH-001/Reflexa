import { refreshIcons } from '../lucide';

export interface ButtonOptions {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: string;
  onClick?: (e: MouseEvent) => void;
  disabled?: boolean;
  size?: 'sm' | 'base' | 'lg';
}

export function createButton(options: ButtonOptions): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'btn';

  if (options.variant) {
    btn.classList.add(`btn--${options.variant}`);
  }

  if (options.size) {
    btn.classList.add(`btn--${options.size}`);
  }

  if (options.disabled) {
    btn.disabled = true;
  }

  if (options.icon) {
    const iconEl = document.createElement('i');
    iconEl.setAttribute('data-lucide', options.icon);
    btn.appendChild(iconEl);
  }

  const textNode = document.createTextNode(options.label);
  btn.appendChild(textNode);

  if (options.onClick) {
    btn.addEventListener('click', options.onClick);
  }

  if (options.icon) {
    requestAnimationFrame(() => {
      if (typeof refreshIcons === 'function') {
        refreshIcons();
      }
    });
  }

  return btn;
}
