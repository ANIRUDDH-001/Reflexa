/**
 * Lightweight hash-based router for Reflexa SPA.
 * Maps hash routes to view-render functions.
 */

export type RouteHandler = (container: HTMLElement) => void;

interface Route {
  path: string;
  handler: RouteHandler;
}

const routes: Route[] = [];
let contentContainer: HTMLElement | null = null;

/** Register a route */
export function registerRoute(path: string, handler: RouteHandler): void {
  routes.push({ path, handler });
}

/** Set the container where views will be rendered */
export function setRouterContainer(container: HTMLElement): void {
  contentContainer = container;
}

/** Navigate to a hash route programmatically */
export function navigate(path: string): void {
  window.location.hash = path;
}

/** Get the current route path */
export function getCurrentRoute(): string {
  return window.location.hash.slice(1) || '/';
}

/** Resolve and render the current route */
function resolveRoute(): void {
  if (!contentContainer) return;

  const path = getCurrentRoute();
  const route = routes.find((r) => r.path === path) || routes.find((r) => r.path === '/');

  if (!route) return;

  // Clear previous view with fade
  contentContainer.classList.add('view-exit');

  setTimeout(() => {
    if (!contentContainer) return;
    contentContainer.innerHTML = '';
    contentContainer.classList.remove('view-exit');
    contentContainer.classList.add('view-enter');

    route.handler(contentContainer);

    // Remove animation class after it completes
    setTimeout(() => {
      contentContainer?.classList.remove('view-enter');
    }, 300);
  }, 150);
}

/** Initialize the router — call once after all routes are registered */
export function initRouter(): void {
  window.addEventListener('hashchange', resolveRoute);

  // Set default route if none
  if (!window.location.hash) {
    window.location.hash = '#/';
  } else {
    resolveRoute();
  }
}
