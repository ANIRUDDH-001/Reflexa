import { signInWithGoogle } from '../auth';

/**
 * Render the login page — full-page centered layout (no sidebar/shell).
 */
export function renderLogin(container: HTMLElement): void {
  container.innerHTML = `
    <div class="login-page">
      <div class="login-page__background">
        <div class="login-page__gradient-orb login-page__gradient-orb--1"></div>
        <div class="login-page__gradient-orb login-page__gradient-orb--2"></div>
      </div>

      <div class="login-card animate-fade-in">
        <div class="login-card__header">
          <div class="login-card__logo-wrapper">
            <img src="/logo.png" alt="Reflexa" class="login-card__logo-img" />
          </div>
          <h1 class="login-card__brand">Reflexa</h1>
          <p class="login-card__tagline">Self-Improving Technical Interview Intelligence</p>
        </div>

        <div class="login-card__divider"></div>

        <div class="login-card__body">
          <p class="login-card__cta">Sign in to continue to your dashboard</p>

          <button class="login-card__google-btn" id="google-sign-in-btn" type="button">
            <svg class="login-card__google-icon" viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>Sign in with Google</span>
          </button>
        </div>

        <div class="login-card__footer">
          <p class="login-card__footer-text">
            Adaptive interviews powered by AI-driven evaluation
          </p>
        </div>
      </div>
    </div>
  `;

  // Bind click handler
  const btn = document.getElementById('google-sign-in-btn');
  btn?.addEventListener('click', async () => {
    btn.classList.add('btn--loading');
    btn.setAttribute('disabled', 'true');
    try {
      await signInWithGoogle();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Reflexa] Google sign-in failed:', err);
      btn.classList.remove('btn--loading');
      btn.removeAttribute('disabled');
    }
  });
}
