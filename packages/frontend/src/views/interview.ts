import { api, sendTurnStream, PHOENIX_TRACE_BASE } from '../api';
import { createBadge } from '../components/badge';
import { createButton } from '../components/button';
import { createCard } from '../components/card';
import { createProgress } from '../components/progress';
import { showToast } from '../components/toast';
import { refreshIcons } from '../lucide';
import { escapeHtml } from '../utils/dom';

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
let currentPhase = 'intro';

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
  // Safe: hardcoded static HTML
  headerInfo.innerHTML = `
    <div class="font-semibold text-gray-900" id="header-role">Loading...</div>
    <div id="header-badge"></div>
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
  rubricContent.innerHTML = '<div class="text-sm text-gray-500">Loading session metrics...</div>';
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

    const traceHtml =
      msg.traceId && msg.traceId !== 'unknown' && /^[0-9a-f]{32}$/.test(msg.traceId)
        ? `<div class="trace-link-wrap">
             <a class="trace-link" href="${PHOENIX_TRACE_BASE}/${msg.traceId}" target="_blank" rel="noopener noreferrer">
               🔍 View in Phoenix
             </a>
           </div>`
        : '';

    // Safe: escaped msg.text and traceHtml
    msgEl.innerHTML = `
      <div class="message__avatar"><i data-lucide="${msg.role === 'ai' ? 'bot' : 'user'}"></i></div>
      <div class="message__content">
        <div class="message__bubble">${escapeHtml(msg.text).replace(
          /\n/g,
          '<br>',
        )}${traceHtml}</div>
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
      for await (const event of sendTurnStream(currentSessionId, text)) {
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

            // Append Phoenix trace link
            if (
              event.traceId &&
              event.traceId !== 'unknown' &&
              /^[0-9a-f]{32}$/.test(event.traceId)
            ) {
              const linkWrap = document.createElement('div');
              linkWrap.className = 'trace-link-wrap';
              const link = document.createElement('a');
              link.className = 'trace-link';
              link.href = `${PHOENIX_TRACE_BASE}/${event.traceId}`;
              link.target = '_blank';
              link.rel = 'noopener noreferrer';
              link.textContent = '🔍 View in Phoenix';
              linkWrap.appendChild(link);
              aiBubble.querySelector('.message__bubble')?.appendChild(linkWrap);
            }
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
                max: 20,
                label: `Turn ${currentTurn} • Phase: ${currentPhase.replace('_', ' ')}`,
              }),
            );
          }

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

    // Safe: hardcoded HTML switch
    pauseBtn.innerHTML = isPaused
      ? '<i data-lucide="play-circle"></i><span>Resume</span>'
      : '<i data-lucide="pause-circle"></i><span>Suspend</span>';

    const progressEl = document.getElementById('progress-content');
    if (progressEl) {
      // Safe: clearing contents
      progressEl.innerHTML = '';
      progressEl.appendChild(
        createProgress({
          value: currentTurn,
          max: 20,
          label: `Turn ${currentTurn} • Phase: ${currentPhase.replace('_', ' ')}`,
        }),
      );
    }

    refreshIcons();
  };

  // Initial load
  updateState();
  if (currentSessionId) {
    try {
      const { session } = await api.getSession(currentSessionId);
      document.getElementById('header-role')!.textContent = (
        session.config.role || 'Engineer'
      ).toUpperCase();
      // Safe: createBadge returns safe DOM element outerHTML
      document.getElementById('header-badge')!.innerHTML = createBadge({
        label: session.config.style || 'Technical',
        variant: 'neutral',
      }).outerHTML;

      currentTurn = session.turnCount || 0;
      currentPhase = session.interviewPhase || 'intro';

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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const aiMsgs = session.trace.filter((t: any) => t.type === 'ai_message');
        const lastAiMsg = aiMsgs[aiMsgs.length - 1];

        if (lastAiMsg) {
          // Safe: escaped dynamic values
          document.getElementById('rubric-content')!.innerHTML = `
            <div class="text-sm font-medium mb-1">Last Action</div>
            <div class="text-sm text-gray-600 mb-3">${escapeHtml(
              session.lastAgentAction || 'Started session',
            )}</div>
            ${
              lastAiMsg.payload?.metadata?.status
                ? '<div class="text-sm text-accent">' +
                  escapeHtml(lastAiMsg.payload.metadata.status) +
                  '</div>'
                : ''
            }
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
