/* eslint-disable no-console */
import './styles.css';
import { API_BASE, api } from './api';
import { refreshIcons } from './lucide';
import { registerRoute, setRouterContainer, initRouter } from './router';
import { createShell } from './shell';
import { renderAnalysis } from './views/analysis';
import { renderDashboard } from './views/dashboard';
import { renderHistory } from './views/history';
import { renderInterview } from './views/interview';
import { renderSession } from './views/session';

async function renderSettings(container: HTMLElement): Promise<void> {
  container.innerHTML = '<div class="p-8 text-center text-gray-500">Loading settings...</div>';
  try {
    let strategyVersion = 'Unknown';
    try {
      const res = await api.getSessions();
      const sessions = res.sessions || [];
      if (sessions.length > 0) {
        const latestSessionId = sessions[0].id;
        const sessionDetail = await api.getSession(latestSessionId);
        strategyVersion = sessionDetail.session?.strategyVersion || 'Unknown';
      }
    } catch (e) {
      console.warn('Could not fetch strategy version', e);
    }

    container.innerHTML = `
      <div class="max-w-4xl mx-auto">
        <h2 class="text-xl font-semibold mb-6">System Configuration</h2>
        <div class="panel p-6">
          <div class="mb-4">
            <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">API Base URL</h3>
            <div class="flex items-center gap-2">
              <i data-lucide="server" class="text-gray-400"></i>
              <code class="bg-gray-100 px-2 py-1 rounded text-sm text-gray-800">${API_BASE}</code>
            </div>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Current Strategy Version</h3>
            <div class="flex items-center gap-2">
              <i data-lucide="git-commit" class="text-gray-400"></i>
              <span class="text-gray-800 font-medium">${strategyVersion}</span>
            </div>
          </div>
        </div>
      </div>
    `;
    refreshIcons();
  } catch (err) {
    container.innerHTML = '<div class="p-8 text-center text-error">Failed to load settings</div>';
  }
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
