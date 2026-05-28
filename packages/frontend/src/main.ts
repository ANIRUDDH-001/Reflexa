import './styles.css';
import { refreshIcons } from './lucide';
import { registerRoute, setRouterContainer, initRouter } from './router';
import { createShell } from './shell';
import { renderInterview } from './views/interview';

// Placeholder views — will be replaced in later subphases
function renderDashboard(container: HTMLElement): void {
  container.innerHTML = `
    <div class="view-header">
      <h2 class="view-header__title">Welcome to Reflexa</h2>
      <p class="view-header__subtitle">Self-Improving Technical Interview Intelligence</p>
    </div>
    <div class="panel" style="margin-top: var(--space-6)">
      <div class="empty-state">
        <div class="empty-state__icon">
          <i data-lucide="brain"></i>
        </div>
        <h3 class="empty-state__title">No sessions yet</h3>
        <p class="empty-state__description">Start your first interview session to begin building your improvement profile.</p>
        <button class="btn btn--primary" style="margin-top: var(--space-4)" onclick="window.location.hash='#/session'">
          <i data-lucide="plus"></i>
          <span>Configure Session</span>
        </button>
      </div>
    </div>
  `;
  refreshIcons();
}

function renderSession(container: HTMLElement): void {
  container.innerHTML = `
    <div class="view-header">
      <h2 class="view-header__title">New Session</h2>
      <p class="view-header__subtitle">Configure your interview session</p>
    </div>
    <div class="panel" style="margin-top: var(--space-6)">
      <div class="empty-state">
        <div class="empty-state__icon">
          <i data-lucide="settings-2"></i>
        </div>
        <h3 class="empty-state__title">Session setup</h3>
        <p class="empty-state__description">Role selection, difficulty, and focus area configuration will appear here.</p>
        <button class="btn btn--accent" style="margin-top: var(--space-4)" onclick="window.location.hash='#/interview'">
          <i data-lucide="play"></i>
          <span>Start Interview</span>
        </button>
      </div>
    </div>
  `;
  refreshIcons();
}

function renderHistory(container: HTMLElement): void {
  container.innerHTML = `
    <div class="view-header">
      <h2 class="view-header__title">History</h2>
      <p class="view-header__subtitle">Review your past interview sessions</p>
    </div>
    <div class="panel" style="margin-top: var(--space-6)">
      <div class="empty-state">
        <div class="empty-state__icon">
          <i data-lucide="archive"></i>
        </div>
        <h3 class="empty-state__title">No history</h3>
        <p class="empty-state__description">Completed sessions and their analysis will appear here.</p>
      </div>
    </div>
  `;
  refreshIcons();
}

function renderSettings(container: HTMLElement): void {
  container.innerHTML = `
    <div class="view-header">
      <h2 class="view-header__title">Settings</h2>
      <p class="view-header__subtitle">Configure your preferences</p>
    </div>
    <div class="panel" style="margin-top: var(--space-6)">
      <div class="empty-state">
        <div class="empty-state__icon">
          <i data-lucide="sliders-horizontal"></i>
        </div>
        <h3 class="empty-state__title">Settings</h3>
        <p class="empty-state__description">User preferences and configuration options will be available here.</p>
      </div>
    </div>
  `;
  refreshIcons();
}

// Bootstrap
const app = document.getElementById('app');
if (app) {
  const contentContainer = createShell(app);

  registerRoute('/', renderDashboard);
  registerRoute('/session', renderSession);
  registerRoute('/interview', renderInterview);
  registerRoute('/history', renderHistory);
  registerRoute('/settings', renderSettings);

  setRouterContainer(contentContainer);
  initRouter();
}
