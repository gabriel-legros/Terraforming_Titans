const { calculateSurfaceFractions } = require('../src/js/terraforming-utils.js');

describe('calculateSurfaceFractions', () => {
  test('scales liquids and ice together when they exceed available area', () => {
    const f = calculateSurfaceFractions(0.8, 0.6, 0.2, 0, 0, 0);
    expect(f.ocean).toBeCloseTo(0.57143, 4);
    expect(f.ice).toBeCloseTo(0.42857, 4);
    expect(f.hydrocarbon).toBeCloseTo(0);
    expect(f.hydrocarbonIce).toBeCloseTo(0);
    expect(f.co2_ice).toBeCloseTo(0);
    expect(f.biomass).toBeCloseTo(0);
    const total = f.ocean + f.ice + f.hydrocarbon + f.hydrocarbonIce + f.co2_ice + f.biomass;
    expect(total).toBeCloseTo(1);
  });

  test('retains original proportions when under capacity', () => {
    const f = calculateSurfaceFractions(0.3, 0.2, 0.1, 0.1, 0.05, 0.05);
    expect(f.ocean).toBeCloseTo(0.3);
    expect(f.ice).toBeCloseTo(0.2);
    expect(f.hydrocarbon).toBeCloseTo(0.1);
    expect(f.hydrocarbonIce).toBeCloseTo(0.05);
    expect(f.co2_ice).toBeCloseTo(0.05);
    expect(f.biomass).toBeCloseTo(0.1);
  });

  test('biomass is limited to 75 percent of the remaining share', () => {
    const generousBio = calculateSurfaceFractions(0.2, 0.2, 0.6, 0, 0, 0);
    // Liquids and ice cover 0.4, leaving 0.6. Biomass can use 75% of 0.6 -> 0.45
    expect(generousBio.biomass).toBeCloseTo(0.45);

    const lowBio = calculateSurfaceFractions(0.2, 0.2, 0.3, 0, 0, 0);
    expect(lowBio.biomass).toBeCloseTo(0.3);
  });
});
