const {
  MOLECULAR_WEIGHTS,
  SPECIFIC_HEAT_CAPACITIES,
  calculateMolecularWeight,
  calculateSpecificLift,
  approximateSpecificLift,
  calculateEffectiveAtmosphericHeatCapacity,
  calculateAtmosphericHeatProperties
} = require('../src/js/terraforming/atmospheric-utils.js');

const MASS_PER_TON = 1e6;
const UNIVERSAL_GAS_CONSTANT = 8.314462618;

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

  describe('calculateAtmosphericHeatProperties', () => {
    test('derives cp, gas constant, and kappa from composition', () => {
      const composition = {
        nitrogen: { value: 78 },
        oxygen: { value: 21 },
        argon: { value: 1 }
      };
      const result = calculateAtmosphericHeatProperties(composition);
      const massNitrogen = 78 * 1000;
      const massOxygen = 21 * 1000;
      const massArgon = 1 * 1000;
      const totalMass = massNitrogen + massOxygen + massArgon;
      const expectedCp =
        (massNitrogen * SPECIFIC_HEAT_CAPACITIES.N2 +
          massOxygen * SPECIFIC_HEAT_CAPACITIES.O2 +
          massArgon * SPECIFIC_HEAT_CAPACITIES.Ar) / totalMass;
      expect(result.specificHeatCapacity).toBeCloseTo(expectedCp, 6);

      const meanMolWeight = calculateMolecularWeight(composition);
      const expectedGasConstant = (UNIVERSAL_GAS_CONSTANT * 1000) / meanMolWeight;
      expect(result.gasConstant).toBeCloseTo(expectedGasConstant, 6);
      expect(result.kappa).toBeCloseTo(expectedGasConstant / expectedCp, 6);
    });

    test('returns zeros when no known gases contribute', () => {
      const res = calculateAtmosphericHeatProperties({ unknown: { value: 5 } });
      expect(res).toEqual({ specificHeatCapacity: 0, meanMolecularWeight: 0, gasConstant: 0, kappa: 0 });
    });
  });

  describe('calculateEffectiveAtmosphericHeatCapacity', () => {
    test('reduces the isothermal capacity by one plus kappa', () => {
      const composition = { nitrogen: { value: 78 }, oxygen: { value: 21 }, argon: { value: 1 } };
      const surfacePressure = 101325;
      const gravity = 9.81;
      const properties = calculateAtmosphericHeatProperties(composition);
      const isoCapacity = (properties.specificHeatCapacity * surfacePressure) / gravity;
      const expected = isoCapacity / (1 + properties.kappa);
      const result = calculateEffectiveAtmosphericHeatCapacity(composition, surfacePressure, gravity);
      expect(result).toBeCloseTo(expected, 6);
    });

    test('returns zero when gravity is invalid or composition unknown', () => {
      const surfacePressure = 65000;
      const gravity = 0;
      expect(calculateEffectiveAtmosphericHeatCapacity({ nitrogen: { value: 10 } }, surfacePressure, gravity)).toBe(0);
      expect(calculateEffectiveAtmosphericHeatCapacity({ unknown: { value: 5 } }, surfacePressure, 9.81)).toBe(0);
    });
  });

  test('calculates specific lift with full and approximate formulas', () => {
    const lift = calculateSpecificLift(101325, 300, 44, 29);
    expect(lift).toBeCloseTo(0.61, 2);
    const approx = approximateSpecificLift(1, 300, 44);
    expect(approx).toBeCloseTo(0.60, 2);
  });
});
