const {
  runAtmosphericChemistry,
  OXYGEN_COMBUSTION_THRESHOLD,
  METHANE_COMBUSTION_THRESHOLD,
  CALCITE_HALF_LIFE_SECONDS,
} = require('../src/js/terraforming/atmospheric-chemistry.js');

describe('atmospheric chemistry', () => {
  test('methane and oxygen combust into water and CO2 with correct ratios', () => {
    const resources = { atmospheric: {} };
    const params = {
      globalOxygenPressurePa: OXYGEN_COMBUSTION_THRESHOLD + 1e6,
      globalMethanePressurePa: METHANE_COMBUSTION_THRESHOLD + 1e6,
      availableGlobalMethaneGas: 10,
      availableGlobalOxygenGas: 100,
      realSeconds: 1,
      durationSeconds: 1,
      surfaceArea: 1e16,
    };
    const result = runAtmosphericChemistry(resources, params);
    const changes = result.changes;
    expect(changes.atmosphericMethane).toBeCloseTo(-10);
    expect(changes.oxygen).toBeCloseTo(-40);
    expect(changes.atmosphericWater).toBeCloseTo(22.5);
    expect(changes.carbonDioxide).toBeCloseTo(27.5);
  });

  test('calcite aerosol decays with expected half-life', () => {
    const initial = 100;
    const resources = { atmospheric: { calciteAerosol: { value: initial } } };
    const params = {
      globalOxygenPressurePa: 0,
      globalMethanePressurePa: 0,
      availableGlobalMethaneGas: 0,
      availableGlobalOxygenGas: 0,
      realSeconds: CALCITE_HALF_LIFE_SECONDS,
      durationSeconds: CALCITE_HALF_LIFE_SECONDS,
      surfaceArea: 1,
    };
    const result = runAtmosphericChemistry(resources, params);
    expect(result.changes.calciteAerosol).toBeCloseTo(-initial / 2, 5);
    expect(result.rates.calcite).toBeCloseTo((initial / 2) / CALCITE_HALF_LIFE_SECONDS, 5);
  });
});

