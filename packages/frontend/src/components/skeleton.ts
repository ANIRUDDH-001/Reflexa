export interface SkeletonOptions {
  type?: 'text' | 'circle' | 'card';
  width?: string;
  height?: string;
}

export function createSkeleton(options: SkeletonOptions = {}): HTMLElement {
  const skeleton = document.createElement('div');
  skeleton.className = 'skeleton';

  if (options.type) {
    skeleton.classList.add(`skeleton--${options.type}`);
  } else {
    skeleton.classList.add('skeleton--text');
  }

  if (options.width) {
    skeleton.style.width = options.width;
  }

  if (options.height) {
    skeleton.style.height = options.height;
  }

  return skeleton;
}
