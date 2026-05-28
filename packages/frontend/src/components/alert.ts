import { refreshIcons } from '../lucide';

export interface AlertOptions {
  message: string;
  type?: 'success' | 'warning' | 'error' | 'info';
  title?: string;
}

export function createAlert(options: AlertOptions): HTMLElement {
  const alertEl = document.createElement('div');
  alertEl.className = 'alert';

  const type = options.type || 'info';
  alertEl.classList.add(`alert--${type}`);

  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle';
  else if (type === 'warning') iconName = 'alert-triangle';
  else if (type === 'error') iconName = 'x-circle';

  const iconEl = document.createElement('i');
  iconEl.setAttribute('data-lucide', iconName);
  iconEl.style.marginRight = '8px';

  const contentEl = document.createElement('div');
  contentEl.style.display = 'flex';
  contentEl.style.flexDirection = 'column';

  if (options.title) {
    const titleEl = document.createElement('div');
    titleEl.style.fontWeight = 'bold';
    titleEl.style.marginBottom = '4px';
    titleEl.textContent = options.title;
    contentEl.appendChild(titleEl);
  }

  const messageEl = document.createElement('div');
  messageEl.textContent = options.message;
  contentEl.appendChild(messageEl);

  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.alignItems = 'flex-start';
  container.appendChild(iconEl);
  container.appendChild(contentEl);

  alertEl.appendChild(container);

  requestAnimationFrame(() => {
    if (typeof refreshIcons === 'function') {
      refreshIcons();
    }
  });

  return alertEl;
}
