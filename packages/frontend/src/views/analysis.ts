import { createAlert } from '../components/alert';
import { createBadge } from '../components/badge';
import { createButton } from '../components/button';
import { createCard } from '../components/card';
import { refreshIcons } from '../lucide';

export function renderAnalysis(container: HTMLElement): void {
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'view-header flex justify-between items-start';
  header.innerHTML = `
    <div>
      <h2 class="view-header__title">Session Analysis</h2>
      <p class="view-header__subtitle">System Design • Rate Limiter • Completed 2 mins ago</p>
    </div>
    <div class="flex gap-2">
      ${createButton({ label: 'Share', variant: 'secondary', icon: 'share-2' }).outerHTML}
      ${
        createButton({ label: 'Practice Weak Areas', variant: 'primary', icon: 'dumbbell' })
          .outerHTML
      }
    </div>
  `;
  container.appendChild(header);

  // Score Summary Layout
  const scoreGrid = document.createElement('div');
  scoreGrid.className = 'grid gap-6 mb-6';
  scoreGrid.style.display = 'grid';
  scoreGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';

  const scoreData = [
    { label: 'Overall Score', score: '82%', trend: '+4%', trendType: 'positive' },
    { label: 'Requirements', score: '95%', trend: 'Steady', trendType: 'neutral' },
    { label: 'High-level Design', score: '85%', trend: '+10%', trendType: 'positive' },
    { label: 'Deep Dive (Bottlenecks)', score: '60%', trend: '-5%', trendType: 'negative' },
  ];

  scoreData.forEach((s) => {
    const cardContent = document.createElement('div');
    cardContent.innerHTML = `
      <div class="text-sm text-gray-500 mb-1">${s.label}</div>
      <div class="flex items-end gap-3">
        <div class="text-3xl font-bold">${s.score}</div>
        <div class="text-sm font-medium ${
          s.trendType === 'positive'
            ? 'text-success'
            : s.trendType === 'negative'
            ? 'text-error'
            : 'text-gray-500'
        } mb-1 flex items-center gap-1">
          ${
            s.trendType !== 'neutral'
              ? `<i data-lucide="${
                  s.trendType === 'positive' ? 'trending-up' : 'trending-down'
                }" style="width: 14px; height: 14px"></i>`
              : `<i data-lucide="minus" style="width: 14px; height: 14px"></i>`
          }
          ${s.trend}
        </div>
      </div>
    `;
    scoreGrid.appendChild(createCard({ content: cardContent }));
  });

  container.appendChild(scoreGrid);

  // Main Content Grid (Weak turns + Strategy)
  const mainGrid = document.createElement('div');
  mainGrid.style.display = 'grid';
  mainGrid.style.gridTemplateColumns = '2fr 1fr';
  mainGrid.style.gap = 'var(--space-6)';

  // Responsive layout inline fix for simpler setup
  const style = document.createElement('style');
  style.textContent = `
    @media (max-width: 1024px) {
      #analysis-main-grid { grid-template-columns: 1fr !important; }
    }
  `;
  container.appendChild(style);
  mainGrid.id = 'analysis-main-grid';

  // Left Column: Weak Turns
  const leftCol = document.createElement('div');
  leftCol.className = 'flex flex-col gap-6';

  const weakTurnsCardContent = document.createElement('div');
  weakTurnsCardContent.className = 'flex flex-col gap-4';

  const weakTurnItem1 = document.createElement('div');
  weakTurnItem1.className = 'p-4 border rounded-md border-error-light bg-error-light bg-opacity-10';
  weakTurnItem1.innerHTML = `
    <div class="flex justify-between items-center mb-2">
      ${createBadge({ label: 'Missed Requirement', variant: 'error' }).outerHTML}
      <span class="text-xs text-gray-500">Turn 4</span>
    </div>
    <p class="text-sm font-medium mb-1">When asked about global latency...</p>
    <p class="text-sm text-gray-600 mb-3">You proposed a single Redis cluster in US-East, completely ignoring the "global distribution" requirement mentioned in the prompt.</p>
    <div class="bg-white p-3 rounded text-sm text-gray-800 border">
      <strong>Better approach:</strong> Discuss active-active replication or local caches with asynchronous global syncing.
    </div>
  `;

  const weakTurnItem2 = document.createElement('div');
  weakTurnItem2.className =
    'p-4 border rounded-md border-warning-light bg-warning-light bg-opacity-10';
  weakTurnItem2.innerHTML = `
    <div class="flex justify-between items-center mb-2">
      ${createBadge({ label: 'Vague Technical Detail', variant: 'warning' }).outerHTML}
      <span class="text-xs text-gray-500">Turn 12</span>
    </div>
    <p class="text-sm font-medium mb-1">When detailing the token bucket algorithm...</p>
    <p class="text-sm text-gray-600 mb-3">You mentioned "we update the count" but didn't address the race conditions in a concurrent environment.</p>
    <div class="bg-white p-3 rounded text-sm text-gray-800 border">
      <strong>Better approach:</strong> Explicitly mention Redis INCR with TTL, or Lua scripts to ensure atomicity.
    </div>
  `;

  weakTurnsCardContent.appendChild(weakTurnItem1);
  weakTurnsCardContent.appendChild(weakTurnItem2);

  leftCol.appendChild(
    createCard({
      title: 'Critical Weak Turns',
      content: weakTurnsCardContent,
    }),
  );

  // Right Column: Recommendations & Strategy
  const rightCol = document.createElement('div');
  rightCol.className = 'flex flex-col gap-6';

  const recContent = document.createElement('div');
  recContent.className = 'flex flex-col gap-4';
  recContent.appendChild(
    createAlert({
      title: 'Study Concurrency',
      message: 'Review Redis Lua scripts and distributed locks. You lost points on atomicity.',
      type: 'warning',
    }),
  );
  recContent.appendChild(
    createAlert({
      title: 'Clarify upfront',
      message: 'Great job asking about scale, but you forgot to ask about read/write ratios.',
      type: 'info',
    }),
  );
  rightCol.appendChild(
    createCard({
      title: 'Actionable Recommendations',
      content: recContent,
    }),
  );

  const strategyContent = document.createElement('div');
  strategyContent.innerHTML = `
    <p class="text-sm text-gray-600 mb-4">Your next generated session will be specifically tuned to pressure-test these weaknesses.</p>
    <ul class="text-sm text-gray-800 flex flex-col gap-2 mb-4 list-disc pl-4">
      <li>More aggressive follow-ups on race conditions.</li>
      <li>System design prompt will heavily feature multi-region constraints.</li>
    </ul>
    <div class="mt-auto">
      ${
        createButton({
          label: 'Schedule Next Session',
          variant: 'primary',
          icon: 'calendar',
        }).outerHTML
      }
    </div>
  `;
  rightCol.appendChild(
    createCard({
      title: 'Next Session Strategy Preview',
      content: strategyContent,
    }),
  );

  mainGrid.appendChild(leftCol);
  mainGrid.appendChild(rightCol);

  container.appendChild(mainGrid);

  // Initialize icons
  refreshIcons();
}
