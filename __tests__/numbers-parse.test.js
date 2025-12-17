const { parseFlexibleNumber } = require('../src/js/numbers');

describe('parseFlexibleNumber', () => {
  test('parses scientific notation', () => {
    expect(parseFlexibleNumber('1e6')).toBe(1e6);
    expect(parseFlexibleNumber('2.5e3')).toBe(2500);
  });

  test('parses formatted suffix notation', () => {
    expect(parseFlexibleNumber('1.5M')).toBe(1.5e6);
    expect(parseFlexibleNumber('2500k')).toBe(2.5e6);
    expect(parseFlexibleNumber('3Qi')).toBe(3e18);
  });

  test('parses loosely formatted strings', () => {
    expect(parseFlexibleNumber('2,500k')).toBe(2.5e6);
    expect(parseFlexibleNumber('1e')).toBe(1);
  });

  test('returns NaN for empty or invalid values', () => {
    expect(Number.isNaN(parseFlexibleNumber(''))).toBe(true);
    expect(Number.isNaN(parseFlexibleNumber('not a number'))).toBe(true);
  });
});

