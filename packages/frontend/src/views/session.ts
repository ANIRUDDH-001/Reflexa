import { createButton } from '../components/button';
import { refreshIcons } from '../lucide';

// --- State ---
let currentStep = 1;
const totalSteps = 4;

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
  { id: 'mobile', label: 'Mobile Engineer', icon: 'smartphone' },
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
  { id: '15', label: '15 Mins', desc: 'Quick warm-up' },
  { id: '30', label: '30 Mins', desc: 'Standard practice' },
  { id: '45', label: '45 Mins', desc: 'Deep dive' },
  { id: '60', label: '60 Mins', desc: 'Full simulation' },
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
  config = { role: null, difficulty: null, style: null, timeLimit: null, focusAreas: [] };

  const render = () => {
    container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'view-header';
    header.innerHTML = `
      <h2 class="view-header__title">Configure Session</h2>
      <p class="view-header__subtitle">Step ${currentStep} of ${totalSteps}</p>
    `;

    const progressContainer = document.createElement('div');
    progressContainer.className = 'w-full bg-gray-200 rounded-full h-2 mb-6 mt-4';
    const progressBar = document.createElement('div');
    progressBar.className = 'bg-accent-600 h-2 rounded-full transition-all duration-300';
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
          if (validateStep(currentStep)) {
            currentStep++;
            render();
          } else {
            import('../components/toast').then(({ showToast }) => {
              showToast({
                title: 'Incomplete',
                message: 'Please select all required options.',
                type: 'warning',
              });
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
  card.className = `p-4 rounded-lg border-2 cursor-pointer transition-all flex flex-col gap-2 ${
    isSelected ? 'border-accent-500 bg-accent-50' : 'border-gray-200 hover:border-accent-300'
  }`;
  card.onclick = onClick;

  card.innerHTML = `
    <div class="flex items-center gap-3">
      ${
        icon
          ? `<i data-lucide="${icon}" class="${
              isSelected ? 'text-accent-600' : 'text-gray-500'
            }"></i>`
          : ''
      }
      <span class="font-medium ${isSelected ? 'text-accent-900' : 'text-gray-900'}">${title}</span>
    </div>
    ${desc ? `<span class="text-sm text-gray-500 pl-${icon ? '8' : '0'}">${desc}</span>` : ''}
  `;
  return card;
}

function renderStep1(reRender: () => void): HTMLElement {
  const wrapper = document.createElement('div');

  wrapper.innerHTML = `<h3 class="text-lg font-semibold mb-4">Target Role & Difficulty</h3>`;

  const roleSection = document.createElement('div');
  roleSection.innerHTML = `<p class="text-sm font-medium text-gray-700 mb-3">Select your target role</p>`;
  const roleGrid = document.createElement('div');
  roleGrid.className = 'grid gap-3 grid-cols-2 md:grid-cols-3 mb-6';

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
  diffSection.innerHTML = `<p class="text-sm font-medium text-gray-700 mb-3">Select experience level</p>`;
  const diffGrid = document.createElement('div');
  diffGrid.className = 'grid gap-3 grid-cols-2';

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

  wrapper.innerHTML = `<h3 class="text-lg font-semibold mb-4">Interview Style & Time</h3>`;

  const styleSection = document.createElement('div');
  styleSection.innerHTML = `<p class="text-sm font-medium text-gray-700 mb-3">Select interview format</p>`;
  const styleGrid = document.createElement('div');
  styleGrid.className = 'grid gap-3 grid-cols-1 md:grid-cols-2 mb-6';

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
  timeSection.innerHTML = `<p class="text-sm font-medium text-gray-700 mb-3">Time limit</p>`;
  const timeGrid = document.createElement('div');
  timeGrid.className = 'grid gap-3 grid-cols-2 md:grid-cols-4';

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
    <h3 class="text-lg font-semibold mb-2">Focus Areas</h3>
    <p class="text-sm text-gray-500 mb-6">Select up to 3 specific areas you'd like the AI to emphasize during the interview (Optional).</p>
  `;

  const focusGrid = document.createElement('div');
  focusGrid.className = 'flex flex-wrap gap-3';

  FOCUS_OPTIONS.forEach((opt) => {
    const isSelected = config.focusAreas.includes(opt);
    const chip = document.createElement('button');
    chip.className = `px-4 py-2 rounded-full border text-sm font-medium transition-colors ${
      isSelected
        ? 'bg-accent-600 text-white border-accent-600'
        : 'bg-white text-gray-700 border-gray-300 hover:border-accent-400'
    }`;
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
      <h3 class="text-2xl font-bold mb-2">Ready to begin</h3>
      <p class="text-gray-500">Your interview environment is configured and ready.</p>
    </div>
    
    <div class="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-8 max-w-lg mx-auto">
      <h4 class="font-semibold mb-4 text-gray-900 border-b pb-2">Session Summary</h4>
      <dl class="grid grid-cols-2 gap-y-4 text-sm">
        <dt class="text-gray-500">Role</dt>
        <dd class="font-medium text-right">${roleName} (${diffName})</dd>
        
        <dt class="text-gray-500">Format</dt>
        <dd class="font-medium text-right">${styleName}</dd>
        
        <dt class="text-gray-500">Duration</dt>
        <dd class="font-medium text-right">${timeName}</dd>
        
        <dt class="text-gray-500">Focus Areas</dt>
        <dd class="font-medium text-right">${
          config.focusAreas.length ? config.focusAreas.join(', ') : 'None'
        }</dd>
      </dl>
    </div>
    
    </div>
  `;

  const btnWrapper = document.createElement('div');
  btnWrapper.className = 'flex justify-center';
  const startBtn = createButton({
    label: 'Start Interview',
    variant: 'primary',
    icon: 'play',
    onClick: () => {
      window.location.hash = '#/interview';
    },
  });
  btnWrapper.appendChild(startBtn);
  wrapper.appendChild(btnWrapper);

  return wrapper;
}
