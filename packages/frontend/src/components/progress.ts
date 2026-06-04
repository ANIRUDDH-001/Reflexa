export interface ProgressOptions {
  value: number;
  max: number;
  label?: string;
}

export function createProgress(options: ProgressOptions): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'progress-wrapper';
  wrapper.style.width = '100%';

  if (options.label) {
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.marginBottom = '4px';
    header.style.fontSize = '14px';
    header.style.fontWeight = '500';

    const labelEl = document.createElement('span');
    labelEl.textContent = options.label;
    header.appendChild(labelEl);

    const percent = Math.min(100, Math.max(0, Math.round((options.value / options.max) * 100)));
    percentEl.textContent = `${percent}%`;
    header.appendChild(percentEl);

    wrapper.appendChild(header);
  }

  const barContainer = document.createElement('div');
  barContainer.style.height = '8px';
  barContainer.style.background = 'var(--color-gray-200)';
  barContainer.style.borderRadius = '99px';
  barContainer.style.overflow = 'hidden';

  const innerBar = document.createElement('div');
  innerBar.style.height = '100%';
  innerBar.style.background = 'var(--color-accent-600)';
  innerBar.style.transition = 'width 0.3s';
  const widthPercent = Math.min(100, Math.max(0, (options.value / options.max) * 100));
  innerBar.style.width = `${widthPercent}%`;

  barContainer.appendChild(innerBar);
  wrapper.appendChild(barContainer);

  return wrapper;
}
