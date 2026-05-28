import { refreshIcons } from '../lucide';
import { createAlert } from './alert';

let toastContainer: HTMLElement | null = null;

function getToastContainer(): HTMLElement {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

export function showToast(options: {
  message: string;
  title?: string;
  type?: 'success' | 'warning' | 'error' | 'info';
  durationMs?: number;
}): void {
  const container = getToastContainer();
  const alertEl = createAlert({
    message: options.message,
    title: options.title,
    type: options.type || 'info',
  });

  // Wrap alert in toast behavior class
  alertEl.classList.add('toast');
  container.appendChild(alertEl);
  refreshIcons();

  const duration = options.durationMs || 3000;

  // Auto-remove
  setTimeout(() => {
    alertEl.classList.add('toast--exit');
    setTimeout(() => {
      if (alertEl.parentNode === container) {
        container.removeChild(alertEl);
      }
    }, 300); // Matches fadeOutDown animation
  }, duration);
}
