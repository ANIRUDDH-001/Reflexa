import { marked } from 'marked';
import { api, sendTurnStream, invalidateSessionsCache } from '../api';
import { createBadge } from '../components/badge';
import { createButton } from '../components/button';
import { createCard } from '../components/card';
import { createProgress } from '../components/progress';
import { showToast } from '../components/toast';
import { refreshIcons } from '../lucide';
import { escapeHtml, sanitiseHtml } from '../utils/dom';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  isError?: boolean;
  traceId?: string;
}

let messages: Message[] = [];
let isThinking = false;
let isPaused = false;
let currentSessionId: string | null = null;
let currentTurn = 0;
let currentMaxTurns = 20;
let currentPhase = 'intro';
let currentAbortController: AbortController | null = null;

// Abort stream if user navigates away
window.addEventListener('hashchange', () => {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
});

export async function renderInterview(
  container: HTMLElement,
  params?: Record<string, string>,
): Promise<void> {
  messages = [];
  isThinking = true; // start thinking while loading
  isPaused = false;
  currentSessionId = params?.id || null;
  currentTurn = 0;
  currentPhase = 'intro';

  // Safe: explicitly cleared
  container.innerHTML = '';

  const layout = document.createElement('div');
  layout.className = 'interview-layout';

  // --- Chat Area ---
  const chatArea = document.createElement('div');
  chatArea.className = 'chat-area';
  chatArea.style.height = '100%';

  // Header
  const chatHeader = document.createElement('div');
  chatHeader.className = 'chat-header';

  const headerInfo = document.createElement('div');
  headerInfo.className = 'flex items-center gap-3';
  headerInfo.innerHTML = `
    <div class="font-bold text-gray-900 tracking-tight" id="header-role">Loading...</div>
    <div id="header-phase" class="ml-2 animate-fade-in-up"></div>
    <div id="header-progress" class="text-sm font-medium text-gray-500 ml-4 hidden md:block"></div>
    <div id="header-focus-areas" class="ml-4"></div>
  `;

  const headerActions = document.createElement('div');
  headerActions.className = 'flex items-center gap-2';

  const pauseBtn = createButton({
    label: 'Suspend',
    variant: 'secondary',
    icon: 'pause-circle',
    size: 'sm',
    onClick: () => {
      isPaused = !isPaused;
      updateState();
    },
  });

  const endBtn = createButton({
    label: 'Terminate Session',
    variant: 'secondary',
    icon: 'x-square',
    size: 'sm',
    onClick: async () => {
      if (!currentSessionId) return;
      endBtn.classList.add('btn--loading');
      try {
        await api.endSession(currentSessionId);
        invalidateSessionsCache();
        window.location.hash = '#/analysis/' + currentSessionId;
      } catch (e) {
        showToast({ title: 'Error', message: 'Failed to terminate session', type: 'error' });
      } finally {
        endBtn.classList.remove('btn--loading');
      }
    },
  });
  endBtn.classList.add('text-error');

  headerActions.appendChild(pauseBtn);
  headerActions.appendChild(endBtn);

  chatHeader.appendChild(headerInfo);
  chatHeader.appendChild(headerActions);
  chatArea.appendChild(chatHeader);

  // Messages Container
  const messagesContainer = document.createElement('div');
  messagesContainer.className = 'chat-messages';
  chatArea.appendChild(messagesContainer);

  // Composer
  const composer = document.createElement('div');
  composer.className = 'composer';

  const composerInner = document.createElement('div');
  composerInner.className = 'composer__inner';

  const input = document.createElement('textarea');
  input.className = 'composer__input';
  input.placeholder = 'Type your response...';
  input.rows = 1;

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  const sendBtn = createButton({
    label: '',
    icon: 'send',
    variant: 'primary',
    onClick: () => handleSend(),
  });
  sendBtn.setAttribute('aria-label', 'Send message');

  composerInner.appendChild(input);
  composerInner.appendChild(sendBtn);
  composer.appendChild(composerInner);
  chatArea.appendChild(composer);

  // --- Sidebar ---
  const sidebar = document.createElement('div');
  sidebar.className = 'interview-sidebar';

  const rubricContent = document.createElement('div');
  rubricContent.id = 'rubric-content';
  // Safe: hardcoded static HTML
  rubricContent.innerHTML = `
    <div class="text-sm font-medium mb-1">Last Action</div>
    <div class="text-sm text-gray-600 mb-3" data-field="last-action">Waiting for first turn...</div>
    <div class="text-sm text-accent mb-3" data-field="status"></div>
    <div class="flex gap-4">
      <div>
        <div class="text-xs text-gray-500 uppercase">Depth</div>
        <div class="text-sm font-medium" data-field="depth-signal">-</div>
      </div>
      <div>
        <div class="text-xs text-gray-500 uppercase">Coverage</div>
        <div class="text-sm font-medium" data-field="topic-coverage">-</div>
      </div>
    </div>
  `;
  sidebar.appendChild(createCard({ title: 'Session Metadata', content: rubricContent }));

  const progressContent = document.createElement('div');
  progressContent.id = 'progress-content';
  sidebar.appendChild(createCard({ content: progressContent }));

  layout.appendChild(chatArea);
  layout.appendChild(sidebar);
  container.appendChild(layout);

  // ── DOM helpers ───────────────────────────────────────────────────────────

  function buildMessageEl(msg: Message): HTMLElement {
    const msgEl = document.createElement('div');
    msgEl.className = 'message message--' + msg.role + (msg.isError ? ' message--error' : '');
    msgEl.dataset.messageId = msg.id;

    const traceHtml = '';

    const contentHtml =
      msg.role === 'ai' && !msg.isError
        ? sanitiseHtml(marked.parse(msg.text) as string)
        : escapeHtml(msg.text).replace(/\n/g, '<br>');

    // Safe: escaped/sanitised HTML
    msgEl.innerHTML = `
      <div class="message__avatar"><i data-lucide="${msg.role === 'ai' ? 'bot' : 'user'}"></i></div>
      <div class="message__content">
        <div class="message__bubble prose prose-sm max-w-none">${contentHtml}${traceHtml}</div>
      </div>
    `;
    return msgEl;
  }

  function showTypingIndicator(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'message message--ai';
    el.id = 'typing-indicator';
    // Safe: hardcoded typing indicator HTML
    el.innerHTML = `
      <div class="message__avatar"><i data-lucide="bot"></i></div>
      <div class="message__content">
        <div class="message__bubble">
          <div class="typing-indicator">
            <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
          </div>
        </div>
      </div>
    `;
    messagesContainer.appendChild(el);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    refreshIcons();
    return el;
  }

  // ── Streaming send handler ────────────────────────────────────────────────
  const handleSend = async () => {
    const text = input.value.trim();
    if (!text || isThinking || isPaused || !currentSessionId) return;

    // Disable input and clear
    input.value = '';
    input.style.height = 'auto';
    isThinking = true;
    setComposerDisabled(true);

    // Optimistically render user bubble
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text };
    messages.push(userMsg);
    messagesContainer.appendChild(buildMessageEl(userMsg));
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Typing indicator
    const typingEl = showTypingIndicator();

    // Streaming AI bubble
    const aiBubbleId = (Date.now() + 1).toString();
    let aiBubble: HTMLElement | null = null;
    let fullText = '';
    let hasStarted = false;

    try {
      currentAbortController = new AbortController();
      for await (const event of sendTurnStream(
        currentSessionId,
        text,
        currentAbortController.signal,
      )) {
        if (event.type === 'token') {
          if (!hasStarted) {
            // First token: swap typing indicator for the real bubble
            typingEl.remove();
            aiBubble = document.createElement('div');
            aiBubble.className = 'message message--ai';
            aiBubble.dataset.messageId = aiBubbleId;
            // Safe: hardcoded streaming bubble HTML
            aiBubble.innerHTML = `
              <div class="message__avatar"><i data-lucide="bot"></i></div>
              <div class="message__content">
                <div class="message__bubble" id="streaming-bubble-text"></div>
              </div>
            `;
            messagesContainer.appendChild(aiBubble);
            refreshIcons();
            hasStarted = true;
          }
          fullText += event.text;
          const bubbleText = aiBubble?.querySelector('#streaming-bubble-text');
          if (bubbleText) bubbleText.textContent = fullText;
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } else if (event.type === 'done') {
          // Finalise: remove the temp streaming ID, push to messages array
          if (aiBubble) {
            const textEl = aiBubble.querySelector('#streaming-bubble-text');
            if (textEl) textEl.removeAttribute('id');

            // Removed Phoenix trace link appendage
          }

          messages.push({
            id: aiBubbleId,
            role: 'ai',
            text: fullText,
            traceId: event.traceId,
          });

          // Update sidebar turn counter
          const progressEl = document.getElementById('progress-content');
          if (progressEl) {
            // Safe: clearing contents
            progressEl.innerHTML = '';
            currentTurn = event.turnCount;
            currentPhase = event.phase;
            progressEl.appendChild(
              createProgress({
                value: currentTurn,
                max: currentMaxTurns,
                label: `Turn ${currentTurn} • Phase: ${currentPhase.replace('_', ' ')}`,
              }),
            );
          }

          // ── ADD: refresh sidebar metadata ─────────────────────────────
          const metadataEl = document.getElementById('rubric-content');
          if (metadataEl && event.metadata) {
            const lastAction = event.metadata.nextActionIndicator || 'ask_question';
            const statusText = event.metadata.statusMetadata || '';
            const assessment = event.metadata.assessment;

            // Update "Last Action" badge
            const actionEl = metadataEl.querySelector('[data-field="last-action"]');
            if (actionEl) actionEl.textContent = lastAction;

            // Update "Last AI status"
            const statusEl = metadataEl.querySelector('[data-field="status"]');
            if (statusEl) statusEl.textContent = statusText;

            // If candidateAssessment added in 03_03, show it too:
            if (assessment) {
              const depthEl = metadataEl.querySelector('[data-field="depth-signal"]');
              if (depthEl) depthEl.textContent = assessment.depthSignal || '-';

              const coverageEl = metadataEl.querySelector('[data-field="topic-coverage"]');
              if (coverageEl)
                coverageEl.textContent =
                  assessment.topicCoverage != null ? `${assessment.topicCoverage}%` : '-';
            }
          }
          // ── END sidebar refresh ────────────────────────────────────────

          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } else if (event.type === 'error') {
          typingEl.remove();
          if (aiBubble) aiBubble.remove();
          showToast({ title: 'Interview error', message: event.message, type: 'error' });
          setComposerDisabled(false);
          isThinking = false;
        }
      }
    } catch (err) {
      typingEl.remove();
      aiBubble?.remove();
      showToast({
        title: 'Connection Lost',
        message: 'Check your network and try again.',
        type: 'error',
      });
    } finally {
      isThinking = false;
      setComposerDisabled(false);
      input.focus();
    }
  };

  function setComposerDisabled(disabled: boolean): void {
    if (disabled) {
      composer.classList.add('composer--disabled');
      input.disabled = true;
      sendBtn.setAttribute('disabled', 'true');
      input.placeholder = 'AI is analyzing your response...';
    } else {
      composer.classList.remove('composer--disabled');
      input.disabled = false;
      sendBtn.removeAttribute('disabled');
      input.placeholder = 'Type your response...';
    }
  }

  const updateState = () => {
    // Re-render all persisted messages (used on initial load and pause toggle)
    // Safe: clearing contents
    messagesContainer.innerHTML = '';
    messages.forEach((msg) => {
      messagesContainer.appendChild(buildMessageEl(msg));
    });

    if (isThinking) {
      showTypingIndicator();
    }

    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    if (isPaused) {
      composer.classList.add('composer--disabled');
      input.disabled = true;
      sendBtn.setAttribute('disabled', 'true');
      input.placeholder = 'Session Suspended';
    } else if (!isThinking) {
      setComposerDisabled(false);
    }

    if (isPaused) {
      pauseBtn.classList.add('btn--primary');
      pauseBtn.classList.remove('btn--secondary');
      pauseBtn.innerHTML = '<i data-lucide="play-circle"></i><span>Resume</span>';
    } else {
      pauseBtn.classList.add('btn--secondary');
      pauseBtn.classList.remove('btn--primary');
      pauseBtn.innerHTML = '<i data-lucide="pause-circle"></i><span>Suspend</span>';
    }

    const progressEl = document.getElementById('progress-content');
    if (progressEl) {
      // Safe: clearing contents
      progressEl.innerHTML = '';
      progressEl.appendChild(
        createProgress({
          value: currentTurn,
          max: currentMaxTurns,
          label: `Turn ${currentTurn} • Phase: ${currentPhase.replace('_', ' ')}`,
        }),
      );
    }

    refreshIcons();
    // Also update header phase and progress
    const phaseEl = document.getElementById('header-phase');
    if (phaseEl) {
      phaseEl.innerHTML = createBadge({
        label: currentPhase.replace('_', ' ').toUpperCase(),
        variant: 'accent',
      }).outerHTML;
    }
    const progEl = document.getElementById('header-progress');
    if (progEl) {
      progEl.textContent = `Turn ${currentTurn} / ${currentMaxTurns}`;
    }
  };

  // Initial load
  updateState();
  if (currentSessionId) {
    try {
      const { session } = await api.getSession(currentSessionId);
      document.getElementById('header-role')!.textContent = (
        session.config.role || 'Engineer'
      ).toUpperCase();

      const focusAreasHtml = session.config?.focusAreas?.length
        ? `<div class="focus-areas-tags flex gap-1 flex-wrap mt-1">
            ${session.config.focusAreas
              .map((fa: string) => `<span class="tag">${escapeHtml(fa)}</span>`)
              .join('')}
           </div>`
        : '';
      document.getElementById('header-focus-areas')!.innerHTML = focusAreasHtml;

      currentTurn = session.turnCount || 0;
      currentMaxTurns = parseInt(session.config.timeLimit || '20', 10);
      currentPhase = session.interviewPhase || 'intro';

      if (session.status === 'completed') {
        showToast({
          title: 'Session Completed',
          message: 'This interview has already ended. It is read-only.',
          type: 'info',
        });
        isPaused = true;
      }

      if (session.trace && session.trace.length > 0) {
        messages = session.trace
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((t: any) => t.type === 'user_message' || t.type === 'ai_message')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((t: any) => ({
            id: t.id || Math.random().toString(),
            role: t.type === 'user_message' ? 'user' : 'ai',
            text: t.payload?.text || '',
            traceId: t.traceId,
          }));

        // Render the complete conversation history into the chat container.
        // Without this, the messages array is set but the DOM is never updated,
        // leaving the chat blank on reload.
        messagesContainer.innerHTML = ''; // clear any placeholder
        messages.forEach((msg) => {
          messagesContainer.appendChild(buildMessageEl(msg));
        });
        // Scroll to the most recent message
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const aiMsgs = session.trace.filter((t: any) => t.type === 'ai_message');
        const lastAiMsg = aiMsgs[aiMsgs.length - 1];

        if (lastAiMsg) {
          // Safe: escaped dynamic values
          document.getElementById('rubric-content')!.innerHTML = `
            <div class="text-sm font-medium mb-1">Last Action</div>
            <div class="text-sm text-gray-600 mb-3" data-field="last-action">${escapeHtml(
              session.lastAgentAction || 'Started session',
            )}</div>
            <div class="text-sm text-accent mb-3" data-field="status">${escapeHtml(
              lastAiMsg.payload?.metadata?.status || '',
            )}</div>
            <div class="flex gap-4">
              <div>
                <div class="text-xs text-gray-500 uppercase">Depth</div>
                <div class="text-sm font-medium" data-field="depth-signal">${escapeHtml(
                  lastAiMsg.payload?.assessment?.depthSignal || '-',
                )}</div>
              </div>
              <div>
                <div class="text-xs text-gray-500 uppercase">Coverage</div>
                <div class="text-sm font-medium" data-field="topic-coverage">${
                  lastAiMsg.payload?.assessment?.topicCoverage != null
                    ? lastAiMsg.payload.assessment.topicCoverage + '%'
                    : '-'
                }</div>
              </div>
            </div>
          `;
        }
      }
    } catch (e) {
      showToast({ title: 'Error', message: 'Failed to load session', type: 'error' });
    } finally {
      isThinking = false;
      updateState();
    }
  } else {
    isThinking = false;
    updateState();
  }
}
