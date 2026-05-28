import { api } from '../api';
import { createBadge } from '../components/badge';
import { createButton } from '../components/button';
import { createCard } from '../components/card';
import { createProgress } from '../components/progress';
import { showToast } from '../components/toast';
import { refreshIcons } from '../lucide';

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
let currentScore = 0;

export async function renderInterview(
  container: HTMLElement,
  params?: Record<string, string>,
): Promise<void> {
  messages = [];
  isThinking = true; // start thinking while loading
  isPaused = false;
  currentSessionId = params?.id || null;

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
  rubricContent.innerHTML = '<div class="text-sm text-gray-500">Loading session metrics...</div>';
  sidebar.appendChild(createCard({ title: 'Session Metadata', content: rubricContent }));

  const progressContent = document.createElement('div');
  progressContent.id = 'progress-content';
  sidebar.appendChild(createCard({ content: progressContent }));

  layout.appendChild(chatArea);
  layout.appendChild(sidebar);
  container.appendChild(layout);

  // --- Logic ---
  const handleSend = async () => {
    const text = input.value.trim();
    if (!text || isThinking || isPaused || !currentSessionId) return;

    input.value = '';
    input.style.height = 'auto';
    messages.push({ id: Date.now().toString(), role: 'user', text });

    isThinking = true;
    updateState();

    try {
      const response = await api.submitTurn(currentSessionId, text);
      messages.push({
        id: Date.now().toString(),
        role: 'ai',
        text: response.text,
        traceId: response.traceId,
      });
    } catch (e) {
      messages.push({
        id: Date.now().toString(),
        role: 'ai',
        text: 'Failed to process turn.',
        isError: true,
      });
    } finally {
      isThinking = false;
      updateState();
    }
  };

  const updateState = () => {
    messagesContainer.innerHTML = '';
    messages.forEach((msg) => {
      const msgEl = document.createElement('div');
      msgEl.className = 'message message--' + msg.role + (msg.isError ? ' message--error' : '');
      msgEl.innerHTML = `
        <div class="message__avatar"><i data-lucide="${
          msg.role === 'ai' ? 'bot' : 'user'
        }"></i></div>
        <div class="message__content">
          <div class="message__bubble">
            ${msg.text}
            ${
              msg.traceId
                ? `<div style="margin-top: 8px; font-size: 11px; opacity: 0.6;"><a href="http://localhost:6006/traces/${
                    msg.traceId
                  }" target="_blank" style="color: inherit; text-decoration: underline;">View Trace (${msg.traceId.slice(
                    0,
                    8,
                  )})</a></div>`
                : ''
            }
          </div>
        </div>
      `;
      messagesContainer.appendChild(msgEl);
    });

    if (isThinking) {
      const typingEl = document.createElement('div');
      typingEl.className = 'message message--ai';
      typingEl.innerHTML = `
        <div class="message__avatar"><i data-lucide="bot"></i></div>
        <div class="message__content">
          <div class="message__bubble">
            <div class="typing-indicator">
              <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
            </div>
          </div>
        </div>
      `;
      messagesContainer.appendChild(typingEl);
    }

    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    if (isThinking || isPaused) {
      composer.classList.add('composer--disabled');
      input.disabled = true;
      sendBtn.setAttribute('disabled', 'true');
      input.placeholder = isPaused ? 'Session Suspended' : 'AI is analyzing your response...';
    } else {
      composer.classList.remove('composer--disabled');
      input.disabled = false;
      sendBtn.removeAttribute('disabled');
      input.placeholder = 'Type your response...';
      input.focus();
    }

    pauseBtn.innerHTML = isPaused
      ? '<i data-lucide="play-circle"></i><span>Resume</span>'
      : '<i data-lucide="pause-circle"></i><span>Suspend</span>';

    // update progress
    const progressEl = document.getElementById('progress-content');
    if (progressEl) {
      progressEl.innerHTML = '';
      progressEl.appendChild(
        createProgress({
          value: currentScore,
          max: 100,
          label: 'Session Score (' + currentScore + '%)',
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
      document.getElementById('header-badge')!.innerHTML = createBadge({
        label: session.config.style || 'Technical',
        variant: 'neutral',
      }).outerHTML;

      const aiMsgs = session.trace.filter((t: Record<string, unknown>) => t.type === 'ai_message');
      const lastAiMsg = aiMsgs[aiMsgs.length - 1];

      if (lastAiMsg) {
        messages = [
          {
            id: lastAiMsg.id,
            role: 'ai',
            text: lastAiMsg.payload.text,
            traceId: lastAiMsg.traceId,
          },
        ];
        if (lastAiMsg.payload.metadata?.scoreHint)
          currentScore = lastAiMsg.payload.metadata.scoreHint;

        document.getElementById('rubric-content')!.innerHTML = `
          <div class="text-sm font-medium mb-1">Last Action</div>
          <div class="text-sm text-gray-600 mb-3">${
            session.lastAgentAction || 'Started session'
          }</div>
          ${
            lastAiMsg.payload.metadata?.status
              ? '<div class="text-sm text-accent">' + lastAiMsg.payload.metadata.status + '</div>'
              : ''
          }
        `;
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
