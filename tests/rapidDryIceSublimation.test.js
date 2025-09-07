const { co2Cycle } = require('../src/js/dry-ice-cycle.js');

describe('rapid sublimation of dry ice', () => {
  test('returns zero rate regardless of temperature without multiplier', () => {
    const rateHigh = co2Cycle.rapidSublimationRate(250, 100);
    const rateLow = co2Cycle.rapidSublimationRate(180, 50);
    expect(rateHigh).toBe(0);
    expect(rateLow).toBe(0);
  });
});
