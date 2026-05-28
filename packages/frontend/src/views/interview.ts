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
}

// Global state for demo purposes
let messages: Message[] = [
  {
    id: '1',
    role: 'ai',
    text: "Hello! I'll be acting as your engineering manager for this System Design interview. Today we're going to design a distributed rate limiter. Are you ready to begin?",
  },
];
let isThinking = false;
let isPaused = false;
let networkFailureMode = false;

export function renderInterview(container: HTMLElement): void {
  // Reset demo state on load
  messages = [
    {
      id: '1',
      role: 'ai',
      text: "Hello! I'll be acting as your engineering manager for this System Design interview. Today we're going to design a distributed rate limiter. Are you ready to begin?",
    },
  ];
  isThinking = false;
  isPaused = false;

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
    <div class="font-semibold text-gray-900">Senior Frontend Engineer</div>
    ${createBadge({ label: 'System Design', variant: 'neutral' }).outerHTML}
    <div id="timer-badge">
      ${createBadge({ label: '00:15:32', variant: 'accent' }).outerHTML}
    </div>
  `;

  const headerActions = document.createElement('div');
  headerActions.className = 'flex items-center gap-2';

  const errorToggleBtn = createButton({
    label: 'Simulate Error',
    variant: 'ghost',
    icon: 'wifi-off',
    size: 'sm',
    onClick: () => {
      networkFailureMode = !networkFailureMode;
      errorToggleBtn.classList.toggle('bg-error-light');
      errorToggleBtn.classList.toggle('text-error');
      showToast({
        title: networkFailureMode ? 'Network error enabled' : 'Network error disabled',
        message: 'The next message will trigger a connection drop.',
        type: networkFailureMode ? 'warning' : 'info',
      });
    },
  });

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
    onClick: () => (window.location.hash = '#/analysis'),
  });
  endBtn.classList.add('text-error');

  headerActions.appendChild(errorToggleBtn);
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

  // Auto-resize textarea
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
  rubricContent.innerHTML = `
    <div class="rubric-item">
      <span class="text-sm font-medium">Requirements Gathering</span>
      <span class="status-dot status-dot--active"></span>
    </div>
    <div class="rubric-item">
      <span class="text-sm font-medium text-gray-400">High-Level Design</span>
      <span class="status-dot status-dot--idle" style="background: var(--color-gray-200)"></span>
    </div>
    <div class="rubric-item">
      <span class="text-sm font-medium text-gray-400">Deep Dive</span>
      <span class="status-dot status-dot--idle" style="background: var(--color-gray-200)"></span>
    </div>
  `;
  sidebar.appendChild(createCard({ title: 'Evaluation Rubric', content: rubricContent }));

  const progressContent = document.createElement('div');
  progressContent.appendChild(
    createProgress({ value: 1, max: 10, label: 'Session Progress (10%)' }),
  );
  sidebar.appendChild(createCard({ content: progressContent }));

  layout.appendChild(chatArea);
  layout.appendChild(sidebar);
  container.appendChild(layout);

  // --- Logic ---
  const handleSend = () => {
    const text = input.value.trim();
    if (!text || isThinking || isPaused) return;

    input.value = '';
    input.style.height = 'auto';
    messages.push({ id: Date.now().toString(), role: 'user', text });

    if (networkFailureMode) {
      isThinking = true;
      networkFailureMode = false; // Reset after trigger
      errorToggleBtn.classList.remove('bg-error-light', 'text-error');
      updateState();

      setTimeout(() => {
        isThinking = false;
        messages.push({
          id: Date.now().toString(),
          role: 'ai',
          text: 'Network connection lost. The backend server failed to respond within the timeout period.',
          isError: true,
        });
        showToast({ title: 'Connection Dropped', message: 'Failed to reach AI.', type: 'error' });
        updateState();
      }, 1500);
      return;
    }

    // Normal AI response
    isThinking = true;
    updateState();

    setTimeout(() => {
      isThinking = false;
      const responses = [
        "That's a solid starting point. What specific data structures would you use for the token bucket algorithm?",
        'Interesting approach. How would you handle race conditions in a concurrent environment?',
        'Can you clarify how your solution scales across multiple regional data centers?',
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      messages.push({ id: Date.now().toString(), role: 'ai', text: randomResponse });
      updateState();
    }, 2000);
  };

  const updateState = () => {
    // 1. Render Messages
    messagesContainer.innerHTML = '';
    messages.forEach((msg) => {
      const msgEl = document.createElement('div');
      msgEl.className = `message message--${msg.role} ${msg.isError ? 'message--error' : ''}`;
      msgEl.innerHTML = `
        <div class="message__avatar"><i data-lucide="${
          msg.role === 'ai' ? 'bot' : 'user'
        }"></i></div>
        <div class="message__content">
          <div class="message__bubble">${msg.text}</div>
          ${
            msg.isError
              ? '<span class="text-xs text-error mt-1 flex items-center gap-1"><i data-lucide="alert-circle" style="width:12px;height:12px"></i> Message failed</span>'
              : ''
          }
        </div>
      `;
      messagesContainer.appendChild(msgEl);
    });

    // 2. Typing Indicator
    if (isThinking) {
      const typingEl = document.createElement('div');
      typingEl.className = 'message message--ai';
      typingEl.innerHTML = `
        <div class="message__avatar"><i data-lucide="bot"></i></div>
        <div class="message__content">
          <div class="message__bubble">
            <div class="typing-indicator">
              <div class="typing-dot"></div>
              <div class="typing-dot"></div>
              <div class="typing-dot"></div>
            </div>
          </div>
        </div>
      `;
      messagesContainer.appendChild(typingEl);
    }

    // Auto-scroll
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // 3. Composer State
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

    // 4. Header Actions
    pauseBtn.innerHTML = isPaused
      ? `<i data-lucide="play-circle"></i><span>Resume</span>`
      : `<i data-lucide="pause-circle"></i><span>Suspend</span>`;
    if (isPaused) {
      pauseBtn.classList.add('bg-warning-light', 'text-warning-dark');
    } else {
      pauseBtn.classList.remove('bg-warning-light', 'text-warning-dark');
    }

    const timerBadge = document.getElementById('timer-badge');
    if (timerBadge) {
      timerBadge.innerHTML = createBadge({
        label: isPaused ? 'Suspended' : '00:15:32',
        variant: isPaused ? 'warning' : 'accent',
      }).outerHTML;
    }

    refreshIcons();
  };

  // Initial render
  updateState();
}
