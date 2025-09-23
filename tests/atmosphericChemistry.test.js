const {
  runAtmosphericChemistry,
  OXYGEN_COMBUSTION_THRESHOLD,
  METHANE_COMBUSTION_THRESHOLD,
  CALCITE_HALF_LIFE_SECONDS,
  SULFURIC_ACID_RAIN_THRESHOLD_K,
  SULFURIC_ACID_REFERENCE_DECAY_CONSTANT,
  SULFURIC_ACID_REFERENCE_TEMPERATURE_K,
  HYDROGEN_ESCAPE_GRAVITY_THRESHOLD,
  HYDROGEN_HALF_LIFE_MIN_SECONDS,
  HYDROGEN_HALF_LIFE_MAX_SECONDS,
  HYDROGEN_ATOMIC_HALF_LIFE_MULTIPLIER,
  HYDROGEN_PHOTODISSOCIATION_REFERENCE_FLUX,
  HYDROGEN_PHOTODISSOCIATION_MAX_FRACTION,
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
      surfaceTemperatureK: SULFURIC_ACID_RAIN_THRESHOLD_K,
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
      surfaceTemperatureK: SULFURIC_ACID_RAIN_THRESHOLD_K,
    };
    const result = runAtmosphericChemistry(resources, params);
    expect(result.changes.calciteAerosol).toBeCloseTo(-initial / 2, 5);
    expect(result.rates.calcite).toBeCloseTo((initial / 2) / CALCITE_HALF_LIFE_SECONDS, 5);
  });

  test('sulfuric acid rains out with a 300 second half-life at 300K', () => {
    const initial = 200;
    const acidHalfLifeSeconds = Math.log(2) / SULFURIC_ACID_REFERENCE_DECAY_CONSTANT;
    const resources = { atmospheric: { sulfuricAcid: { value: initial } } };
    const params = {
      globalOxygenPressurePa: 0,
      globalMethanePressurePa: 0,
      availableGlobalMethaneGas: 0,
      availableGlobalOxygenGas: 0,
      realSeconds: acidHalfLifeSeconds,
      durationSeconds: acidHalfLifeSeconds,
      surfaceArea: 1,
      surfaceTemperatureK: SULFURIC_ACID_REFERENCE_TEMPERATURE_K,
    };
    const result = runAtmosphericChemistry(resources, params);
    expect(result.changes.sulfuricAcid).toBeCloseTo(-initial / 2, 5);
    expect(result.rates.acidRain).toBeCloseTo((initial / 2) / acidHalfLifeSeconds, 5);
  });

  test('hydrogen decays with a gravity-dependent half-life', () => {
    const initial = 1000;
    const gravity = 0;
    const halfLife =
      HYDROGEN_HALF_LIFE_MIN_SECONDS +
      (HYDROGEN_HALF_LIFE_MAX_SECONDS - HYDROGEN_HALF_LIFE_MIN_SECONDS) * (gravity / HYDROGEN_ESCAPE_GRAVITY_THRESHOLD);
    const resources = { atmospheric: { hydrogen: { value: initial } } };
    const params = {
      globalOxygenPressurePa: 0,
      globalMethanePressurePa: 0,
      availableGlobalMethaneGas: 0,
      availableGlobalOxygenGas: 0,
      realSeconds: halfLife,
      durationSeconds: halfLife,
      surfaceArea: 1,
      surfaceTemperatureK: SULFURIC_ACID_RAIN_THRESHOLD_K,
      gravity,
      solarFlux: 0,
    };
    const result = runAtmosphericChemistry(resources, params);
    expect(result.changes.hydrogen).toBeCloseTo(-initial / 2, 5);
    expect(result.rates.hydrogen).toBeCloseTo((initial / 2) / halfLife, 5);
  });

  test('high gravity prevents hydrogen escape', () => {
    const initial = 500;
    const gravity = HYDROGEN_ESCAPE_GRAVITY_THRESHOLD + 1;
    const resources = { atmospheric: { hydrogen: { value: initial } } };
    const params = {
      globalOxygenPressurePa: 0,
      globalMethanePressurePa: 0,
      availableGlobalMethaneGas: 0,
      availableGlobalOxygenGas: 0,
      realSeconds: 1e6,
      durationSeconds: 1e6,
      surfaceArea: 1,
      surfaceTemperatureK: SULFURIC_ACID_RAIN_THRESHOLD_K,
      gravity,
      solarFlux: 1000,
    };
    const result = runAtmosphericChemistry(resources, params);
    expect(result.changes.hydrogen).toBeCloseTo(0, 10);
    expect(result.rates.hydrogen).toBeCloseTo(0, 10);
  });

  test('photodissociation accelerates hydrogen loss', () => {
    const initial = 800;
    const gravity = HYDROGEN_ESCAPE_GRAVITY_THRESHOLD / 2;
    const createResources = () => ({ atmospheric: { hydrogen: { value: initial } } });
    const baseParams = {
      globalOxygenPressurePa: 0,
      globalMethanePressurePa: 0,
      availableGlobalMethaneGas: 0,
      availableGlobalOxygenGas: 0,
      realSeconds: HYDROGEN_HALF_LIFE_MAX_SECONDS,
      durationSeconds: HYDROGEN_HALF_LIFE_MAX_SECONDS,
      surfaceArea: 1,
      surfaceTemperatureK: SULFURIC_ACID_RAIN_THRESHOLD_K,
      gravity,
    };
    const noFluxResult = runAtmosphericChemistry(createResources(), {
      ...baseParams,
      solarFlux: 0,
    });
    const intenseFlux = HYDROGEN_PHOTODISSOCIATION_REFERENCE_FLUX * 5;
    const highFluxResult = runAtmosphericChemistry(createResources(), {
      ...baseParams,
      solarFlux: intenseFlux,
    });

    expect(Math.abs(highFluxResult.changes.hydrogen)).toBeGreaterThan(Math.abs(noFluxResult.changes.hydrogen));

    const solarFluxRatio = intenseFlux / (intenseFlux + HYDROGEN_PHOTODISSOCIATION_REFERENCE_FLUX);
    const expectedAtomicFraction = solarFluxRatio * HYDROGEN_PHOTODISSOCIATION_MAX_FRACTION;
    expect(expectedAtomicFraction).toBeGreaterThan(0);
    expect(HYDROGEN_ATOMIC_HALF_LIFE_MULTIPLIER).toBeLessThan(1);
  });

  test('assigns combustion and decay rates to resources', () => {
    const createRes = (value = 0) => ({ value, modifyRate: jest.fn() });
    const resources = {
      atmospheric: {
        atmosphericWater: createRes(),
        carbonDioxide: createRes(),
        atmosphericMethane: createRes(),
        oxygen: createRes(),
        calciteAerosol: createRes(),
        sulfuricAcid: createRes(10),
        hydrogen: createRes(),
      },
    };
    const params = {
      globalOxygenPressurePa: OXYGEN_COMBUSTION_THRESHOLD + 1e6,
      globalMethanePressurePa: METHANE_COMBUSTION_THRESHOLD + 1e6,
      availableGlobalMethaneGas: 10,
      availableGlobalOxygenGas: 100,
      realSeconds: 1,
      durationSeconds: 1,
      surfaceArea: 1e16,
      surfaceTemperatureK: SULFURIC_ACID_REFERENCE_TEMPERATURE_K,
      gravity: 0,
      solarFlux: 0,
    };
    const result = runAtmosphericChemistry(resources, params);
    expect(resources.atmospheric.atmosphericWater.modifyRate).toHaveBeenCalledWith(
      result.rates.water,
      'Methane Combustion',
      'terraforming'
    );
    expect(resources.atmospheric.carbonDioxide.modifyRate).toHaveBeenCalledWith(
      result.rates.co2,
      'Methane Combustion',
      'terraforming'
    );
    expect(resources.atmospheric.atmosphericMethane.modifyRate).toHaveBeenCalledWith(
      -result.rates.methane,
      'Methane Combustion',
      'terraforming'
    );
    expect(resources.atmospheric.oxygen.modifyRate).toHaveBeenCalledWith(
      -result.rates.oxygen,
      'Methane Combustion',
      'terraforming'
    );
    expect(resources.atmospheric.calciteAerosol.modifyRate).toHaveBeenCalledWith(
      -result.rates.calcite,
      'Calcite Decay',
      'terraforming'
    );
    expect(resources.atmospheric.sulfuricAcid.modifyRate).toHaveBeenCalledWith(
      -result.rates.acidRain,
      'Acid rain',
      'terraforming'
    );
    expect(resources.atmospheric.hydrogen.modifyRate).toHaveBeenCalledWith(
      -result.rates.hydrogen,
      'Hydrogen Escape',
      'terraforming'
    );
  });
});

