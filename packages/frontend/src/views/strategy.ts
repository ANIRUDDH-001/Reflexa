import { getStrategyEvolution } from '../api';
import { escapeHtml } from '../utils/dom';

export async function renderStrategy(container: HTMLElement): Promise<void> {
  container.innerHTML =
    '<div class="p-8 text-center text-gray-500">Loading strategy evolution...</div>';

  const data = await getStrategyEvolution();

  if (!data || !data.evolution) {
    container.innerHTML =
      '<div class="p-8 text-center text-error">Failed to load strategy evolution</div>';
    return;
  }

  const { evolution } = data;

  if (evolution.length === 0) {
    container.innerHTML = `
      <div class="view-header">
        <h2 class="view-header__title">Strategy Evolution</h2>
        <p class="view-header__subtitle">Your personalized interview rules</p>
      </div>
      <div class="panel p-8 text-center">
        <div class="text-gray-400 mb-4"><i data-lucide="brain-circuit" style="width: 48px; height: 48px; margin: 0 auto;"></i></div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">No custom strategy yet</h3>
        <p class="text-gray-500 max-w-md mx-auto">Complete more interview sessions. The introspection agent will analyze your performance and generate personalized rules to guide future interviews.</p>
      </div>
    `;
    // @ts-expect-error - lucide is added via script tag
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  const totalCycles = evolution.length;
  const totalRules = evolution.reduce((acc, e) => acc + e.newRules.length, 0);

  let scoreDelta = 0;
  let scoreText = '-';
  let scoreClass = 'text-gray-900';
  if (evolution.length >= 2) {
    const firstScore = evolution[0].overallScore;
    const lastScore = evolution[evolution.length - 1].overallScore;
    if (firstScore && lastScore) {
      scoreDelta = lastScore - firstScore;
      if (scoreDelta > 0) {
        scoreText = `+${scoreDelta}%`;
        scoreClass = 'text-success';
      } else if (scoreDelta < 0) {
        scoreText = `${scoreDelta}%`;
        scoreClass = 'text-error';
      } else {
        scoreText = '0%';
      }
    }
  }

  container.innerHTML = `
    <div class="view-header">
      <h2 class="view-header__title">Strategy Evolution</h2>
      <p class="view-header__subtitle">How the AI interviewer adapts to your performance over time.</p>
    </div>
    
    <!-- Impact Analytics -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div class="bg-white p-5 rounded-lg border shadow-sm animate-fade-in-up">
        <div class="text-sm text-gray-500 mb-1 flex items-center gap-2"><i data-lucide="refresh-cw" style="width: 16px"></i> Introspection Cycles</div>
        <div class="text-3xl font-bold text-gray-900">${totalCycles}</div>
      </div>
      <div class="bg-white p-5 rounded-lg border shadow-sm animate-fade-in-up" style="animation-delay: 0.1s">
        <div class="text-sm text-gray-500 mb-1 flex items-center gap-2"><i data-lucide="shield-check" style="width: 16px"></i> Rules Generated</div>
        <div class="text-3xl font-bold text-gray-900">${totalRules}</div>
      </div>
      <div class="bg-white p-5 rounded-lg border shadow-sm animate-fade-in-up" style="animation-delay: 0.2s">
        <div class="text-sm text-gray-500 mb-1 flex items-center gap-2"><i data-lucide="trending-up" style="width: 16px"></i> Evaluated Improvement</div>
        <div class="text-3xl font-bold ${scoreClass}">${scoreText}</div>
        ${scoreDelta > 0 ? `<div class="text-xs text-gray-500 mt-1">Since first session</div>` : ''}
      </div>
    </div>
    
    <div class="max-w-4xl">
      <h3 class="text-lg font-semibold mb-6 flex items-center gap-2">
        <i data-lucide="history" class="text-accent" style="width: 20px"></i> Evolution Timeline
      </h3>
      <div class="relative border-l-2 border-teal-100 ml-4 md:ml-6">
        ${evolution
          .map((evt, index) => {
            const date = new Date(evt.endedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
            const versionNumber = parseInt((evt.strategyVersion || 'v0').replace('v', ''), 10) + 1;

            return `
            <div class="mb-10 ml-8 animate-fade-in-up" style="animation-delay: ${index * 0.1}s">
              <span class="absolute flex items-center justify-center w-8 h-8 bg-teal-100 rounded-full -left-4 ring-4 ring-white shadow-sm">
                <i data-lucide="zap" class="text-accent" style="width: 16px; height: 16px"></i>
              </span>
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-lg font-bold text-gray-900">Strategy Update v${versionNumber}</h3>
                <span class="text-sm text-gray-500">${date}</span>
              </div>
              <div class="bg-white p-5 rounded-lg border shadow-sm mb-4">
                <div class="mb-4">
                  <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">What Failed</h4>
                  <p class="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-100">${escapeHtml(
                    evt.whatFailed,
                  )}</p>
                </div>
                <div>
                  <h4 class="text-xs font-semibold text-accent uppercase tracking-wider mb-2">New Rules Enforced</h4>
                  <ul class="space-y-2">
                    ${evt.newRules
                      .map(
                        (r: string) =>
                          `<li class="text-sm text-gray-800 flex items-start gap-2"><i data-lucide="check-circle-2" class="text-success mt-0.5 shrink-0" style="width: 14px; height: 14px"></i><span>${escapeHtml(
                            r,
                          )}</span></li>`,
                      )
                      .join('')}
                  </ul>
                </div>
              </div>
              <div class="text-sm text-gray-400 flex items-center gap-2">
                <i data-lucide="fingerprint" style="width: 14px; height: 14px"></i>
                <span>Source Session: <a href="#/analysis/${
                  evt.sessionId
                }" class="text-accent hover:underline">${evt.sessionId.split('-')[0]}...</a></span>
              </div>
            </div>
          `;
          })
          .join('')}
      </div>
    </div>
  `;

  // @ts-expect-error - lucide is added via script tag
  if (window.lucide) window.lucide.createIcons();
}
