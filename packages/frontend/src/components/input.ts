export interface InputOptions {
  id: string;
  label?: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (val: string) => void;
}

export function createInput(options: InputOptions): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.gap = '4px';

  if (options.label) {
    const labelEl = document.createElement('label');
    labelEl.htmlFor = options.id;
    labelEl.textContent = options.label;
    labelEl.style.fontSize = '14px';
    labelEl.style.fontWeight = '500';
    wrapper.appendChild(labelEl);
  }

  const inputEl = document.createElement('input');
  inputEl.id = options.id;
  inputEl.type = options.type || 'text';
  if (options.placeholder) inputEl.placeholder = options.placeholder;
  if (options.value !== undefined) inputEl.value = options.value;

  inputEl.style.padding = '8px 12px';
  inputEl.style.border = '1px solid var(--border-default)';
  inputEl.style.borderRadius = 'var(--radius-md)';
  inputEl.style.fontFamily = 'inherit';

  if (options.onChange) {
    inputEl.addEventListener('input', (e) => {
      options.onChange!((e.target as HTMLInputElement).value);
    });
  }

  wrapper.appendChild(inputEl);
  return wrapper;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectOptions {
  id: string;
  label?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (val: string) => void;
}

export function createSelect(options: SelectOptions): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.gap = '4px';

  if (options.label) {
    const labelEl = document.createElement('label');
    labelEl.htmlFor = options.id;
    labelEl.textContent = options.label;
    labelEl.style.fontSize = '14px';
    labelEl.style.fontWeight = '500';
    wrapper.appendChild(labelEl);
  }

  const selectEl = document.createElement('select');
  selectEl.id = options.id;

  selectEl.style.padding = '8px 12px';
  selectEl.style.border = '1px solid var(--border-default)';
  selectEl.style.borderRadius = 'var(--radius-md)';
  selectEl.style.fontFamily = 'inherit';

  options.options.forEach((opt) => {
    const optionEl = document.createElement('option');
    optionEl.value = opt.value;
    optionEl.textContent = opt.label;
    if (options.value === opt.value) {
      optionEl.selected = true;
    }
    selectEl.appendChild(optionEl);
  });

  if (options.onChange) {
    selectEl.addEventListener('change', (e) => {
      options.onChange!((e.target as HTMLSelectElement).value);
    });
  }

  wrapper.appendChild(selectEl);
  return wrapper;
}
