export interface TabItem {
  id: string;
  label: string;
}

export interface TabsOptions {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
}

export function createTabs(options: TabsOptions): HTMLElement {
  const container = document.createElement('div');
  container.className = 'tabs';
  container.style.display = 'flex';
  container.style.borderBottom = '1px solid var(--border-default)';
  container.style.gap = '16px';

  let currentActiveId = options.activeId;
  const buttons: Map<string, HTMLButtonElement> = new Map();

  const updateActiveState = () => {
    buttons.forEach((btn, id) => {
      if (id === currentActiveId) {
        btn.style.color = 'var(--color-accent-600)';
        btn.style.borderBottomColor = 'var(--color-accent-600)';
      } else {
        btn.style.color = 'var(--color-gray-500)';
        btn.style.borderBottomColor = 'transparent';
      }
    });
  };

  options.items.forEach((item) => {
    const btn = document.createElement('button');
    btn.textContent = item.label;

    btn.style.padding = '8px 0';
    btn.style.cursor = 'pointer';
    btn.style.background = 'transparent';
    btn.style.border = 'none';
    btn.style.borderBottom = '2px solid transparent';
    btn.style.fontWeight = '500';
    btn.style.fontSize = '14px';
    btn.style.color = 'var(--color-gray-500)';

    btn.addEventListener('click', () => {
      if (currentActiveId !== item.id) {
        currentActiveId = item.id;
        updateActiveState();
        options.onChange(currentActiveId);
      }
    });

    buttons.set(item.id, btn);
    container.appendChild(btn);
  });

  updateActiveState();
  return container;
}
