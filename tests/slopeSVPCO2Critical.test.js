const { slopeSVPCO2, CO2_T_CRIT } = require('../src/js/dry-ice-cycle.js');

describe('slopeSVPCO2 critical behavior', () => {
  test('returns slope at critical temperature when above Tc', () => {
    const slopeAtCritical = slopeSVPCO2(CO2_T_CRIT);
    const slopeAbove = slopeSVPCO2(CO2_T_CRIT + 10);
    expect(slopeAbove).toBeCloseTo(slopeAtCritical);
  });
});

