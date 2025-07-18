const { formatNumber, formatBigInteger, formatBuildingCount, formatPlayTime } = require('../src/js/numbers.js');

describe('formatNumber', () => {
  test('formats thousands with suffix k', () => {
    expect(formatNumber(1500)).toBe('1.5k');
  });

  test('formats millions with suffix M', () => {
    expect(formatNumber(2500000)).toBe('2.5M');
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
