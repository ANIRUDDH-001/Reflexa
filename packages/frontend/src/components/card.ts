export interface CardOptions {
  title?: string;
  subtitle?: string;
  content: HTMLElement | string;
  footer?: HTMLElement | string;
}

export function createCard(options: CardOptions): HTMLElement {
  const card = document.createElement('div');
  card.className = 'card';

  if (options.title || options.subtitle) {
    const header = document.createElement('div');
    header.className = 'card__header';

    if (options.title) {
      const titleEl = document.createElement('h3');
      titleEl.className = 'card__title';
      titleEl.textContent = options.title;
      header.appendChild(titleEl);
    }

    if (options.subtitle) {
      const subtitleEl = document.createElement('p');
      subtitleEl.className = 'card__subtitle';
      subtitleEl.textContent = options.subtitle;
      subtitleEl.style.fontSize = 'var(--text-sm)';
      subtitleEl.style.color = 'var(--color-gray-500)';
      header.appendChild(subtitleEl);
    }

    card.appendChild(header);
  }

  const body = document.createElement('div');
  body.className = 'card__content';
  if (typeof options.content === 'string') {
    body.textContent = options.content;
  } else {
    body.appendChild(options.content);
  }
  card.appendChild(body);

  if (options.footer) {
    const footerEl = document.createElement('div');
    footerEl.className = 'card__footer';
    if (typeof options.footer === 'string') {
      footerEl.textContent = options.footer;
    } else {
      footerEl.appendChild(options.footer);
    }
    card.appendChild(footerEl);
  }

  return card;
}
