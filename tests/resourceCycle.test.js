global.C_P_AIR = 1004;
global.EPSILON = 0.622;
const ResourceCycle = require('../src/js/terraforming/resource-cycle.js');
const { penmanRate, meltingFreezingRates } = require('../src/js/terraforming/phase-change-utils.js');
const { condensationRateFactor } = require('../src/js/terraforming/condensation-utils.js');

describe('ResourceCycle base class', () => {
  const saturationFn = T => T * 10;
  const slopeFn = () => 10;
  const rc = new ResourceCycle({
    latentHeatVaporization: 1e6,
    latentHeatSublimation: 2e6,
    saturationVaporPressureFn: saturationFn,
    slopeSaturationVaporPressureFn: slopeFn,
    freezePoint: 273.15,
    sublimationPoint: 195,
    rapidSublimationMultiplier: 0.1,
  });

  test('evaporationRate matches penmanRate', () => {
    const args = { T: 300, solarFlux: 500, atmPressure: 100000, vaporPressure: 1000 };
    const expected = penmanRate({
      T: 300,
      solarFlux: 500,
      atmPressure: 100000,
      e_a: 1000,
      latentHeat: 1e6,
      albedo: 0.6,
      r_a: 100,
      Delta_s: slopeFn(300),
      e_s: saturationFn(300),
    });
    expect(rc.evaporationRate(args)).toBeCloseTo(expected);
  });

  test('evaporationRate clamps humidity deficit above critical temperature', () => {
    const criticalRC = new ResourceCycle({
      latentHeatVaporization: 1e6,
      latentHeatSublimation: 2e6,
      saturationVaporPressureFn: saturationFn,
      slopeSaturationVaporPressureFn: slopeFn,
      freezePoint: 273.15,
      sublimationPoint: 195,
      criticalTemperature: 500,
    });
    const T = 600;
    const e_s = saturationFn(T);
    const e_a = e_s + 1000;
    const args = { T, solarFlux: 500, atmPressure: 100000, vaporPressure: e_a };
    const expected = penmanRate({
      T,
      solarFlux: 500,
      atmPressure: 100000,
      e_a,
      latentHeat: 1e6,
      albedo: 0.6,
      r_a: 100,
      Delta_s: slopeFn(T),
      e_s,
      criticalTemperature: 500,
    });
    expect(criticalRC.evaporationRate(args)).toBeCloseTo(expected);
  });

  test('condensationRateFactor uses provided functions', () => {
    const args = { zoneArea: 100, vaporPressure: 2000, gravity: 9.81, dayTemp: 280, nightTemp: 270 };
    const expected = condensationRateFactor({
      ...args,
      saturationFn,
      freezePoint: 273.15,
    });
    const result = rc.condensationRateFactor(args);
    expect(result.liquidRate).toBeCloseTo(expected.liquidRate);
    expect(result.iceRate).toBeCloseTo(expected.iceRate);
  });

  test('meltingFreezingRates delegates to util', () => {
    const args = {
      temperature: 270,
      availableIce: 100,
      availableLiquid: 50,
      availableBuriedIce: 0,
      zoneArea: 1,
      iceCoverage: 1,
      liquidCoverage: 1,
    };
    const expected = meltingFreezingRates({ ...args, freezingPoint: 273.15 });
    expect(rc.meltingFreezingRates(args)).toEqual(expected);
  });

  test('sublimationRate matches penmanRate', () => {
    const args = { T: 200, solarFlux: 400, atmPressure: 100000, vaporPressure: 1000 };
    const expected = penmanRate({
      T: 200,
      solarFlux: 400,
      atmPressure: 100000,
      e_a: 1000,
      latentHeat: 2e6,
      albedo: 0.6,
      r_a: 100,
      Delta_s: slopeFn(200),
      e_s: saturationFn(200),
    });
    expect(rc.sublimationRate(args)).toBeCloseTo(expected);
  });

  test('rapidSublimationRate uses linear model', () => {
    const rate = rc.rapidSublimationRate(200, 50);
    expect(rate).toBeCloseTo(50 * 0.1 * 5);
    expect(rc.rapidSublimationRate(190, 50)).toBe(0);
  });

  test('finalizeAtmosphere scales losses and precipitation', () => {
    const zones = {
      A: {
        atmosphere: { foo: -5 },
        precipitation: { potentialRain: 3 },
        foo: { liquid: 0 },
      },
      B: {
        atmosphere: { foo: 1 },
        precipitation: { potentialRain: 2 },
        foo: { liquid: 0 },
      },
    };

    const result = rc.finalizeAtmosphere({
      available: 2,
      zonalChanges: zones,
      atmosphereKey: 'foo',
      processes: [
        {
          container: 'precipitation',
          potentialKey: 'potentialRain',
          precipitationKey: 'rain',
          surfaceBucket: 'foo',
          surfaceKey: 'liquid',
          totalKey: 'rain',
        },
      ],
    });

    expect(zones.A.atmosphere.foo).toBeCloseTo(-2);
    expect(zones.A.precipitation.rain).toBeCloseTo(1.2);
    expect(zones.A.foo.liquid).toBeCloseTo(1.2);
    expect(zones.B.precipitation.rain).toBeCloseTo(2);
    expect(result.totalAtmosphericChange).toBeCloseTo(-1);
    expect(result.totalsByProcess.rain).toBeCloseTo(3.2);
  });

  test('processZone handles configured coverage and precipitation', () => {
    const rc2 = new ResourceCycle({
      latentHeatVaporization: 1,
      latentHeatSublimation: 1,
      saturationVaporPressureFn: () => 0,
      slopeSaturationVaporPressureFn: () => 0,
      freezePoint: 0,
      sublimationPoint: 0,
      coverageKeys: { liquid: 'liquidCov', ice: 'iceCov' },
      precipitationKeys: { liquid: 'rain', solid: 'snow' },
    });
    rc2.atmosphereKey = 'foo';
    rc2.surfaceBucket = 'foo';
    rc2.evaporationRate = jest.fn(() => 1);
    rc2.sublimationRate = jest.fn(() => 2);
    rc2.condensationRateFactor = jest.fn(() => ({ liquidRate: 3, iceRate: 4 }));
    rc2.meltingFreezingRates = jest.fn(() => ({ meltingRate: 5, freezingRate: 6 }));
    const result = rc2.processZone({
      zoneArea: 1,
      liquidCov: 1,
      iceCov: 1,
      dayTemperature: 300,
      nightTemperature: 280,
      zoneTemperature: 290,
      atmPressure: 100,
      vaporPressure: 10,
      availableLiquid: 10,
      availableIce: 10,
      availableBuriedIce: 5,
      zonalSolarFlux: 100,
      durationSeconds: 1,
      gravity: 1,
      condensationParameter: 1,
    });
    expect(result.atmosphere.foo).toBeCloseTo(-6.997);
    expect(result.foo.liquid).toBeCloseTo(-1.001);
    expect(result.foo.ice).toBeCloseTo(0.998);
    expect(result.precipitation.rain).toBeCloseTo(3);
    expect(result.precipitation.snow).toBeCloseTo(4);
    expect(result.evaporationAmount).toBeCloseTo(0.001);
    expect(result.sublimationAmount).toBeCloseTo(0.002);
    expect(result.meltAmount).toBeCloseTo(5);
    expect(result.freezeAmount).toBeCloseTo(6);
  });

  test('runCycle merges surfaceFlowFn results', () => {
    const rc3 = new ResourceCycle({
      surfaceFlowFn: () => ({ changes: { tropical: { liquid: 2 } }, totals: { melt: 2 } }),
    });
    rc3.zonalKey = 'zonalWater';
    rc3.surfaceBucket = 'water';
    rc3.atmosphereKey = 'foo';
    rc3.calculateZonalChanges = () => ({
      zonalChanges: { tropical: { water: { liquid: 1 } } },
      totals: { evaporation: 1 },
    });
    rc3.finalizeAtmosphere = () => ({ totalAtmosphericChange: 0, totalsByProcess: {} });
    rc3.applyZonalChanges = jest.fn();
    const tf = {
      temperature: { zones: { tropical: { value: 300 } } },
      resources: {},
    };
    const totals = rc3.runCycle(tf, ['tropical'], { durationSeconds: 1 });
    expect(totals.melt).toBe(2);
    expect(totals.evaporation).toBe(1);
    expect(rc3.applyZonalChanges).toHaveBeenCalledWith(
      tf,
      { tropical: { water: { liquid: 3 } } },
      undefined,
      undefined,
    );
  });

  test('processZone converts forbidden melt to rapid sublimation', () => {
    const rc5 = new ResourceCycle({
      latentHeatVaporization: 1,
      latentHeatSublimation: 1,
      saturationVaporPressureFn: () => 0,
      slopeSaturationVaporPressureFn: () => 0,
      freezePoint: 273.15,
      sublimationPoint: 273.15,
      triplePressure: 1000,
      disallowLiquidBelowTriple: true,
    });
    rc5.atmosphereKey = 'foo';
    rc5.surfaceBucket = 'foo';
    rc5.meltingFreezingRates = () => ({ meltingRate: 2, freezingRate: 0 });
    const result = rc5.processZone({
      zoneArea: 1,
      iceCoverage: 1,
      liquidCoverage: 0,
      zoneTemperature: 274,
      atmPressure: 500,
      vaporPressure: 0,
      availableIce: 5,
      availableBuriedIce: 0,
      availableLiquid: 0,
      durationSeconds: 1,
    });
    expect(result.rapidSublimationAmount).toBeCloseTo(2);
    expect(result.sublimationAmount).toBeCloseTo(0);
    expect(result.meltAmount).toBe(0);
    expect(result.atmosphere.foo).toBeCloseTo(2);
    expect(result.foo.ice).toBeCloseTo(-2);
  });

  test('updateResourceRates handles rapid sublimation mapping', () => {
    const rc6 = new ResourceCycle({
      rateMappings: {
        rapidSublimation: [
          { path: 'atmospheric.air', label: 'Rapid Sublimation', sign: 1 },
          { path: 'surface.ice', label: 'Rapid Sublimation', sign: -1 },
        ],
      },
    });
    const atmospheric = { air: { modifyRate: jest.fn() } };
    const surface = { ice: { modifyRate: jest.fn() } };
    const tf = { resources: { atmospheric, surface } };
    rc6.updateResourceRates(tf, { rapidSublimation: 1 }, 1);
    expect(atmospheric.air.modifyRate).toHaveBeenCalledWith(86400, 'Rapid Sublimation', 'terraforming');
    expect(surface.ice.modifyRate).toHaveBeenCalledWith(-86400, 'Rapid Sublimation', 'terraforming');
    expect(tf.totalRapidSublimationRate).toBeCloseTo(86400);
  });

  test('updateResourceRates uses rateMappings', () => {
    const rc4 = new ResourceCycle({
      rateMappings: {
        evaporation: [
          { path: 'atmospheric.air', label: 'Evap', sign: 1 },
          { path: 'surface.water', label: 'Evap', sign: -1 },
        ],
        rain: [
          { path: 'atmospheric.air', label: 'Rain', sign: -1 },
          { path: 'surface.water', label: 'Rain', sign: 1 },
        ],
      },
    });
    const atmospheric = { air: { modifyRate: jest.fn() } };
    const surface = { water: { modifyRate: jest.fn() } };
    const tf = { resources: { atmospheric, surface } };
    rc4.updateResourceRates(tf, { evaporation: 2, rain: 1 }, 2);
    expect(atmospheric.air.modifyRate.mock.calls).toEqual(expect.arrayContaining([
      [86400, 'Evap', 'terraforming'],
      [-43200, 'Rain', 'terraforming'],
    ]));
    expect(surface.water.modifyRate.mock.calls).toEqual(expect.arrayContaining([
      [-86400, 'Evap', 'terraforming'],
      [43200, 'Rain', 'terraforming'],
    ]));
    expect(tf.totalEvaporationRate).toBeCloseTo(86400);
    expect(tf.totalRainRate).toBeCloseTo(43200);
  });
});
