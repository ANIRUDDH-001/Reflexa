/**
 * Lucide icon integration utility.
 * Centralizes the global lucide reference to avoid
 * scattered `any` casts across the codebase.
 */

interface LucideGlobal {
  createIcons: () => void;
}

/** Safely refresh all Lucide icons in the DOM */
export function refreshIcons(): void {
  requestAnimationFrame(() => {
    const lucide = (window as unknown as { lucide?: LucideGlobal }).lucide;
    if (lucide) {
      lucide.createIcons();
    }
  });
}
