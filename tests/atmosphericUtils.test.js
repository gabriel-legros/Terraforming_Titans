const {
  MOLECULAR_WEIGHTS,
  calculateMolecularWeight,
  calculateSpecificLift,
  approximateSpecificLift
} = require('../src/js/terraforming/atmospheric-utils.js');

const MASS_PER_TON = 1e6;

describe('atmospheric-utils', () => {
  describe('calculateMolecularWeight', () => {
    test('calculates mean molecular weight from atmospheric resource masses', () => {
      const atmosphere = {
        carbonDioxide: { value: 10 },
        oxygen: { value: 5 },
        inertGas: { value: 30 },
        atmosphericWater: { value: 2 },
        greenhouseGas: { value: 0.5 }
      };

      const totalMass = (10 + 5 + 30 + 2 + 0.5) * MASS_PER_TON;
      const totalMoles =
        (10 * MASS_PER_TON) / MOLECULAR_WEIGHTS.CO2 +
        (5 * MASS_PER_TON) / MOLECULAR_WEIGHTS.O2 +
        (30 * MASS_PER_TON) / MOLECULAR_WEIGHTS.N2 +
        (2 * MASS_PER_TON) / MOLECULAR_WEIGHTS.H2O +
        (0.5 * MASS_PER_TON) / MOLECULAR_WEIGHTS.SF6;

      const expected = totalMass / totalMoles;
      const mw = calculateMolecularWeight(atmosphere);
      expect(mw).toBeCloseTo(expected, 6);
    });

    test('supports numeric masses and ignores unknown gases', () => {
      const mix = { CO2: 1, O2: 1, unknownGas: 4 };
      const totalMass = 2 * MASS_PER_TON;
      const totalMoles =
        (1 * MASS_PER_TON) / MOLECULAR_WEIGHTS.CO2 +
        (1 * MASS_PER_TON) / MOLECULAR_WEIGHTS.O2;
      const expected = totalMass / totalMoles;
      expect(calculateMolecularWeight(mix)).toBeCloseTo(expected, 6);
    });

    test('returns zero when no known gases are present', () => {
      expect(calculateMolecularWeight({ unknown: { value: 12 } })).toBe(0);
    });
  });

  test('calculates specific lift with full and approximate formulas', () => {
    const lift = calculateSpecificLift(101325, 300, 44, 29);
    expect(lift).toBeCloseTo(0.61, 2);
    const approx = approximateSpecificLift(1, 300, 44);
    expect(approx).toBeCloseTo(0.60, 2);
  });
});
