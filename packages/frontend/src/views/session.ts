import { api } from '../api';
import { createButton } from '../components/button';
import { showToast } from '../components/toast';
import { refreshIcons } from '../lucide';
import { escapeHtml } from '../utils/dom';

// --- State ---
let currentStep = 1;
const totalSteps = 4;
let attemptedStep1 = false;
let attemptedStep2 = false;

interface SessionConfig {
  role: string | null;
  difficulty: string | null;
  style: string | null;
  timeLimit: string | null;
  focusAreas: string[];
}

let config: SessionConfig = {
  role: null,
  difficulty: null,
  style: null,
  timeLimit: null,
  focusAreas: [],
};

// --- Options ---
const ROLE_OPTIONS = [
  { id: 'frontend', label: 'Frontend Engineer', icon: 'layout' },
  { id: 'backend', label: 'Backend Engineer', icon: 'server' },
  { id: 'fullstack', label: 'Fullstack Engineer', icon: 'layers' },
  { id: 'android', label: 'Android Developer', icon: 'smartphone' },
  { id: 'ai', label: 'AI Engineer', icon: 'cpu' },
  { id: 'devops', label: 'DevOps / SRE', icon: 'terminal' },
];

const DIFFICULTY_OPTIONS = [
  { id: 'junior', label: 'Junior', desc: '0-2 years experience' },
  { id: 'mid', label: 'Mid-Level', desc: '3-5 years experience' },
  { id: 'senior', label: 'Senior', desc: '5-8 years experience' },
  { id: 'staff', label: 'Staff / Principal', desc: '8+ years experience' },
];

const STYLE_OPTIONS = [
  {
    id: 'system-design',
    label: 'System Design',
    icon: 'git-network',
    desc: 'Architecture & Scalability',
  },
  { id: 'coding', label: 'Live Coding', icon: 'code', desc: 'Algorithms & Data Structures' },
  {
    id: 'troubleshooting',
    label: 'Troubleshooting',
    icon: 'activity',
    desc: 'Debugging & Incident Response',
  },
  { id: 'behavioral', label: 'Behavioral', icon: 'users', desc: 'Leadership & Soft Skills' },
  {
    id: 'architecture',
    label: 'Architecture Review',
    icon: 'box',
    desc: 'Deep dive into existing systems',
  },
];

const TIME_OPTIONS = [
  { id: '5', label: '5 Mins', desc: 'Lightning round' },
  { id: '10', label: '10 Mins', desc: 'Quick check' },
  { id: '20', label: '20 Mins', desc: 'Standard practice' },
  { id: '30', label: '30 Mins', desc: 'Deep dive' },
];

const FOCUS_OPTIONS = [
  'Scalability',
  'Security',
  'Performance',
  'UI/UX',
  'Concurrency',
  'API Design',
  'Database Modeling',
  'Microservices',
  'State Management',
];

export function renderSession(container: HTMLElement): void {
  // Reset state on load
  currentStep = 1;
  attemptedStep1 = false;
  attemptedStep2 = false;
  config = { role: null, difficulty: null, style: null, timeLimit: null, focusAreas: [] };

  const render = () => {
    container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'view-header';
    header.innerHTML = `
      <h2 class="view-header__title">Initialize Session</h2>
      <p class="view-header__subtitle">Step ${currentStep} of ${totalSteps}</p>
    `;

    const progressContainer = document.createElement('div');
    progressContainer.className = 'wizard-progress';
    const progressBar = document.createElement('div');
    progressBar.className = 'wizard-progress__bar';
    progressBar.style.width = `${(currentStep / totalSteps) * 100}%`;
    progressContainer.appendChild(progressBar);

    const stepContent = document.createElement('div');
    stepContent.className = 'panel animate-fade-in';

    if (currentStep === 1) {
      stepContent.appendChild(renderStep1(render));
    } else if (currentStep === 2) {
      stepContent.appendChild(renderStep2(render));
    } else if (currentStep === 3) {
      stepContent.appendChild(renderStep3(render));
    } else if (currentStep === 4) {
      stepContent.appendChild(renderStep4());
    }

    const footer = document.createElement('div');
    footer.className = 'flex justify-between mt-6';

    if (currentStep > 1) {
      const backBtn = createButton({
        label: 'Back',
        variant: 'secondary',
        icon: 'arrow-left',
        onClick: () => {
          currentStep--;
          render();
        },
      });
      footer.appendChild(backBtn);
    } else {
      footer.appendChild(document.createElement('div')); // Spacer
    }

    if (currentStep < totalSteps) {
      const nextBtn = createButton({
        label: 'Next Step',
        variant: 'primary',
        onClick: () => {
          if (currentStep === 1) attemptedStep1 = true;
          if (currentStep === 2) attemptedStep2 = true;

          if (validateStep(currentStep)) {
            currentStep++;
            render();
          } else {
            render(); // re-render to show inline validation errors
            showToast({
              title: 'Incomplete',
              message: 'Please select all required options.',
              type: 'warning',
            });
          }
        },
      });
      footer.appendChild(nextBtn);
    }

    container.appendChild(header);
    container.appendChild(progressContainer);
    container.appendChild(stepContent);
    container.appendChild(footer);

    refreshIcons();
  };

  render();
}

