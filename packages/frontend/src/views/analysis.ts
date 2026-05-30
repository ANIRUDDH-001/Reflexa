import { api, PHOENIX_TRACE_BASE } from '../api';
import { createBadge } from '../components/badge';
import { createButton } from '../components/button';
import { createCard } from '../components/card';
import { showToast } from '../components/toast';
import { refreshIcons } from '../lucide';
import { escapeHtml } from '../utils/dom';

function toTitleCase(str: string): string {
  if (!str) return str;
  return str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

let isComparing = false;
let currentSessionId: string | null = null;

export async function renderAnalysis(
  container: HTMLElement,
  params?: Record<string, string>,
): Promise<void> {
  currentSessionId = params?.id || null;
  // Safe: static text
  container.innerHTML =
    '<div class="p-8 text-center text-gray-500">Loading analysis telemetry...</div>';

  if (!currentSessionId) {
    // Safe: static text
    container.innerHTML = '<div class="p-8 text-center text-error">No session ID provided</div>';
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let session: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let comparison: any = null;
  try {
    const [sessionRes, compRes] = await Promise.all([
      api.getSession(currentSessionId),
      api.getComparison(currentSessionId).catch(() => ({ comparison: null })),
    ]);
    session = sessionRes.session;
    comparison = compRes.comparison;
  } catch (e) {
    // Safe: static text
    container.innerHTML =
      '<div class="p-8 text-center text-error">Failed to load session data</div>';
    return;
  }

  const evaluation = session.evaluation;
  if (!evaluation) {
    // Safe: static text
    container.innerHTML =
      '<div class="p-8 text-center text-warning">Session is not yet evaluated or evaluation failed.</div>';
    return;
  }

  // Safe: clear
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'view-header flex justify-between items-start';

  const roleName = session.config.role || 'Engineer';
  const styleName = session.config.style || 'Technical';
  const timeElapsed = session.endedAt
    ? new Date(session.endedAt).toLocaleString()
    : new Date(session.startedAt).toLocaleString();

  const renderHeader = () => {
    // Safe: dynamic fields escaped
    header.innerHTML = `
      <div>
        <h2 class="view-header__title">Telemetry Analysis</h2>
        <p class="view-header__subtitle">${escapeHtml(roleName)} • ${escapeHtml(
      styleName,
    )} • ${escapeHtml(timeElapsed)}</p>
      </div>
      <div class="flex gap-2">
        ${
          session.evalTraceId && /^[0-9a-f]{32}$/.test(session.evalTraceId)
            ? `<a href="${PHOENIX_TRACE_BASE}/${session.evalTraceId}" target="_blank" class="btn btn--secondary" style="text-decoration: none;">
                <i data-lucide="external-link"></i>
                <span>View Full Trace</span>
              </a>`
            : ''
        }
        <button id="compare-toggle" class="btn btn--secondary">
          <i data-lucide="split"></i>
          <span>${isComparing ? 'View Current' : 'Compare Previous'}</span>
        </button>
        <div id="btn-share-container"></div>
        <div id="btn-target-container"></div>
      </div>
    `;

    setTimeout(() => {
      const toggle = document.getElementById('compare-toggle');
      if (toggle) {
        toggle.addEventListener('click', () => {
          isComparing = !isComparing;
          renderHeader();
          renderScores();
          refreshIcons();
        });
      }

      const shareContainer = document.getElementById('btn-share-container');
      if (shareContainer) {
        shareContainer.appendChild(
          createButton({
            label: 'Share',
            variant: 'secondary',
            icon: 'share-2',
            onClick: () =>
              showToast({ title: 'Share', message: 'Link copied to clipboard!', type: 'success' }),
          }),
        );
      }

      const targetContainer = document.getElementById('btn-target-container');
      if (targetContainer) {
        targetContainer.appendChild(
          createButton({
            label: 'Target Weaknesses',
            variant: 'primary',
            icon: 'dumbbell',
            onClick: () =>
              showToast({
                title: 'Target Weaknesses',
                message: 'Generating personalized curriculum...',
                type: 'success',
              }),
          }),
        );
      }
    }, 0);
  };

  renderHeader();
  container.appendChild(header);

  // Score Summary Layout
  const scoreGridContainer = document.createElement('div');
  container.appendChild(scoreGridContainer);

  const renderScores = () => {
    // Safe: clear
    scoreGridContainer.innerHTML = '';
    const scoreGrid = document.createElement('div');
    scoreGrid.className = 'grid gap-6 mb-6';
    scoreGrid.style.display = 'grid';
    scoreGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';

    const rubric = evaluation.rubric || { overall: evaluation.score };
    const baseScores = [
      { label: 'Overall Quality', score: rubric.overall, key: 'overall' },
      { label: 'Relevance', score: rubric.relevance, key: 'relevance' },
      { label: 'Depth of Probing', score: rubric.depth, key: 'depth' },
      { label: 'Clarity', score: rubric.clarity, key: 'clarity' },
      { label: 'Adaptability', score: rubric.adaptability, key: 'adaptability' },
      { label: 'Pacing', score: rubric.pacing, key: 'pacing' },
      {
        label: 'Opportunities Captured',
        score: rubric.missedOpportunities,
        key: 'missedOpportunities',
      },
    ].filter((s) => s.score !== undefined);

    baseScores.forEach((s) => {
      let trendHtml = '';
      if (isComparing && comparison && comparison.delta[s.key] !== undefined) {
        const deltaVal = comparison.delta[s.key];
        const trendType = deltaVal > 0 ? 'positive' : deltaVal < 0 ? 'negative' : 'neutral';
        const trendIcon =
          trendType === 'positive'
            ? 'trending-up'
            : trendType === 'negative'
            ? 'trending-down'
            : 'minus';
        const trendColor =
          trendType === 'positive'
            ? 'text-success'
            : trendType === 'negative'
            ? 'text-error'
            : 'text-gray-500';
        trendHtml = `
          <div class="text-sm font-medium ${trendColor} mb-1 flex items-center gap-1">
            <i data-lucide="${trendIcon}" style="width: 14px; height: 14px"></i>
            ${deltaVal > 0 ? '+' : ''}${deltaVal}%
          </div>
        `;
      }

      const cardContent = document.createElement('div');
      cardContent.className = 'score-card p-4 rounded-lg border bg-white';
      // Safe: internal score values
      cardContent.innerHTML = `
        <div class="text-sm text-gray-500 mb-1">${s.label}</div>
        <div class="flex items-end gap-3">
          <div class="text-3xl font-bold">${s.score}%</div>
          ${trendHtml}
        </div>
      `;
      scoreGrid.appendChild(cardContent);
    });

    if (isComparing && comparison) {
      const compLabel = document.createElement('div');
      compLabel.className = 'col-span-full text-sm text-gray-500 mb-2 mt-2 italic';
      compLabel.textContent = comparison.behaviorChanges;
      scoreGrid.appendChild(compLabel);
    }
    scoreGridContainer.appendChild(scoreGrid);
  };
  renderScores();

  // Main Content Grid
  const mainGrid = document.createElement('div');
  mainGrid.style.display = 'grid';
  mainGrid.style.gridTemplateColumns = '2fr 1fr';
  mainGrid.style.gap = 'var(--space-6)';

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

  const createAccordion = (
    opts: { label: string; variant?: 'error' | 'warning' | 'info' },
    turnLabel: string,
    summary: string,
    explanation: string,
    traceData: string,
    failureLabel?: string,
  ) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'accordion';

    const header = document.createElement('div');
    header.className = 'accordion__header flex justify-between w-full';
    // Safe: dynamic fields escaped
    header.innerHTML = `
      <div class="flex items-center gap-3">
        ${createBadge(opts).outerHTML}
        <span class="text-sm font-medium text-gray-800">${escapeHtml(summary)}</span>
      </div>
      <div class="flex items-center gap-3">
        ${
          failureLabel
            ? `<span class="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-200">${escapeHtml(
                failureLabel,
              )}</span>`
            : ''
        }
        <span class="text-xs text-gray-500">${escapeHtml(turnLabel)}</span>
        <i data-lucide="chevron-down" class="accordion__chevron"></i>
      </div>
    `;

    const content = document.createElement('div');
    content.className = 'accordion__content';
    // Safe: explanation escaped
    content.innerHTML = `
      <div class="py-4">
        <p class="text-sm text-gray-600 mb-3">${escapeHtml(explanation)}</p>
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  evaluation.weakTurns.forEach((wt: any) => {
    // Cross-reference turn numbers with actual session trace payloads
    const turnTextData = wt.turns
      .map((tn: number) => {
        const traceMsg = session.trace[tn - 1];
        if (!traceMsg || !traceMsg.payload) return `Turn ${tn}: [Data missing]`;
        return `Turn ${tn} (${traceMsg.type === 'ai_message' ? 'AI' : 'User'}):\n${escapeHtml(
          traceMsg.payload.text || '',
        )}`;
      })
      .join('\n\n');

    const accordion = createAccordion(
      { label: 'Improvement Area', variant: 'warning' },
      `Turns ${wt.turns.join(' & ')}`,
      wt.summary,
      wt.explanation,
      '<div class="bg-gray-50 p-4 rounded text-sm text-gray-800 space-y-2 whitespace-pre-wrap">' +
        turnTextData +
        '</div>',
      toTitleCase(wt.failureType || wt.type),
    );
    weakTurnsCardContent.appendChild(accordion);
  });

  leftCol.appendChild(createCard({ title: 'Critical Anomalies', content: weakTurnsCardContent }));

  // Right Column: Recommendations & Strategy
  const rightCol = document.createElement('div');
  rightCol.className = 'flex flex-col gap-6';

  const strategyContent = document.createElement('div');
  const stratList = evaluation.strategyOverrides
    .map((s: string) => '<li>' + escapeHtml(s) + '</li>')
    .join('');

  // Safe: dynamic list items escaped
  strategyContent.innerHTML = `
    <p class="text-sm text-gray-600 mb-4">Your next generated session will be specifically tuned to pressure-test these weaknesses.</p>
    <ul class="text-sm text-gray-800 flex flex-col gap-2 mb-4 list-disc pl-4">
      ${stratList}
    </ul>
    <div class="flex gap-2 mt-auto">
      <button class="btn btn--secondary" id="preview-strategy-btn">
        <i data-lucide="eye"></i>
        <span>View Configuration Matrix</span>
      </button>
      <div id="btn-queue-container"></div>
    </div>
  `;
  rightCol.appendChild(
    createCard({ title: 'Evaluation Model Calibration', content: strategyContent }),
  );

  if (session.strategyUpdate) {
    const strat = session.strategyUpdate;
    const introCardContent = document.createElement('div');
    // Safe: dynamic fields escaped
    introCardContent.innerHTML = `
      <div class="text-sm text-gray-700 space-y-4">
        <div class="flex items-center gap-2 text-accent border-b pb-2">
          <i data-lucide="bot"></i>
          <span class="font-medium">Introspection Agent Report (${escapeHtml(strat.id)})</span>
        </div>
        <div>
          <h4 class="font-semibold text-gray-900 mb-1">What Failed</h4>
          <p class="leading-relaxed text-gray-600">${escapeHtml(strat.whatFailed)}</p>
        </div>
        <div>
          <h4 class="font-semibold text-gray-900 mb-1">Why It Failed</h4>
          <p class="leading-relaxed text-gray-600">${escapeHtml(strat.whyItFailed)}</p>
        </div>
        <div>
          <h4 class="font-semibold text-gray-900 mb-1">What to do next time</h4>
          <p class="leading-relaxed text-gray-600">${escapeHtml(strat.whatToDoNextTime)}</p>
        </div>
        <div>
          <h4 class="font-semibold text-gray-900 mb-1">What to avoid</h4>
          <p class="leading-relaxed text-gray-600">${escapeHtml(strat.whatToAvoidNextTime)}</p>
        </div>
      </div>
    `;
    rightCol.insertBefore(
      createCard({ title: 'Self-Reflection (MCP)', content: introCardContent }),
      rightCol.firstChild,
    );
  }

  mainGrid.appendChild(leftCol);
  mainGrid.appendChild(rightCol);

  container.appendChild(mainGrid);

  setTimeout(() => {
    const stratBtn = document.getElementById('preview-strategy-btn');
    if (stratBtn) {
      stratBtn.addEventListener('click', () => {
        openModal(
          'Next Session Strategy Profile',
          '<div class="bg-gray-50 p-4 rounded-md border text-sm text-gray-800 font-mono" style="white-space: pre-wrap">SYSTEM PROMPT OVERRIDES:\n' +
            evaluation.strategyOverrides.map((o: string) => '- ' + escapeHtml(o)).join('\n') +
            '</div>',
        );
      });
    }

    const queueContainer = document.getElementById('btn-queue-container');
    if (queueContainer) {
      queueContainer.appendChild(
        createButton({
          label: 'Queue Evaluation',
          variant: 'primary',
          icon: 'calendar',
          onClick: () =>
            showToast({
              title: 'Evaluation Queued',
              message: 'Next session will automatically apply these settings.',
              type: 'success',
            }),
        }),
      );
    }
  }, 0);

  // Modal Container
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  // Safe: static HTML shell
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
    // Safe: content explicitly sanitised before passed to openModal
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

  refreshIcons();
}
