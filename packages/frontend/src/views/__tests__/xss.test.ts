import { JSDOM } from 'jsdom';
import { describe, it, expect, vi } from 'vitest';

// Set up a minimal DOM environment
const dom = new JSDOM('<!DOCTYPE html><body></body>');
global.document = dom.window.document;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.window = dom.window as any;

// Mock the API module
vi.mock('../../api', () => ({
  api: {
    getSessions: vi.fn().mockResolvedValue({
      sessions: [
        {
          id: 'test-xss',
          config: {
            role: '<img src=x onerror="window.__xss_triggered=true">',
            style: 'behavioral',
            difficulty: 'senior',
          },
          status: 'completed',
          score: '<script>window.__xss_triggered=true</script>',
          startedAt: '2025-01-01T00:00:00Z',
        },
      ],
    }),
  },
}));

// Mock lucide to prevent errors
vi.mock('../../lucide', () => ({
  refreshIcons: vi.fn(),
}));

describe('history view — XSS protection', () => {
  it('does not execute script tags in role field', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global.window as any).__xss_triggered = false;

    const container = document.createElement('div');
    document.body.appendChild(container);
    container.id = 'history-container';

    // Import and render the history view
    const { renderHistory } = await import('../history');
    await renderHistory(container);

    // If XSS fired, this would be true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((global.window as any).__xss_triggered).toBe(false);
  });

  it('displays the role text content (escaped)', async () => {
    const container = document.getElementById('history-container');
    // The text content should contain the raw string, not execute it
    expect(container?.textContent).toContain('img');
    // The innerHTML should NOT contain unescaped < > characters in data positions
    const h4 = container?.querySelector('h4');
    expect(h4?.innerHTML).not.toContain('<img');
    expect(h4?.textContent).toContain('img'); // visible as text, not executed as HTML
  });
});
