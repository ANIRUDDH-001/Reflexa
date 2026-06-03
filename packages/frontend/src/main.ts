/* eslint-disable no-console */
import './styles.css';
import { API_BASE, api, setCurrentUserId, getLatestStrategyInfo } from './api';
import { setPhoenixTraceBase } from './api';
import { refreshIcons } from './lucide';
import { registerRoute, setRouterContainer, initRouter } from './router';
import { createShell } from './shell';
import { renderAnalysis } from './views/analysis';
import { renderDashboard } from './views/dashboard';
import { renderHistory } from './views/history';
import { renderInterview } from './views/interview';
import { renderSession } from './views/session';

// ── User Identity ──────────────────────────────────────────────────────────────
// Generate a UUID on first load and persist it in localStorage.
// No login required — this differentiates browser sessions for the demo.
function getOrCreateUserId(): string {
  const stored = localStorage.getItem('reflexa_user_id');
  if (stored) return stored;
  const id = crypto.randomUUID();
  localStorage.setItem('reflexa_user_id', id);
  return id;
}

export const CURRENT_USER_ID = getOrCreateUserId();
// Wire up the api module immediately so all fetch calls carry the header
setCurrentUserId(CURRENT_USER_ID);

api
  .getConfig()
  .then((cfg) => {
    if (cfg && cfg.phoenixTraceBase) {
      setPhoenixTraceBase(cfg.phoenixTraceBase);
    }
  })
  .catch((err) => console.error('Failed to load Phoenix trace config:', err));

// ── Global error boundary ─────────────────────────────────────────────────────
function showGlobalError(message: string): void {
  const existing = document.getElementById('global-error-banner');
  if (existing) return; // Don't stack banners
  const banner = document.createElement('div');
  banner.id = 'global-error-banner';
  banner.style.cssText =
    'position:fixed;top:0;left:0;right:0;padding:12px 20px;background:#ef4444;color:white;font-size:14px;z-index:9999;text-align:center;cursor:pointer;';
  banner.textContent = message;
  banner.onclick = () => banner.remove();
  document.body.prepend(banner);
  setTimeout(() => banner.remove(), 8000);
}

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Reflexa] Unhandled promise rejection:', event.reason);
  if ((event.reason as { name?: string })?.name !== 'AbortError') {
    showGlobalError('Something went wrong. Please refresh and try again.');
  }
});

window.addEventListener('error', (event) => {
  console.error('[Reflexa] Uncaught error:', event.error);
  showGlobalError('Something went wrong. Please refresh and try again.');
});

// ── Settings view ─────────────────────────────────────────────────────────────
async function renderSettings(container: HTMLElement): Promise<void> {
  container.innerHTML = '<div class="p-8 text-center text-gray-500">Loading settings...</div>';
  try {
    let strategyVersion = 'Unknown';
    let rulesCount = 0;
    try {
      const [, strategyInfo] = await Promise.all([api.getSessions(), getLatestStrategyInfo()]);
      strategyVersion = strategyInfo?.version || 'v0';
      rulesCount = strategyInfo?.rulesCount || 0;
    } catch (e) {
      console.warn('Could not fetch strategy info', e);
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
          <div class="mb-4">
            <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Browser User ID</h3>
            <div class="flex items-center gap-2">
              <i data-lucide="fingerprint" class="text-gray-400"></i>
              <code class="bg-gray-100 px-2 py-1 rounded text-sm text-gray-800">${CURRENT_USER_ID}</code>
            </div>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Current Strategy Version</h3>
            <div class="flex items-center gap-2">
              <i data-lucide="git-commit" class="text-gray-400"></i>
              <span class="text-gray-800 font-medium">${strategyVersion} (${rulesCount} active rules)</span>
            </div>
          </div>
        </div>
      </div>
    `;
    refreshIcons();
  } catch (err) {
    console.error(err);
    container.innerHTML = '<div class="p-8 text-center text-error">Failed to load settings</div>';
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
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
