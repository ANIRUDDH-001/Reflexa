import { api } from '../api';
import { refreshIcons } from '../lucide';
import { escapeHtml } from '../utils/dom';
import Chart from 'chart.js/auto';

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
      latestSession?.evaluation?.candidateRubric?.overall ??
      latestSession?.evaluation?.rubric?.overall ??
      latestSession?.evaluation?.score ??
      null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scores = sessions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map(
        (s: any) =>
          s.evaluation?.candidateRubric?.overall ??
          s.evaluation?.rubric?.overall ??
          s.evaluation?.score,
      )
      .filter((v: unknown): v is number => typeof v === 'number');
    const avgScore =
      scores.length > 0
        ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
        : null;

    /* ---------- Stats row ---------- */
    // Compute trend (comparing latest against the average of previous 3)
    let trendHtml = '';
    if (scores.length > 1) {
      const prevScores = scores.slice(1, 4);
      const prevAvg = prevScores.reduce((a: number, b: number) => a + b, 0) / prevScores.length;
      const diff = Math.round(latestScore! - prevAvg);
      const icon = diff >= 0 ? '<i data-lucide="trending-up" class="w-4 h-4"></i>' : '<i data-lucide="trending-down" class="w-4 h-4"></i>';
      const colorClass = diff >= 0 ? 'text-success' : 'text-error';
      trendHtml = `<span class="flex items-center gap-1 ${colorClass} text-sm font-medium mt-1 justify-center">${icon} ${diff > 0 ? '+' : ''}${diff}% from recent</span>`;
    }

    const statsHtml = `
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-5);margin-bottom:var(--space-6)">
        <div class="panel p-6 text-center bg-white border border-gray-200 animate-hover-lift">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Sessions</p>
          <p class="text-3xl font-bold text-gray-900">${totalSessions}</p>
        </div>
        <div class="panel p-6 text-center bg-white border border-gray-200 animate-hover-lift">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Latest Candidate Score</p>
          <p class="text-3xl font-bold text-gray-900">${
            latestScore !== null ? latestScore + '%' : '—'
          }</p>
          ${trendHtml}
        </div>
        <div class="panel p-6 text-center bg-white border border-gray-200 animate-hover-lift">
          <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Avg Candidate Score</p>
          <p class="text-3xl font-bold text-gray-900">${
            avgScore !== null ? avgScore + '%' : '—'
          }</p>
        </div>
      </div>
      
      <!-- Chart Container -->
      <div class="panel p-6 mb-6 bg-white border border-gray-200 animate-fade-in-up" style="height: 300px; display: flex; flex-direction: column;">
        <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Score Trend</h3>
        <div style="flex-grow: 1; position: relative;">
          <canvas id="scoreTrendChart"></canvas>
        </div>
      </div>
    `;

    /* ---------- Recent sessions ---------- */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listHtml = sessions
      .map((s: any, idx: number) => {
        const date = escapeHtml(new Date(s.startedAt).toLocaleDateString());
        const role = escapeHtml(s.config?.role || 'Engineer');
        const diff = escapeHtml(s.config?.difficulty || 'Mid');
        const style = escapeHtml(s.config?.style || 'Standard');
        const scoreVal =
          s.evaluation?.candidateRubric?.overall ??
          s.evaluation?.rubric?.overall ??
          s.evaluation?.score;
        const score = scoreVal !== undefined ? escapeHtml(scoreVal + '%') : 'Pending';

        // Add staggered delay
        const delay = idx * 0.05;

        return `
        <div class="panel p-4 mb-4 flex items-center justify-between hover:border-accent transition-colors animate-fade-in-up" style="animation-delay: ${delay}s">
          <div>
            <h4 class="font-semibold text-gray-900">${role} Interview</h4>
            <div class="flex items-center gap-2 mt-1">
              <span class="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">${diff}</span>
              <span class="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">${style}</span>
              <span class="text-sm text-gray-500 ml-2">Score: <span class="font-medium text-gray-800">${score}</span> • ${date}</span>
            </div>
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
      <div class="w-full">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h2>
          <button class="btn btn--primary" onclick="window.location.hash='#/session'">
            <i data-lucide="plus"></i>
            <span>New Session</span>
          </button>
        </div>

        ${statsHtml}

        <h3 class="text-lg font-semibold mb-4">All Sessions</h3>
        <div style="max-height: 400px; overflow-y: auto; padding-right: 8px;">
          ${listHtml}
        </div>
      </div>

    `;

    refreshIcons();

    /* ---------- Render Chart ---------- */
    if (scores.length > 0) {
      const canvas = document.getElementById('scoreTrendChart') as HTMLCanvasElement;
      if (canvas) {
        // Reverse sessions to show chronological order left-to-right
        const chronoSessions = [...sessions].reverse();
        const labels = chronoSessions.map((s: any) => new Date(s.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
        const dataPoints = chronoSessions.map((s: any) => 
          s.evaluation?.candidateRubric?.overall ?? s.evaluation?.rubric?.overall ?? s.evaluation?.score ?? null
        );

        new Chart(canvas, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: 'Overall Score',
              data: dataPoints,
              borderColor: '#0d9488', // Teal 600
              backgroundColor: 'rgba(13, 148, 136, 0.1)',
              borderWidth: 2,
              pointBackgroundColor: '#fff',
              pointBorderColor: '#0d9488',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
              fill: true,
              tension: 0.4 // Smooth curves
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: 'rgba(17, 24, 39, 0.9)',
                padding: 10,
                titleFont: { family: 'Inter', size: 13 },
                bodyFont: { family: 'Inter', size: 14, weight: 'bold' },
                displayColors: false,
                callbacks: {
                  label: (context) => `Score: ${context.raw}%`
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                max: 100,
                grid: { color: 'rgba(0, 0, 0, 0.05)' },
                ticks: { family: 'Inter', color: '#6b7280', stepSize: 20 }
              },
              x: {
                grid: { display: false },
                ticks: { family: 'Inter', color: '#6b7280' }
              }
            }
          }
        });
      }
    }
  } catch (err) {
    container.innerHTML = '<div class="p-8 text-center text-error">Failed to load dashboard</div>';
  }
}
