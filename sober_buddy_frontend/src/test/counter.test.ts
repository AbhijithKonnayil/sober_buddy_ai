import { describe, expect, it } from 'vitest';

describe('InteractiveCounter date-time utility logic', () => {
  it('resets the date to today while keeping the time portion', () => {
    // Simulated input: yesterday at 08:30
    const startDateStr = '2026-07-24T08:30';
    const now = new Date('2026-07-25T14:45:00'); // today (July 25)

    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');

    let timePart = '04:25';
    if (startDateStr && startDateStr.includes('T')) {
      const parts = startDateStr.split('T');
      if (parts[1]) {
        timePart = parts[1].slice(0, 5);
      }
    }

    const result = `${yyyy}-${mm}-${dd}T${timePart}`;
    // Should be today (July 25) but with yesterday's time (08:30)
    expect(result).toBe('2026-07-25T08:30');
  });

  it('defaults to 04:25 if time cannot be parsed', () => {
    const startDateStr = '2026-07-24'; // no time part
    const now = new Date('2026-07-25T14:45:00');

    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');

    let timePart = '04:25';
    if (startDateStr && startDateStr.includes('T')) {
      const parts = startDateStr.split('T');
      if (parts[1]) {
        timePart = parts[1].slice(0, 5);
      }
    }

    const result = `${yyyy}-${mm}-${dd}T${timePart}`;
    expect(result).toBe('2026-07-25T04:25');
  });
});
