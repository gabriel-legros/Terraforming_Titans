const { calculateSurfaceFractions } = require('../src/js/terraforming-utils.js');

describe('calculateSurfaceFractions', () => {
  test('scales water and ice when they exceed available area', () => {
    const f = calculateSurfaceFractions(0.8, 0.6, 0.2, 0, 0, 0);
    expect(f.biomass).toBeCloseTo(0.2);
    expect(f.ocean + f.ice + f.biomass).toBeCloseTo(1);
    expect(f.ocean).toBeCloseTo(0.45714, 4);
    expect(f.ice).toBeCloseTo(0.34286, 4);
    expect(f.hydrocarbon).toBeCloseTo(0);
    expect(f.hydrocarbonIce).toBeCloseTo(0);
    expect(f.co2_ice).toBeCloseTo(0);
  });

  test('returns original values when under capacity', () => {
    const f = calculateSurfaceFractions(0.3, 0.2, 0.1, 0, 0, 0);
    expect(f).toEqual({ ocean: 0.3, ice: 0.2, hydrocarbon: 0, hydrocarbonIce: 0, co2_ice: 0, biomass: 0.1 });
  });

  test('scales all surfaces proportionally after biomass', () => {
    const f = calculateSurfaceFractions(0.2, 0.2, 0.3, 0.2, 0.2, 0.2);
    const share = 0.14;
    expect(f.biomass).toBeCloseTo(0.3);
    expect(f.ocean).toBeCloseTo(share);
    expect(f.ice).toBeCloseTo(share);
    expect(f.hydrocarbon).toBeCloseTo(share);
    expect(f.hydrocarbonIce).toBeCloseTo(share);
    expect(f.co2_ice).toBeCloseTo(share);
    const total = f.ocean + f.ice + f.hydrocarbon + f.hydrocarbonIce + f.co2_ice + f.biomass;
    expect(total).toBeCloseTo(1);
  });
});
