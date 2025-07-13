const { calculateSurfaceFractions } = require('../src/js/terraforming-utils.js');

describe('calculateSurfaceFractions', () => {
  test('scales water and ice when they exceed available area', () => {
    const f = calculateSurfaceFractions(0.8, 0.6, 0.2);
    expect(f.biomass).toBeCloseTo(0.2);
    expect(f.ocean + f.ice + f.biomass).toBeCloseTo(1);
    expect(f.ocean).toBeCloseTo(0.45714, 4);
    expect(f.ice).toBeCloseTo(0.34286, 4);
  });

  test('returns original values when under capacity', () => {
    const f = calculateSurfaceFractions(0.3, 0.2, 0.1);
    expect(f).toEqual({ ocean: 0.3, ice: 0.2, biomass: 0.1 });
  });
});
