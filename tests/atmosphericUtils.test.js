const { calculateMolecularWeight, calculateSpecificLift, approximateSpecificLift } = require('../src/js/terraforming/atmospheric-utils.js');

describe('atmospheric-utils', () => {
  test('calculates mean molecular weight of atmosphere', () => {
    const composition = { N2: 0.78, O2: 0.21, Ar: 0.01 };
    const mw = calculateMolecularWeight(composition);
    expect(mw).toBeCloseTo(28.97, 2);
  });

  test('calculates specific lift with full and approximate formulas', () => {
    const lift = calculateSpecificLift(101325, 300, 44, 29);
    expect(lift).toBeCloseTo(0.61, 2);
    const approx = approximateSpecificLift(1, 300, 44);
    expect(approx).toBeCloseTo(0.60, 2);
  });
});
