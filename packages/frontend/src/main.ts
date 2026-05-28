import './styles.css';
import { refreshIcons } from './lucide';
import { registerRoute, setRouterContainer, initRouter } from './router';
import { createShell } from './shell';
import { renderAnalysis } from './views/analysis';
import { renderInterview } from './views/interview';

import { renderSession } from './views/session';

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
        <h3 class="empty-state__title">1 Completed Session</h3>
        <p class="empty-state__description mb-4">System Design • Rate Limiter • Completed 2 mins ago</p>
        <button class="btn btn--secondary" onclick="window.location.hash='#/analysis'">
          <i data-lucide="bar-chart-2"></i>
          <span>View Analysis</span>
        </button>
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
  registerRoute('/analysis', renderAnalysis);
  registerRoute('/history', renderHistory);
  registerRoute('/settings', renderSettings);

  setRouterContainer(contentContainer);
  initRouter();
}
