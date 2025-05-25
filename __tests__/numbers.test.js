const { formatNumber, formatBigInteger } = require('../numbers.js');

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
