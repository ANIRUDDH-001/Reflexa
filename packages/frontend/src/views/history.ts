import { api } from '../api';
import { refreshIcons } from '../lucide';
import { escapeHtml } from '../utils/dom';

export async function renderHistory(container: HTMLElement): Promise<void> {
  container.innerHTML = '<div class="p-8 text-center text-gray-500">Loading history...</div>';

  try {
    const res = await api.getSessions();
    const sessions = res.sessions || [];

    if (sessions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">
            <i data-lucide="archive"></i>
          </div>
          <h3 class="empty-state__title">No Evaluations Found</h3>
          <p class="empty-state__description mb-4">Complete your first interview to generate telemetry.</p>
          <button class="btn btn--primary" onclick="window.location.hash='#/session'">
            <i data-lucide="plus"></i>
            <span>Initialize Session</span>
          </button>
        </div>
      `;
      refreshIcons();
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listHtml = sessions
      .map((s: any) => {
        const date = escapeHtml(new Date(s.startedAt).toLocaleString());
        const role = escapeHtml(s.config?.role || 'Engineer');
        const scoreVal =
          s.evaluation?.candidateRubric?.overall ??
          s.evaluation?.rubric?.overall ??
          s.evaluation?.score;
        const score = scoreVal !== undefined ? escapeHtml(scoreVal + '%') : 'Pending';
        const statusBadge =
          s.status === 'completed'
            ? '<span class="text-xs font-medium bg-green-100 text-green-800 px-2 py-1 rounded">Completed</span>'
            : '<span class="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">In Progress</span>';

        return `
        <div class="panel p-4 mb-4 flex items-center justify-between hover:border-accent transition-colors">
          <div>
            <div class="flex items-center gap-3 mb-1">
              <h4 class="font-semibold text-gray-900">${role} Interview</h4>
              ${statusBadge}
            </div>
            <p class="text-sm text-gray-500">Score: <span class="font-medium text-gray-800">${score}</span> • Started ${date}</p>
          </div>
          <button class="btn btn--secondary" onclick="window.location.hash='#/analysis/${s.id}'">
            <i data-lucide="bar-chart-2"></i>
            <span>Review</span>
          </button>
        </div>
      `;
      })
      .join('');

    container.innerHTML = `
      <div class="max-w-4xl mx-auto">
        <h2 class="text-xl font-semibold mb-6">Evaluation History</h2>
        ${listHtml}
      </div>
    `;
    refreshIcons();
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">
          <i data-lucide="alert-circle"></i>
        </div>
        <h3 class="empty-state__title">No Sessions Available</h3>
        <p class="empty-state__description mb-4">Could not load session history. Please try again later.</p>
        <button class="btn btn--primary" onclick="window.location.hash='#/session'">
          <i data-lucide="plus"></i>
          <span>Initialize Session</span>
        </button>
      </div>
    `;
    refreshIcons();
  }
}
