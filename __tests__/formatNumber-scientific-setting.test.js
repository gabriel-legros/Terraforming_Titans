const { formatNumber } = require('../src/js/numbers');

describe('formatNumber scientific notation threshold', () => {
  afterEach(() => {
    delete global.gameSettings;
  });

  test('uses scientific notation at or above threshold', () => {
    global.gameSettings = { scientificNotationThreshold: 1e6 };
    expect(formatNumber(1e9)).toBe('1.0e9');
  });

  test('uses suffix formatting below threshold', () => {
    global.gameSettings = { scientificNotationThreshold: 1e12 };
    expect(formatNumber(1e9)).toBe('1.0B');
  });
});
