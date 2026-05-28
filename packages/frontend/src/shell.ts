import { refreshIcons } from './lucide';
import { navigate, getCurrentRoute } from './router';

const NAV_ITEMS = [
  { path: '/', label: 'Overview', icon: 'layout-dashboard' },
  { path: '/session', label: 'Initialize Session', icon: 'plus-circle' },
  { path: '/history', label: 'Session History', icon: 'clock' },
  { path: '/settings', label: 'System Config', icon: 'settings' },
  { path: '/interview', label: 'Active Session', icon: 'play', hidden: true },
  { path: '/analysis', label: 'Telemetry Analysis', icon: 'bar-chart-2', hidden: true },
];

let sidebarCollapsed = false;
let mobileOpen = false;

/** Create the full app shell and return the content container for the router */
export function createShell(root: HTMLElement): HTMLElement {
  root.innerHTML = '';
  root.classList.add('layout-app');

  // Sidebar overlay (mobile)
  const overlay = document.createElement('div');
  overlay.className = 'sidebar__overlay';
  overlay.addEventListener('click', () => toggleMobileSidebar(false));
  root.appendChild(overlay);

  // Sidebar
  const sidebar = document.createElement('aside');
  sidebar.className = 'sidebar';
  sidebar.id = 'sidebar';
  sidebar.setAttribute('role', 'navigation');
  sidebar.setAttribute('aria-label', 'Main navigation');

  // Sidebar header
  const header = document.createElement('div');
  header.className = 'sidebar__header';
  header.innerHTML = `
    <div class="sidebar__logo">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="28" height="28" rx="8" fill="var(--color-accent)"/>
        <path d="M8 10h12M8 14h8M8 18h10" stroke="white" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <span class="sidebar__brand">Reflexa</span>
    </div>
  `;
  sidebar.appendChild(header);

  // Navigation
  const nav = document.createElement('nav');
  nav.className = 'sidebar__nav';

  NAV_ITEMS.filter((item) => !item.hidden).forEach((item) => {
    const btn = document.createElement('button');
    btn.className = 'sidebar__nav-item';
    btn.dataset.path = item.path;
    btn.setAttribute('aria-label', item.label);
    btn.innerHTML = `
      <i data-lucide="${item.icon}"></i>
      <span class="sidebar__nav-label">${item.label}</span>
    `;
    btn.addEventListener('click', () => {
      navigate(item.path);
      if (mobileOpen) toggleMobileSidebar(false);
    });
    nav.appendChild(btn);
  });

  sidebar.appendChild(nav);

  // Sidebar toggle button
  const toggle = document.createElement('button');
  toggle.className = 'sidebar__toggle';
  toggle.setAttribute('aria-label', 'Toggle sidebar');
  toggle.innerHTML = `<i data-lucide="panel-left-close"></i>`;
  toggle.addEventListener('click', () => {
    sidebarCollapsed = !sidebarCollapsed;
    updateSidebarState(sidebar, mainArea, toggle);
  });
  sidebar.appendChild(toggle);

  root.appendChild(sidebar);

  // Main area
  const mainArea = document.createElement('main');
  mainArea.className = 'main-content';
  mainArea.id = 'main-content';

  // Top bar
  const topBar = document.createElement('header');
  topBar.className = 'top-bar';
  topBar.innerHTML = `
    <div class="top-bar__left">
      <button class="top-bar__hamburger" id="hamburger" aria-label="Open menu">
        <i data-lucide="menu"></i>
      </button>
      <h1 class="top-bar__title" id="page-title">Dashboard</h1>
    </div>
    <div class="top-bar__actions">
      <div class="top-bar__status">
        <span class="status-dot status-dot--idle"></span>
        <span class="top-bar__status-text">Ready</span>
      </div>
    </div>
  `;
  mainArea.appendChild(topBar);

  // Hamburger click
  setTimeout(() => {
    const hamburger = document.getElementById('hamburger');
    hamburger?.addEventListener('click', () => toggleMobileSidebar(true));
  }, 0);

  // Content container for router
  const contentContainer = document.createElement('div');
  contentContainer.className = 'content-area';
  contentContainer.id = 'content-area';
  mainArea.appendChild(contentContainer);

  root.appendChild(mainArea);

  // Initialize Lucide icons
  refreshIcons();

  // Listen for route changes to update active nav item and page title
  const updateActive = () => {
    const current = getCurrentRoute();
    nav.querySelectorAll('.sidebar__nav-item').forEach((btn) => {
      const el = btn as HTMLElement;
      const isActive = el.dataset.path === current;
      el.classList.toggle('sidebar__nav-item--active', isActive);
      el.setAttribute('aria-current', isActive ? 'page' : 'false');
    });

    // Update page title
    const activeItem = NAV_ITEMS.find((i) => i.path === current) || NAV_ITEMS[0];
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = activeItem.label;
  };

  window.addEventListener('hashchange', updateActive);
  setTimeout(updateActive, 0);

  return contentContainer;
}

function updateSidebarState(
  sidebar: HTMLElement,
  mainArea: HTMLElement,
  toggle: HTMLElement,
): void {
  sidebar.classList.toggle('sidebar--collapsed', sidebarCollapsed);
  mainArea.classList.toggle('main-content--sidebar-collapsed', sidebarCollapsed);
  toggle.innerHTML = sidebarCollapsed
    ? '<i data-lucide="panel-left-open"></i>'
    : '<i data-lucide="panel-left-close"></i>';
  refreshIcons();
}

function toggleMobileSidebar(open: boolean): void {
  mobileOpen = open;
  const sidebar = document.getElementById('sidebar');
  const overlay = document.querySelector('.sidebar__overlay') as HTMLElement;

  sidebar?.classList.toggle('sidebar--mobile-open', open);
  overlay?.classList.toggle('sidebar__overlay--visible', open);
  document.body.classList.toggle('body--sidebar-open', open);
}
