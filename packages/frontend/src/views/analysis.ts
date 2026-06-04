import { api } from '../api';
import { createBadge } from '../components/badge';
import { createButton } from '../components/button';
import { createCard } from '../components/card';
import { showToast } from '../components/toast';
import { refreshIcons } from '../lucide';
import { escapeHtml, sanitiseHtml } from '../utils/dom';
import { marked } from 'marked';

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
  isComparing = false; // Reset comparison state on navigation
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
  let phoenixTraceUrl: string | null = null;
  try {
    const [sessionRes, compRes] = await Promise.all([
      api.getSession(currentSessionId),
      api.getComparison(currentSessionId).catch(() => ({ comparison: null })),
    ]);
    session = sessionRes.session;
    phoenixTraceUrl = sessionRes.phoenixTraceUrl || null;
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
          phoenixTraceUrl
            ? `<a href="${phoenixTraceUrl}" target="_blank" class="btn btn--secondary" style="text-decoration: none;">
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
        <div id="btn-queue-container"></div>
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
            onClick: () => {
              navigator.clipboard
                .writeText(window.location.href)
                .then(() =>
                  showToast({
                    title: 'Share',
                    message: 'Link copied to clipboard!',
                    type: 'success',
                  }),
                )
                .catch(() =>
                  showToast({ title: 'Share', message: 'Failed to copy link', type: 'error' }),
                );
            },
          }),
        );
      }

      const targetContainer = document.getElementById('btn-target-container');
      if (targetContainer) {
        targetContainer.appendChild(
          createButton({
            label: 'Target Weaknesses',
            variant: 'primary',
            icon: 'target',
            onClick: async (e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              const originalLabel = btn.innerHTML;
              btn.disabled = true;
              btn.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i><span>Generating...</span>';
              refreshIcons();
              
              try {
                showToast({ title: 'Study Plan', message: 'Generating personalized curriculum...', type: 'info' });
                await api.generateStudyPlan(session.id);
                window.location.reload();
              } catch (err) {
                showToast({ title: 'Error', message: 'Failed to generate study plan', type: 'error' });
                btn.disabled = false;
                btn.innerHTML = originalLabel;
                refreshIcons();
              }
            },
          }),
        );
      }

      const queueContainer = document.getElementById('btn-queue-container');
      if (queueContainer) {
        queueContainer.appendChild(
          createButton({
            label: 'Queue Evaluation',
            variant: 'primary',
            icon: 'list-plus',
            onClick: () => {
              // Save config to localStorage to queue next session
              const queuedConfig = {
                ...session.config,
                focusAreas: session.strategyUpdate?.newRules || session.config.focusAreas,
              };
              localStorage.setItem('reflexa_queued_session', JSON.stringify(queuedConfig));
              showToast({ title: 'Queued', message: 'Next session will automatically apply these settings.', type: 'success' });
            },
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

    // ── Helper: render a score card ──
    const renderScoreCard = (
      label: string,
      score: number | undefined,
      key: string,
      accentClass: string,
    ): HTMLElement | null => {
      if (score === undefined) return null;

      let trendHtml = '';
      if (isComparing && comparison && comparison.delta[key] !== undefined) {
        const deltaVal = comparison.delta[key];
        if (typeof deltaVal !== 'number' || !Number.isFinite(deltaVal)) {
          // Skip delta display for invalid values
        } else {
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
        } // end else (valid delta)
      }

      const card = document.createElement('div');
      card.className = `score-card p-4 rounded-lg border ${accentClass}`;
      card.innerHTML = `
        <div class="text-sm text-gray-500 mb-1">${label}</div>
        <div class="flex items-end gap-3">
          <div class="text-3xl font-bold">${score}%</div>
          ${trendHtml}
        </div>
      `;
      return card;
    };

    // ── Candidate Performance Section ──
    const candidateRubric = evaluation.candidateRubric;
    if (candidateRubric) {
      const section = document.createElement('div');
      section.className = 'mb-8';
      const sectionTitle = document.createElement('h3');
      sectionTitle.className = 'text-lg font-semibold mb-3 flex items-center gap-2';
      sectionTitle.innerHTML = `<i data-lucide="user" style="width: 18px; height: 18px; color: var(--color-accent)"></i> Your Performance`;
      section.appendChild(sectionTitle);

      // Candidate summary
      if (evaluation.candidateSummary) {
        const summaryEl = document.createElement('p');
        summaryEl.className = 'text-sm text-gray-600 mb-4 leading-relaxed';
        summaryEl.textContent = evaluation.candidateSummary;
        section.appendChild(summaryEl);
      }

      const candidateGrid = document.createElement('div');
      candidateGrid.className = 'grid gap-4 mb-6';
      candidateGrid.style.display = 'grid';
      candidateGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(180px, 1fr))';

      const candidateScores = [
        { label: 'Overall', score: candidateRubric.overall, key: 'candidate_overall' },
        {
          label: 'Technical Accuracy',
          score: candidateRubric.technicalAccuracy,
          key: 'candidate_technicalAccuracy',
        },
        {
          label: 'Communication',
          score: candidateRubric.communicationClarity,
          key: 'candidate_communicationClarity',
        },
        {
          label: 'Problem Solving',
          score: candidateRubric.problemSolving,
          key: 'candidate_problemSolving',
        },
        {
          label: 'Depth of Knowledge',
          score: candidateRubric.depthOfKnowledge,
          key: 'candidate_depthOfKnowledge',
        },
      ];

      candidateScores.forEach((s) => {
        const card = renderScoreCard(s.label, s.score, s.key, 'bg-white');
        if (card) {
          // Add accent left-border to candidate cards
          card.style.borderLeft = '3px solid var(--color-accent)';
          candidateGrid.appendChild(card);
        }
      });
      section.appendChild(candidateGrid);
      scoreGridContainer.appendChild(section);
    }

    // ── Interviewer Calibration Section ──
    const section2 = document.createElement('div');
    section2.className = 'mb-6';
    const sectionTitle2 = document.createElement('h3');
    sectionTitle2.className = 'text-lg font-semibold mb-3 flex items-center gap-2';
    sectionTitle2.innerHTML = `<i data-lucide="bot" style="width: 18px; height: 18px; color: var(--color-gray-500)"></i> Interviewer Calibration`;
    section2.appendChild(sectionTitle2);

    const scoreGrid = document.createElement('div');
    scoreGrid.className = 'grid gap-4 mb-6';
    scoreGrid.style.display = 'grid';
    scoreGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(180px, 1fr))';

    const rubric = evaluation.rubric || { overall: evaluation.score };
    const baseScores = [
      { label: 'Overall Quality', score: rubric.overall, key: 'overall' },
      { label: 'Relevance', score: rubric.relevance, key: 'relevance' },
      { label: 'Depth of Probing', score: rubric.depth, key: 'depth' },
      { label: 'Clarity', score: rubric.clarity, key: 'clarity' },
      { label: 'Adaptability', score: rubric.adaptability, key: 'adaptability' },
      { label: 'Pacing', score: rubric.pacing, key: 'pacing' },
      {
        label: 'Opportunity Coverage',
        score: rubric.opportunityCoverage,
        key: 'opportunityCoverage',
      },
    ].filter((s) => s.score !== undefined);

    baseScores.forEach((s) => {
      const card = renderScoreCard(s.label, s.score, s.key, 'bg-white');
      if (card) scoreGrid.appendChild(card);
    });

    if (isComparing && comparison) {
      const compLabel = document.createElement('div');
      compLabel.className = 'col-span-full text-sm text-gray-500 mb-2 mt-2 italic';
      compLabel.textContent = comparison.behaviorChanges;
      scoreGrid.appendChild(compLabel);
    }

    section2.appendChild(scoreGrid);
    scoreGridContainer.appendChild(section2);

    // Re-render lucide icons for the new section heading elements
    refreshIcons();
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

  // ── Modal (must be created BEFORE createAccordion which references openModal) ──
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
    document.getElementById('modal-body')!.innerHTML = sanitiseHtml(htmlContent);
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

  // Escape key closes modal (accessibility)
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeModal();
  };
  document.addEventListener('keydown', handleEscape);

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
  (evaluation.weakTurns || []).forEach((wt: any) => {
    // Build trace detail from real session data instead of LLM-generated traceData
    let traceContent = '';
    const turnMatch = wt.turnLabel?.match(/(\d+)/);
    if (turnMatch && session.trace?.length) {
      const turnIdx = parseInt(turnMatch[1], 10);
      // Each turn is 2 trace entries (user + AI), so turn N starts at index (N-1)*2
      const startIdx = Math.max(0, (turnIdx - 1) * 2);
      const relevantTraces = session.trace.slice(startIdx, startIdx + 2);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      traceContent = relevantTraces
        .map((t: any) => {
          const role = t.type === 'user_message' ? 'You' : 'Interviewer';
          const text = t.payload?.text || '';
          const roleClass =
            t.type === 'user_message'
              ? 'color: var(--color-accent-700)'
              : 'color: var(--color-gray-700)';
          return (
            `<div style="margin-bottom: 12px; padding: 10px 14px; border-radius: 8px; background: ${
              t.type === 'user_message' ? 'var(--color-accent-50)' : 'var(--color-gray-50)'
            }">` +
            `<div style="font-weight: 600; font-size: 12px; ${roleClass}; margin-bottom: 4px;">${escapeHtml(
              role,
            )}</div>` +
            `<div style="font-size: 14px; line-height: 1.5; white-space: pre-wrap;">${escapeHtml(
              text,
            )}</div>` +
            `</div>`
          );
        })
        .join('');
    }
    if (!traceContent) {
      traceContent =
        '<div style="padding: 12px; color: var(--color-gray-500); font-style: italic;">No trace data available for this turn.</div>';
    }

    const accordion = createAccordion(
      { label: 'Improvement Area', variant: 'warning' },
      wt.turnLabel,
      wt.summary,
      wt.explanation,
      `<div class="bg-gray-50 p-4 rounded text-sm text-gray-800">${traceContent}</div>`,
      toTitleCase(wt.failurePatternLabel),
    );
    weakTurnsCardContent.appendChild(accordion);
  });

  // M16: Empty state when no weak turns detected
  if (!evaluation.weakTurns?.length) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'p-4 text-sm text-gray-500';
    emptyMsg.style.fontStyle = 'italic';
    emptyMsg.style.textAlign = 'center';
    emptyMsg.textContent = 'No critical anomalies detected — great session!';
    weakTurnsCardContent.appendChild(emptyMsg);
  }

  leftCol.appendChild(createCard({ title: 'Critical Anomalies', content: weakTurnsCardContent }));

  // Right Column: Recommendations & Strategy
  const rightCol = document.createElement('div');
  rightCol.className = 'flex flex-col gap-6';

  const strategyContent = document.createElement('div');
  const strategyOverrides: string[] = evaluation.strategyOverrides || [];

  // M17: Handle empty strategy overrides
  if (strategyOverrides.length === 0) {
    strategyContent.innerHTML = `
      <p class="text-sm text-gray-500" style="font-style: italic; text-align: center; padding: 1rem;">
        No strategy adjustments recommended — the interviewer performed well this session.
      </p>
    `;
  } else {
    const stratList = strategyOverrides
      .map((s: string) => '<li>' + escapeHtml(s) + '</li>')
      .join('');

    strategyContent.innerHTML = `
      <p class="text-sm text-gray-600 mb-4">Your next generated session will be specifically tuned to pressure-test these weaknesses.</p>
      <ul class="text-sm text-gray-800 flex flex-col gap-2 mb-4 list-disc pl-4">
        ${stratList}
      </ul>
    `;
  }

  // Always show the configuration matrix button
  const btnContainer = document.createElement('div');
  btnContainer.className = 'flex gap-2 mt-auto';
  btnContainer.innerHTML = `
      <button class="btn btn--secondary" id="preview-strategy-btn">
        <i data-lucide="eye"></i>
        <span>View Configuration Matrix</span>
      </button>
      <div id="btn-queue-container"></div>
  `;
  strategyContent.appendChild(btnContainer);

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

  // ── Study Plan Section ──
  const studyPlanContainer = document.createElement('div');
  studyPlanContainer.id = 'study-plan-container';
  studyPlanContainer.className = 'mt-8 animate-fade-in';
  container.appendChild(studyPlanContainer);

  const renderStudyPlanContent = () => {
    if (!session.evaluation?.studyPlan) return;
    studyPlanContainer.innerHTML = '';
    
    // Convert Markdown to HTML
    const rawHtml = marked.parse(session.evaluation.studyPlan.contentMarkdown);
    const cleanHtml = sanitiseHtml(rawHtml as string);

    const planCard = document.createElement('div');
    planCard.className = 'bg-white p-8 rounded-lg border border-accent/20 shadow-sm prose prose-accent max-w-none';
    planCard.innerHTML = cleanHtml;
    
    studyPlanContainer.appendChild(
      createCard({
        title: 'Your Personalized Study Plan',
        content: planCard,
      })
    );
    
    // Hide Target Weaknesses button if study plan already generated
    const targetBtn = document.getElementById('btn-target-container');
    if (targetBtn) targetBtn.style.display = 'none';
  };

  renderStudyPlanContent();

  setTimeout(() => {
    const stratBtn = document.getElementById('preview-strategy-btn');
    if (stratBtn) {
      stratBtn.addEventListener('click', () => {
        openModal(
          'Next Session Strategy Profile',
          '<div class="bg-gray-50 p-4 rounded-md border text-sm text-gray-800 font-mono" style="white-space: pre-wrap">SYSTEM PROMPT OVERRIDES:\n' +
            strategyOverrides.map((o: string) => '- ' + escapeHtml(o)).join('\n') +
            '</div>',
        );
      });
    }

    const queueContainer = document.getElementById('btn-queue-container');
    if (queueContainer) {
      queueContainer.appendChild(
        createButton({
          label: 'Start New Session',
          variant: 'primary',
          icon: 'play',
          onClick: () => {
            // Pre-fill session wizard with same role/difficulty targeting weak areas
            const weakAreas =
              evaluation.weakTurns
                ?.map((wt: { failurePatternLabel?: string }) => wt.failurePatternLabel)
                .filter(Boolean) || [];
            try {
              sessionStorage.setItem(
                'reflexa_prefill',
                JSON.stringify({ ...session.config, weakAreas }),
              );
            } catch {
              /* sessionStorage may be full */
            }
            window.location.hash = '#/session';
          },
        }),
      );
    }
  }, 0);

  refreshIcons();
}
