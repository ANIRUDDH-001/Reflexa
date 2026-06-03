/**
 * Lightweight hash-based router for Reflexa SPA.
 * Maps hash routes to view-render functions.
 */

import { getSession } from './auth';

export type RouteHandler = (container: HTMLElement, params?: Record<string, string>) => void;

interface Route {
  path: string;
  handler: RouteHandler;
  regex: RegExp;
  paramNames: string[];
}

const routes: Route[] = [];
let contentContainer: HTMLElement | null = null;

/** Register a route */
export function registerRoute(path: string, handler: RouteHandler): void {
  const paramNames: string[] = [];
  const regexPath = path.replace(/:([^/]+)/g, (_, paramName) => {
    paramNames.push(paramName);
    return '([^/]+)';
  });
  routes.push({
    path,
    handler,
    regex: new RegExp(`^${regexPath}$`),
    paramNames,
  });
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
  // Strip query strings if any and get just the path
  const hash = window.location.hash.slice(1) || '/';
  return hash.split('?')[0];
}

/** Resolve and render the current route */
async function resolveRoute(): Promise<void> {
  if (!contentContainer) return;

  const path = getCurrentRoute();

  // Auth guard: allow /login without session; everything else requires auth
  if (path !== '/login') {
    try {
      const session = await getSession();
      if (!session) {
        window.location.hash = '#/login';
        return;
      }
    } catch {
      window.location.hash = '#/login';
      return;
    }
  }

  let match: RegExpMatchArray | null = null;
  let activeRoute: Route | undefined;

  for (const route of routes) {
    match = path.match(route.regex);
    if (match) {
      activeRoute = route;
      break;
    }
  }

  if (!activeRoute) {
    activeRoute = routes.find((r) => r.path === '/');
    if (!activeRoute) return;
  }

  const params: Record<string, string> = {};
  if (match && activeRoute.paramNames.length > 0) {
    activeRoute.paramNames.forEach((name, i) => {
      params[name] = match![i + 1];
    });
  }

  // Clear previous view with fade
  contentContainer.classList.add('view-exit');

  setTimeout(() => {
    if (!contentContainer) return;
    contentContainer.innerHTML = '';
    contentContainer.classList.remove('view-exit');
    contentContainer.classList.add('view-enter');

    activeRoute!.handler(contentContainer, params);

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
