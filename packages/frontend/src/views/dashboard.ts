import { api } from '../api';
import { refreshIcons } from '../lucide';

export async function renderDashboard(container: HTMLElement): Promise<void> {
  container.innerHTML = '<div class="p-8 text-center text-gray-500">Loading dashboard…</div>';

  try {
    const res = await api.getSessions();
    const sessions = res.sessions || [];

    if (sessions.length === 0) {
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
      return;
    }

    /* ---------- Compute stats ---------- */

    const totalSessions = sessions.length;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const latestSession = sessions[0] as any; // already sorted DESC by startedAt
    const latestScore: number | null =
      latestSession?.evaluation?.rubric?.overall ?? latestSession?.evaluation?.score ?? null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scores = sessions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((s: any) => s.evaluation?.rubric?.overall ?? s.evaluation?.score)
      .filter((v: unknown): v is number => typeof v === 'number');
    const avgScore =
      scores.length > 0
        ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
        : null;

    /* ---------- Stats row ---------- */

    const statsHtml = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-4);margin-bottom:var(--space-6)">
        <div class="panel p-4 text-center">
          <p class="text-sm text-gray-500" style="margin-bottom:var(--space-1)">Total Sessions</p>
          <p class="text-2xl font-semibold">${totalSessions}</p>
        </div>
        <div class="panel p-4 text-center">
          <p class="text-sm text-gray-500" style="margin-bottom:var(--space-1)">Latest Score</p>
          <p class="text-2xl font-semibold">${latestScore !== null ? latestScore + '%' : '—'}</p>
        </div>
        <div class="panel p-4 text-center">
          <p class="text-sm text-gray-500" style="margin-bottom:var(--space-1)">Average Score</p>
          <p class="text-2xl font-semibold">${avgScore !== null ? avgScore + '%' : '—'}</p>
        </div>
      </div>
    `;

    /* ---------- Recent sessions ---------- */

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recentSessions = sessions.slice(0, 3);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listHtml = recentSessions
      .map((s: any) => {
        const date = new Date(s.startedAt).toLocaleDateString();
        const role = s.config?.role || 'Engineer';
        const scoreVal = s.evaluation?.rubric?.overall ?? s.evaluation?.score;
        const score = scoreVal !== undefined ? scoreVal + '%' : 'Pending';

        return `
        <div class="panel p-4 mb-4 flex items-center justify-between hover:border-accent transition-colors">
          <div>
            <h4 class="font-semibold text-gray-900">${role} Interview</h4>
            <p class="text-sm text-gray-500">Score: <span class="font-medium text-gray-800">${score}</span> • ${date}</p>
          </div>
          <button class="btn btn--secondary" onclick="window.location.hash='#/analysis/${s.id}'">
            <i data-lucide="bar-chart-2"></i>
            <span>Review</span>
          </button>
        </div>
      `;
      })
      .join('');

    /* ---------- Assemble ---------- */

    container.innerHTML = `
      <div class="max-w-4xl mx-auto">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold">Dashboard</h2>
          <button class="btn btn--primary" onclick="window.location.hash='#/session'">
            <i data-lucide="plus"></i>
            <span>New Session</span>
          </button>
        </div>

        ${statsHtml}

        <h3 class="text-lg font-semibold mb-4">Recent Sessions</h3>
        ${listHtml}
      </div>
    `;

    refreshIcons();
  } catch (err) {
    container.innerHTML = '<div class="p-8 text-center text-error">Failed to load dashboard</div>';
  }
}
