import { getUser, signOut } from './auth';
import { refreshIcons } from './lucide';
import { navigate, getCurrentRoute } from './router';
import { escapeHtml } from './utils/dom';

const NAV_ITEMS = [
  { path: '/', label: 'Overview', icon: 'layout-dashboard' },
  { path: '/session', label: 'Initialize Session', icon: 'plus-circle' },
  { path: '/history', label: 'Session History', icon: 'clock' },
  { path: '/strategy', label: 'Strategy Evolution', icon: 'brain-circuit' },
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

  const logoWrapper = document.createElement('div');
  logoWrapper.className = 'sidebar__logo-wrapper';

  const logoLink = document.createElement('div');
  logoLink.className = 'sidebar__logo';
  logoLink.setAttribute('role', 'button');
  logoLink.setAttribute('aria-label', 'Go to home');
  logoLink.addEventListener('click', () => {
    navigate('/');
    if (mobileOpen) toggleMobileSidebar(false);
  });

  const logoImg = document.createElement('img');
  logoImg.src = '/logo.png';
  logoImg.alt = 'Reflexa';
  logoImg.className = 'sidebar__logo-img';

  const brandText = document.createElement('span');
  brandText.className = 'sidebar__brand';
  brandText.textContent = 'Reflexa';

  logoLink.appendChild(logoImg);
  logoLink.appendChild(brandText);
  logoWrapper.appendChild(logoLink);

  // Sidebar toggle button
  const toggle = document.createElement('button');
  toggle.className = 'sidebar__toggle';
  toggle.setAttribute('aria-label', 'Toggle sidebar');
  toggle.innerHTML = `<i data-lucide="panel-left-close"></i>`;
  toggle.addEventListener('click', () => {
    sidebarCollapsed = !sidebarCollapsed;
    updateSidebarState(sidebar, mainArea, toggle);
  });

  header.appendChild(logoWrapper);
  header.appendChild(toggle);
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

  // Sidebar footer — user info + sign out
  const sidebarFooter = document.createElement('div');
  sidebarFooter.className = 'sidebar__footer';
  sidebarFooter.innerHTML = `
    <div class="sidebar__user" id="sidebar-user">
      <div class="sidebar__user-avatar" id="sidebar-avatar">
        <i data-lucide="user"></i>
      </div>
      <div class="sidebar__user-info">
        <span class="sidebar__user-name" id="sidebar-user-name">Loading…</span>
        <span class="sidebar__user-email" id="sidebar-user-email"></span>
      </div>
    </div>
    <button class="sidebar__sign-out" id="sidebar-sign-out" aria-label="Sign out">
      <i data-lucide="log-out"></i>
      <span class="sidebar__nav-label">Sign Out</span>
    </button>
  `;
  sidebar.appendChild(sidebarFooter);

  // Populate user info from Google profile
  getUser()
    .then((user) => {
      if (!user) return;
      const nameEl = document.getElementById('sidebar-user-name');
      const emailEl = document.getElementById('sidebar-user-email');
      const avatarEl = document.getElementById('sidebar-avatar');
      const meta = user.user_metadata;
      if (nameEl) nameEl.textContent = meta?.full_name || meta?.name || user.email || 'User';
      if (emailEl) emailEl.textContent = user.email || '';
      if (avatarEl && meta?.avatar_url) {
        avatarEl.innerHTML = `<img src="${escapeHtml(
          meta.avatar_url,
        )}" alt="" class="sidebar__avatar-img" />`;
      }
    })
    .catch(() => {
      /* silently ignore */
    });

  // Sign out handler
  setTimeout(() => {
    const signOutBtn = document.getElementById('sidebar-sign-out');
    signOutBtn?.addEventListener('click', async () => {
      try {
        await signOut();
        window.location.hash = '#/login';
        window.location.reload();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[Reflexa] Sign out failed:', err);
      }
    });
  }, 0);

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
      <button class="sidebar-expand-trigger" id="expand-sidebar" aria-label="Expand sidebar">
        <i data-lucide="panel-left-open"></i>
      </button>
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

  // Hamburger click + expand sidebar click
  setTimeout(() => {
    const hamburger = document.getElementById('hamburger');
    hamburger?.addEventListener('click', () => toggleMobileSidebar(true));

    const expandBtn = document.getElementById('expand-sidebar');
    expandBtn?.addEventListener('click', () => {
      sidebarCollapsed = false;
      updateSidebarState(sidebar, mainArea, toggle);
    });
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
      const path = el.dataset.path || '';
      // Match exact path OR parameterized child routes (e.g. /analysis matches /analysis/abc123)
      const isActive = current === path || (path !== '/' && current.startsWith(path + '/'));
      el.classList.toggle('sidebar__nav-item--active', isActive);
      el.setAttribute('aria-current', isActive ? 'page' : 'false');
    });

    // Update page title — match parameterized routes too
    const activeItem =
      NAV_ITEMS.find((i) => i.path === current) ||
      NAV_ITEMS.find((i) => i.path !== '/' && current.startsWith(i.path + '/')) ||
      NAV_ITEMS[0];
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
