const { formatDurationDetailed } = require('../src/js/numbers');

describe('formatDurationDetailed', () => {
  test('includes minutes and seconds for day-scale durations', () => {
    expect(formatDurationDetailed(90061)).toBe('1d 1h 1m 1s');
  });

  test('includes minutes and seconds for hour-scale durations', () => {
    expect(formatDurationDetailed(3661)).toBe('1h 1m 1s');
  });

  test('includes minutes and seconds for minute-scale durations', () => {
    expect(formatDurationDetailed(65)).toBe('1m 5s');
  });

  test('includes minutes and seconds for year-scale durations', () => {
    const yearSeconds = 365 * 24 * 3600;
    expect(formatDurationDetailed(yearSeconds + 1)).toBe('1 year 0d 0h 0m 1s');
  });
});
