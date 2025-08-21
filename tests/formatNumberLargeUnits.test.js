const { formatNumber } = require('../src/js/numbers.js');

describe('formatNumber large units', () => {
  test('formats decillion', () => {
    expect(formatNumber(1e33, true)).toBe('1De');
  });

  test('formats undecillion', () => {
    expect(formatNumber(1e36, true)).toBe('1Ud');
  });

  test('formats duodecillion', () => {
    expect(formatNumber(1e39, true)).toBe('1Dd');
  });
});