function validateStep(step: number): boolean {
  if (step === 1) return !!(config.role && config.difficulty);
  if (step === 2) return !!(config.style && config.timeLimit);
  return true;
}

function renderSelectableCard(
  title: string,
  desc: string,
  icon: string,
  isSelected: boolean,
  onClick: () => void,
): HTMLElement {
  const card = document.createElement('div');
  card.className = `selectable-card ${isSelected ? 'selectable-card--selected' : ''}`;
  card.onclick = onClick;

  const header = document.createElement('div');
  header.className = 'selectable-card__header';

  if (icon) {
    header.innerHTML += `<i data-lucide="${icon}" class="selectable-card__icon"></i>`;
  }
  header.innerHTML += `<span class="selectable-card__title">${title}</span>`;

  card.appendChild(header);

  if (desc) {
    const descEl = document.createElement('div');
    descEl.className = `selectable-card__desc ${icon ? 'selectable-card__desc--indent' : ''}`;
    descEl.textContent = desc;
    card.appendChild(descEl);
  }

  return card;
}

function renderStep1(reRender: () => void): HTMLElement {
  const wrapper = document.createElement('div');

  wrapper.innerHTML = `<h3 class="text-lg font-semibold mb-4">Target Discipline & Experience</h3>`;

  const roleSection = document.createElement('div');
  const roleError =
    attemptedStep1 && !config.role
      ? `<div class="error-text mb-2">Please select a discipline</div>`
      : '';
  roleSection.innerHTML = `<p class="text-sm font-medium text-gray-700 mb-3">Select target discipline</p>${roleError}`;
  const roleGrid = document.createElement('div');
  roleGrid.className = `wizard-grid wizard-grid--3col ${
    attemptedStep1 && !config.role ? 'error-border' : ''
  }`;

  ROLE_OPTIONS.forEach((opt) => {
    roleGrid.appendChild(
      renderSelectableCard(opt.label, '', opt.icon, config.role === opt.id, () => {
        config.role = opt.id;
        reRender();
      }),
    );
  });
  roleSection.appendChild(roleGrid);

  const diffSection = document.createElement('div');
  diffSection.className = 'mt-6';
  const diffError =
    attemptedStep1 && !config.difficulty
      ? `<div class="error-text mb-2">Please select an experience tier</div>`
      : '';
  diffSection.innerHTML = `<p class="text-sm font-medium text-gray-700 mb-3">Select experience tier</p>${diffError}`;
  const diffGrid = document.createElement('div');
  diffGrid.className = `wizard-grid wizard-grid--2col ${
    attemptedStep1 && !config.difficulty ? 'error-border' : ''
  }`;

  DIFFICULTY_OPTIONS.forEach((opt) => {
    diffGrid.appendChild(
      renderSelectableCard(opt.label, opt.desc, '', config.difficulty === opt.id, () => {
        config.difficulty = opt.id;
        reRender();
      }),
    );
  });
  diffSection.appendChild(diffGrid);

  wrapper.appendChild(roleSection);
  wrapper.appendChild(diffSection);
  return wrapper;
}

