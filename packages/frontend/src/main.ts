import './styles.css';
import { refreshIcons } from './lucide';
import { registerRoute, setRouterContainer, initRouter } from './router';
import { createShell } from './shell';
import { renderAnalysis } from './views/analysis';
import { renderInterview } from './views/interview';
import { renderSession } from './views/session';

function renderDashboard(container: HTMLElement): void {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state__icon">
        <i data-lucide="brain"></i>
      </div>
      <h3 class="empty-state__title">No baseline established</h3>
      <p class="empty-state__description">Configure an initial interview to calibrate your evaluation model.</p>
      <button class="btn btn--primary" style="margin-top: var(--space-4)" onclick="window.location.hash='#/session'">
        <i data-lucide="plus"></i>
        <span>Initialize Session</span>
      </button>
    </div>
  `;
  refreshIcons();
}

function renderHistory(container: HTMLElement): void {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state__icon">
        <i data-lucide="archive"></i>
      </div>
      <h3 class="empty-state__title">Recent Evaluations</h3>
      <p class="empty-state__description mb-4">System Architecture • Rate Limiter • Completed 2m ago</p>
      <button class="btn btn--secondary" onclick="window.location.hash='#/analysis'">
        <i data-lucide="bar-chart-2"></i>
        <span>Review Telemetry</span>
      </button>
    </div>
  `;
  refreshIcons();
}

function renderSettings(container: HTMLElement): void {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state__icon">
        <i data-lucide="sliders-horizontal"></i>
      </div>
      <h3 class="empty-state__title">System Configuration</h3>
      <p class="empty-state__description">Environment variables and evaluation preferences will be available here.</p>
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
  registerRoute('/interview/:id', renderInterview);
  registerRoute('/analysis/:id', renderAnalysis);
  registerRoute('/history', renderHistory);
  registerRoute('/settings', renderSettings);

  setRouterContainer(contentContainer);
  initRouter();
}
