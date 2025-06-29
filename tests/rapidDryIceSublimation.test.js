const { rapidSublimationRateCO2 } = require('../src/js/dry-ice-cycle.js');

describe('rapid sublimation of dry ice', () => {
  test('temperature above sublimation point triggers sublimation', () => {
    const T = 250; // K
    const available = 100; // tons
    const diff = T - 195;
    const expected = available * 0.00000001 * diff;
    expect(rapidSublimationRateCO2(T, available)).toBeCloseTo(expected);
  });

  test('temperature below sublimation point results in zero rate', () => {
    expect(rapidSublimationRateCO2(180, 50)).toBe(0);
  });
});
