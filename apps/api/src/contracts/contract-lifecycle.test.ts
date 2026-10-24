import { addMonths } from './contract-lifecycle.js';

const iso = (d: Date) => d.toISOString();

describe('addMonths', () => {
  it('keeps the day and the time', () => {
    expect(iso(addMonths(new Date('2026-10-24T15:30:00Z'), 12))).toBe('2027-10-24T15:30:00.000Z');
    expect(iso(addMonths(new Date('2026-10-24T15:30:00Z'), 1))).toBe('2026-11-24T15:30:00.000Z');
  });

  it('crosses the year', () => {
    expect(iso(addMonths(new Date('2026-11-15T00:00:00Z'), 3))).toBe('2027-02-15T00:00:00.000Z');
  });

  it('falls back to the last day when the month is shorter', () => {
    expect(iso(addMonths(new Date('2026-01-31T12:00:00Z'), 1))).toBe('2026-02-28T12:00:00.000Z');
    expect(iso(addMonths(new Date('2028-01-31T12:00:00Z'), 1))).toBe('2028-02-29T12:00:00.000Z');
    expect(iso(addMonths(new Date('2026-08-31T12:00:00Z'), 1))).toBe('2026-09-30T12:00:00.000Z');
  });

  it('an annual contract started on 29/02 ends on 28/02', () => {
    expect(iso(addMonths(new Date('2028-02-29T10:00:00Z'), 12))).toBe('2029-02-28T10:00:00.000Z');
  });

  it('does not change the date it receives', () => {
    const start = new Date('2026-10-24T00:00:00Z');
    addMonths(start, 12);
    expect(iso(start)).toBe('2026-10-24T00:00:00.000Z');
  });
});
