const { calculateZonalCoverage } = require('../terraforming-utils.js');

describe('terraforming-utils surface area handling', () => {
  test('handles missing celestialParameters gracefully', () => {
    const terra = { zonalWater: { tropical: { liquid: 1 } }, zonalSurface: {} };
    expect(() => calculateZonalCoverage(terra, 'tropical', 'liquidWater')).not.toThrow();
    expect(calculateZonalCoverage(terra, 'tropical', 'liquidWater')).toBe(0);
  });

  test('computes surface area from radius when missing', () => {
    const terra = {
      celestialParameters: { radius: 10 },
      zonalWater: { tropical: { liquid: 0 } },
      zonalSurface: {}
    };
    calculateZonalCoverage(terra, 'tropical', 'liquidWater');
    const expected = 4 * Math.PI * Math.pow(10 * 1000, 2);
    expect(terra.celestialParameters.surfaceArea).toBeCloseTo(expected, 5);
  });
});
