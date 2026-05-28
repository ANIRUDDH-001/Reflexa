import { createAlert } from '../components/alert';
import { createBadge } from '../components/badge';
import { createButton } from '../components/button';
import { createCard } from '../components/card';
import { refreshIcons } from '../lucide';

// --- State ---
let isComparing = false;

export function renderAnalysis(container: HTMLElement): void {
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'view-header flex justify-between items-start';

  const renderHeader = () => {
    header.innerHTML = `
      <div>
        <h2 class="view-header__title">Telemetry Analysis</h2>
        <p class="view-header__subtitle">System Design • Rate Limiter • Completed 2 mins ago</p>
      </div>
      <div class="flex gap-2">
        <button id="compare-toggle" class="btn btn--secondary">
          <i data-lucide="split"></i>
          <span>${isComparing ? 'View Current' : 'Compare Previous'}</span>
        </button>
        ${createButton({ label: 'Share', variant: 'secondary', icon: 'share-2' }).outerHTML}
        ${
          createButton({ label: 'Target Weaknesses', variant: 'primary', icon: 'dumbbell' })
            .outerHTML
        }
      </div>
    `;

    setTimeout(() => {
      const toggle = document.getElementById('compare-toggle');
      if (toggle) {
        toggle.addEventListener('click', () => {
          isComparing = !isComparing;
          renderHeader();
          renderScores(); // Re-render scores to show comparison
          refreshIcons();
        });
      }
    }, 0);
  };

  renderHeader();
  container.appendChild(header);

  // Score Summary Layout
  const scoreGridContainer = document.createElement('div');
  container.appendChild(scoreGridContainer);

  const renderScores = () => {
    scoreGridContainer.innerHTML = '';
    const scoreGrid = document.createElement('div');
    scoreGrid.className = 'grid gap-6 mb-6';
    scoreGrid.style.display = 'grid';
    scoreGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';

    const baseScores = [
      { label: 'Overall Score', score: '82%', trend: '+4%', trendType: 'positive' },
      { label: 'Requirements', score: '95%', trend: 'Steady', trendType: 'neutral' },
      { label: 'High-level Design', score: '85%', trend: '+10%', trendType: 'positive' },
      { label: 'Deep Dive (Bottlenecks)', score: '60%', trend: '-5%', trendType: 'negative' },
    ];

    const compareScores = [
      { label: 'Overall Score', score: '82%', trend: 'vs 78%', trendType: 'positive' },
      { label: 'Requirements', score: '95%', trend: 'vs 95%', trendType: 'neutral' },
      { label: 'High-level Design', score: '85%', trend: 'vs 75%', trendType: 'positive' },
      { label: 'Deep Dive (Bottlenecks)', score: '60%', trend: 'vs 65%', trendType: 'negative' },
    ];

    const data = isComparing ? compareScores : baseScores;

    data.forEach((s) => {
      const cardContent = document.createElement('div');
      cardContent.className = 'score-card p-4 rounded-lg border bg-white';
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
              s.trendType !== 'neutral' && !isComparing
                ? `<i data-lucide="${
                    s.trendType === 'positive' ? 'trending-up' : 'trending-down'
                  }" style="width: 14px; height: 14px"></i>`
                : isComparing
                ? ''
                : `<i data-lucide="minus" style="width: 14px; height: 14px"></i>`
            }
            ${s.trend}
          </div>
        </div>
      `;
      scoreGrid.appendChild(cardContent);
    });
    scoreGridContainer.appendChild(scoreGrid);
  };
  renderScores();

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
  weakTurnsCardContent.className = 'flex flex-col';

  // Helper to create an accordion
  const createAccordion = (
    badgeOpts: {
      label: string;
      variant?: 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'accent';
    },
    turnLabel: string,
    summary: string,
    explanation: string,
    traceData: string,
  ) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'accordion';

    const header = document.createElement('div');
    header.className = 'accordion__header';
    header.innerHTML = `
      <div class="flex items-center gap-3">
        ${createBadge(badgeOpts).outerHTML}
        <span class="text-sm font-medium text-gray-800">${summary}</span>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-xs text-gray-500">${turnLabel}</span>
        <i data-lucide="chevron-down" class="accordion__chevron"></i>
      </div>
    `;

    const content = document.createElement('div');
    content.className = 'accordion__content';
    content.innerHTML = `
      <div class="py-4">
        <p class="text-sm text-gray-600 mb-3">${explanation}</p>
        <button class="btn btn--sm btn--secondary trace-btn">
          <i data-lucide="search"></i>
          <span>View Trace</span>
        </button>
      </div>
    `;

    header.addEventListener('click', () => {
      wrapper.classList.toggle('accordion--open');
    });

    const traceBtn = content.querySelector('.trace-btn');
    traceBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      openModal('Trace Detail', traceData);
    });

    wrapper.appendChild(header);
    wrapper.appendChild(content);
    return wrapper;
  };

  const weakTurn1 = createAccordion(
    { label: 'Missed Requirement', variant: 'error' },
    'Turn 4',
    'Ignored global distribution',
    'You proposed a single Redis cluster in US-East, completely ignoring the "global distribution" requirement mentioned in the prompt. <br><br><strong>Better approach:</strong> Discuss active-active replication or local caches with asynchronous global syncing.',
    `
      <div class="trace-message trace-message--ai">
        <strong>AI (Turn 3):</strong> We expect this rate limiter to handle approximately 1 million requests per second globally, distributed across 5 regional data centers. Does that help scope the problem?
      </div>
      <div class="trace-message trace-message--user">
        <strong>You (Turn 4):</strong> Yes, for 1M RPS, we can use a Redis cluster in US-East with a token bucket algorithm.
      </div>
    `,
  );

  const weakTurn2 = createAccordion(
    { label: 'Vague Technical Detail', variant: 'warning' },
    'Turn 12',
    'Race conditions not addressed',
    'You mentioned "we update the count" but didn\'t address the race conditions in a concurrent environment. <br><br><strong>Better approach:</strong> Explicitly mention Redis INCR with TTL, or Lua scripts to ensure atomicity.',
    `
      <div class="trace-message trace-message--ai">
        <strong>AI (Turn 11):</strong> How exactly does your system update the request count when multiple requests arrive simultaneously?
      </div>
      <div class="trace-message trace-message--user">
        <strong>You (Turn 12):</strong> The API gateway checks the current count for the user in Redis, and if it's below the limit, we update the count and allow the request.
      </div>
    `,
  );

  weakTurnsCardContent.appendChild(weakTurn1);
  weakTurnsCardContent.appendChild(weakTurn2);

  leftCol.appendChild(
    createCard({
      title: 'Critical Anomalies',
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
      title: 'Optimization Directives',
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
    <div class="flex gap-2 mt-auto">
      <button class="btn btn--secondary" id="preview-strategy-btn">
        <i data-lucide="eye"></i>
        <span>View Configuration Matrix</span>
      </button>
      ${
        createButton({
          label: 'Queue Evaluation',
          variant: 'primary',
          icon: 'calendar',
        }).outerHTML
      }
    </div>
  `;
  rightCol.appendChild(
    createCard({
      title: 'Evaluation Model Calibration',
      content: strategyContent,
    }),
  );

  mainGrid.appendChild(leftCol);
  mainGrid.appendChild(rightCol);

  container.appendChild(mainGrid);

  setTimeout(() => {
    const stratBtn = document.getElementById('preview-strategy-btn');
    if (stratBtn) {
      stratBtn.addEventListener('click', () => {
        openModal(
          'Next Session Strategy Profile',
          `
          <p class="text-sm text-gray-700 mb-4">The AI has updated your internal training profile based on this session's weaknesses. Here is the exact prompt configuration for your next interview:</p>
          <div class="bg-gray-50 p-4 rounded-md border text-sm text-gray-800 font-mono" style="white-space: pre-wrap">SYSTEM PROMPT OVERRIDES:
- Enforce strict evaluation of distributed concurrency (Redis Lua, Distributed Locks).
- Automatically deduct points if the candidate fails to ask about multi-region data replication.
- Interject with a simulated network partition scenario midway through the system design.</div>
        `,
        );
      });
    }
  }, 0);

  // Modal Container
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  modalOverlay.innerHTML = `
    <div class="modal-container">
      <div class="flex justify-between items-center mb-4 border-b pb-2">
        <h3 class="text-lg font-semibold" id="modal-title">Title</h3>
        <button class="text-gray-400 hover:text-gray-600 transition-colors" id="modal-close">
          <i data-lucide="x"></i>
        </button>
      </div>
      <div id="modal-body"></div>
    </div>
  `;
  container.appendChild(modalOverlay);

  const openModal = (title: string, htmlContent: string) => {
    document.getElementById('modal-title')!.textContent = title;
    document.getElementById('modal-body')!.innerHTML = htmlContent;
    modalOverlay.classList.add('modal-overlay--open');
    refreshIcons();
  };

  const closeModal = () => {
    modalOverlay.classList.remove('modal-overlay--open');
  };

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  setTimeout(() => {
    document.getElementById('modal-close')?.addEventListener('click', closeModal);
  }, 0);

  // Initialize icons
  refreshIcons();
}
