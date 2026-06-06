/* eslint-disable no-console */
import './styles.css';
import { API_BASE, api, setCurrentUserId, getLatestStrategyInfo } from './api';
import { setPhoenixTraceBase } from './api';
import { getSession, onAuthStateChange } from './auth';
import { refreshIcons } from './lucide';
import { registerRoute, setRouterContainer, initRouter } from './router';
import { createShell } from './shell';
import { renderAnalysis } from './views/analysis';
import { renderDashboard } from './views/dashboard';
import { renderHistory } from './views/history';
import { renderInterview } from './views/interview';
import { renderLogin } from './views/login';
import { renderSession } from './views/session';
import { renderStrategy } from './views/strategy';

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
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#fef2f2; color:#991b1b; padding:2rem; text-align:center; font-family:sans-serif;">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom:1rem;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <h2 style="font-size:1.5rem; font-weight:bold; margin-bottom:0.5rem;">Fatal Application Error</h2>
      <p style="margin-bottom:1.5rem;">${message}</p>
      <button onclick="window.location.reload()" style="background:#dc2626; color:white; padding:0.5rem 1rem; border-radius:0.375rem; border:none; cursor:pointer;">Reload Page</button>
    </div>
  `;
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

// ── App bootstrap helpers ─────────────────────────────────────────────────────
let shellBootstrapped = false;

function bootstrapApp(app: HTMLElement): void {
  if (shellBootstrapped) return;
  shellBootstrapped = true;

  const contentContainer = createShell(app);

  registerRoute('/', renderDashboard);
  registerRoute('/session', renderSession);
  registerRoute('/interview/:id', renderInterview);
  registerRoute('/analysis/:id', renderAnalysis);
  registerRoute('/history', renderHistory);
  registerRoute('/strategy', renderStrategy);
  registerRoute('/settings', renderSettings);
  registerRoute('/login', renderLogin);

  setRouterContainer(contentContainer);
  initRouter();
}

function showLogin(app: HTMLElement): void {
  app.innerHTML = '';
  app.classList.remove('layout-app');
  renderLogin(app);
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
const app = document.getElementById('app');
if (app) {
  // Check auth session before rendering
  getSession()
    .then((session) => {
      if (session) {
        // Authenticated → render full app
        bootstrapApp(app);
      } else {
        // Not authenticated → show login page (bypass shell)
        showLogin(app);
      }
    })
    .catch((err) => {
      console.error('[Reflexa] Auth check failed:', err);
      // On error, show login as fallback
      showLogin(app);
    });

  // Listen for auth state changes (login/logout transitions)
  onAuthStateChange((session) => {
    if (session && !shellBootstrapped) {
      // User just logged in → bootstrap the app
      bootstrapApp(app);
    } else if (!session) {
      // User logged out → show login
      shellBootstrapped = false;
      showLogin(app);
    }
  });
}