function renderStep2(reRender: () => void): HTMLElement {
  const wrapper = document.createElement('div');

  wrapper.innerHTML = `<h3 class="text-lg font-semibold mb-4">Evaluation Format & Duration</h3>`;

  const styleSection = document.createElement('div');
  const styleError =
    attemptedStep2 && !config.style
      ? `<div class="error-text mb-2">Please select an evaluation mode</div>`
      : '';
  styleSection.innerHTML = `<p class="text-sm font-medium text-gray-700 mb-3">Select evaluation mode</p>${styleError}`;
  const styleGrid = document.createElement('div');
  styleGrid.className = `wizard-grid wizard-grid--2col ${
    attemptedStep2 && !config.style ? 'error-border' : ''
  }`;

  STYLE_OPTIONS.forEach((opt) => {
    styleGrid.appendChild(
      renderSelectableCard(opt.label, opt.desc, opt.icon, config.style === opt.id, () => {
        config.style = opt.id;
        reRender();
      }),
    );
  });
  styleSection.appendChild(styleGrid);

  const timeSection = document.createElement('div');
  timeSection.className = 'mt-6';
  const timeError =
    attemptedStep2 && !config.timeLimit
      ? `<div class="error-text mb-2">Please select a session duration</div>`
      : '';
  timeSection.innerHTML = `<p class="text-sm font-medium text-gray-700 mb-3">Session duration</p>${timeError}`;
  const timeGrid = document.createElement('div');
  timeGrid.className = `wizard-grid wizard-grid--4col ${
    attemptedStep2 && !config.timeLimit ? 'error-border' : ''
  }`;

  TIME_OPTIONS.forEach((opt) => {
    timeGrid.appendChild(
      renderSelectableCard(opt.label, opt.desc, 'clock', config.timeLimit === opt.id, () => {
        config.timeLimit = opt.id;
        reRender();
      }),
    );
  });
  timeSection.appendChild(timeGrid);

  wrapper.appendChild(styleSection);
  wrapper.appendChild(timeSection);
  return wrapper;
}

function renderStep3(reRender: () => void): HTMLElement {
  const wrapper = document.createElement('div');

  wrapper.innerHTML = `
    <h3 class="text-lg font-semibold mb-2">Targeted Competencies</h3>
    <p class="text-sm text-gray-500 mb-6">Specify up to 3 technical competencies for the evaluation model to emphasize (Optional).</p>
  `;

  const focusGrid = document.createElement('div');
  focusGrid.className = 'focus-chip-container';

  FOCUS_OPTIONS.forEach((opt) => {
    const isSelected = config.focusAreas.includes(opt);
    const chip = document.createElement('button');
    chip.className = `focus-chip ${isSelected ? 'focus-chip--selected' : ''}`;
    chip.textContent = opt;
    chip.onclick = () => {
      if (isSelected) {
        config.focusAreas = config.focusAreas.filter((a) => a !== opt);
      } else if (config.focusAreas.length < 3) {
        config.focusAreas.push(opt);
      }
      reRender();
    };
    focusGrid.appendChild(chip);
  });

  wrapper.appendChild(focusGrid);
  return wrapper;
}

function renderStep4(): HTMLElement {
  const wrapper = document.createElement('div');

  const roleName = ROLE_OPTIONS.find((r) => r.id === config.role)?.label || '';
  const diffName = DIFFICULTY_OPTIONS.find((d) => d.id === config.difficulty)?.label || '';
  const styleName = STYLE_OPTIONS.find((s) => s.id === config.style)?.label || '';
  const timeName = TIME_OPTIONS.find((t) => t.id === config.timeLimit)?.label || '';

  wrapper.innerHTML = `
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-light text-success mb-4">
        <i data-lucide="check-circle" style="width: 32px; height: 32px;"></i>
      </div>
      <h3 class="text-2xl font-bold mb-2">Environment Initialized</h3>
      <p class="text-gray-500">Your evaluation environment is provisioned and ready.</p>
    </div>
    
    <div class="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-8 max-w-lg mx-auto">
      <h4 class="font-semibold mb-4 text-gray-900 border-b pb-2">Configuration Parameters</h4>
      <dl class="grid grid-cols-2 gap-y-4 text-sm">
        <dt class="text-gray-500">Discipline</dt>
        <dd class="font-medium text-right">${roleName} (${diffName})</dd>
        
        <dt class="text-gray-500">Format</dt>
        <dd class="font-medium text-right">${styleName}</dd>
        
        <dt class="text-gray-500">Duration</dt>
        <dd class="font-medium text-right">${timeName}</dd>
        
        <dt class="text-gray-500">Competencies</dt>
        <dd class="font-medium text-right">${
          config.focusAreas.length ? escapeHtml(config.focusAreas.join(', ')) : 'None'
        }</dd>
      </dl>
    </div>
    
    </div>
  `;

  const btnWrapper = document.createElement('div');
  btnWrapper.className = 'flex justify-center';
  const startBtn = createButton({
    label: 'Launch Evaluation',
    variant: 'primary',
    icon: 'play',
    onClick: async () => {
      startBtn.classList.add('btn--loading');
      try {
        const response = await api.createSession(config);
        const sessionId = response.session.id;
        window.location.hash = `#/interview/${sessionId}`;
      } catch (err) {
        showToast({
          title: 'Error',
          message: 'Failed to provision session environment.',
          type: 'error',
        });
      } finally {
        startBtn.classList.remove('btn--loading');
      }
    },
  });
  btnWrapper.appendChild(startBtn);
  wrapper.appendChild(btnWrapper);

  return wrapper;
}
