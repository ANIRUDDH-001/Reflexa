import { createBadge } from '../components/badge';
import { createButton } from '../components/button';
import { createCard } from '../components/card';
import { createProgress } from '../components/progress';
import { refreshIcons } from '../lucide';

export function renderInterview(container: HTMLElement): void {
  container.innerHTML = '';

  const layout = document.createElement('div');
  layout.className = 'interview-layout';

  // 1. Chat Area (Main Column)
  const chatArea = document.createElement('div');
  chatArea.className = 'chat-area';
  chatArea.style.height = '100%'; // stretch to fill layout

  // Chat Header
  const chatHeader = document.createElement('div');
  chatHeader.className = 'chat-header';

  const headerInfo = document.createElement('div');
  headerInfo.className = 'flex items-center gap-3';
  headerInfo.innerHTML = `
    <div class="font-semibold text-gray-900">Senior Frontend Engineer</div>
    ${createBadge({ label: 'System Design', variant: 'neutral' }).outerHTML}
    ${createBadge({ label: '00:15:32', variant: 'accent' }).outerHTML}
  `;

  const headerActions = document.createElement('div');
  const endBtn = createButton({ label: 'End Session', variant: 'ghost', icon: 'square' });
  endBtn.classList.add('text-error');
  headerActions.appendChild(endBtn);

  chatHeader.appendChild(headerInfo);
  chatHeader.appendChild(headerActions);
  chatArea.appendChild(chatHeader);

  // Chat Messages
  const messages = document.createElement('div');
  messages.className = 'chat-messages';
  messages.innerHTML = `
    <!-- AI Message -->
    <div class="message message--ai">
      <div class="message__avatar"><i data-lucide="bot"></i></div>
      <div class="message__content">
        <div class="message__bubble">
          Hello! I'll be acting as your engineering manager for this System Design interview. Today we're going to design a distributed rate limiter. Are you ready to begin?
        </div>
      </div>
    </div>
    
    <!-- User Message -->
    <div class="message message--user">
      <div class="message__avatar"><i data-lucide="user"></i></div>
      <div class="message__content">
        <div class="message__bubble">
          Yes, I'm ready. I'd like to start by clarifying some requirements. What is the expected scale of requests we need to handle?
        </div>
      </div>
    </div>
    
    <!-- AI Message -->
    <div class="message message--ai">
      <div class="message__avatar"><i data-lucide="bot"></i></div>
      <div class="message__content">
        <div class="message__bubble">
          Great question. We expect this rate limiter to handle approximately 1 million requests per second globally, distributed across 5 regional data centers. Does that help scope the problem?
        </div>
      </div>
    </div>
  `;
  chatArea.appendChild(messages);

  // Composer
  const composer = document.createElement('div');
  composer.className = 'composer';

  const composerInner = document.createElement('div');
  composerInner.className = 'composer__inner';

  const input = document.createElement('textarea');
  input.className = 'composer__input';
  input.placeholder = 'Type your response...';
  input.rows = 1;

  const sendBtn = createButton({ label: '', icon: 'send', variant: 'primary' });
  sendBtn.setAttribute('aria-label', 'Send message');

  composerInner.appendChild(input);
  composerInner.appendChild(sendBtn);
  composer.appendChild(composerInner);

  chatArea.appendChild(composer);

  // 2. Sidebar (Right Column)
  const sidebar = document.createElement('div');
  sidebar.className = 'interview-sidebar';

  // Rubric Card
  const rubricContent = document.createElement('div');
  rubricContent.innerHTML = `
    <div class="rubric-item">
      <span class="text-sm font-medium">Requirements Gathering</span>
      <i data-lucide="check-circle" class="text-success" style="width: 16px"></i>
    </div>
    <div class="rubric-item">
      <span class="text-sm font-medium">High-Level Design</span>
      <span class="status-dot status-dot--active"></span>
    </div>
    <div class="rubric-item">
      <span class="text-sm font-medium text-gray-400">Deep Dive</span>
      <span class="status-dot status-dot--idle" style="background: var(--color-gray-200)"></span>
    </div>
    <div class="rubric-item">
      <span class="text-sm font-medium text-gray-400">Bottlenecks</span>
      <span class="status-dot status-dot--idle" style="background: var(--color-gray-200)"></span>
    </div>
  `;
  const rubricCard = createCard({
    title: 'Evaluation Rubric',
    content: rubricContent,
  });
  sidebar.appendChild(rubricCard);

  // Session Progress
  const progressContent = document.createElement('div');
  progressContent.appendChild(
    createProgress({ value: 3, max: 10, label: 'Session Progress (30%)' }),
  );
  const progressCard = createCard({
    content: progressContent,
  });
  sidebar.appendChild(progressCard);

  layout.appendChild(chatArea);
  layout.appendChild(sidebar);

  container.appendChild(layout);

  // Initialize icons
  refreshIcons();
}
