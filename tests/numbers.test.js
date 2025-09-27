const { formatNumber, formatBigInteger, formatBuildingCount, formatPlayTime, formatDuration } = require('../src/js/numbers.js');

describe('formatNumber', () => {
  test('formats thousands with suffix k', () => {
    expect(formatNumber(1500)).toBe('1.5k');
  });

  test('formats millions with suffix M', () => {
    expect(formatNumber(2500000)).toBe('2.5M');
  });

  test('formats septillions with suffix Sp', () => {
    expect(formatNumber(1e24)).toBe('1.0Sp');
  });

  test('formats octillions with suffix Oc', () => {
    expect(formatNumber(1e27)).toBe('1.0Oc');
  });

  test('formats nonillions with suffix No', () => {
    expect(formatNumber(1e30)).toBe('1.0No');
  });
});

describe('formatBigInteger', () => {
  test('adds commas', () => {
    expect(formatBigInteger(1234567)).toBe('1,234,567');
  });
});

describe('formatBuildingCount', () => {
  test('uses comma formatting below a million', () => {
    expect(formatBuildingCount(500000)).toBe('500,000');
  });

  test('uses abbreviated format above a million', () => {
    expect(formatBuildingCount(2500000)).toBe('2.500M');
  });
});

describe('formatPlayTime', () => {
  test('converts days to years and days string', () => {
    expect(formatPlayTime(730)).toBe('2 years 0 days');
    expect(formatPlayTime(40)).toBe('40 days');
  });
});

describe('formatDuration', () => {
  test('displays years for long durations', () => {
    const seconds = 2 * 365 * 24 * 3600;
    expect(formatDuration(seconds)).toBe('2 years');
  });
});
