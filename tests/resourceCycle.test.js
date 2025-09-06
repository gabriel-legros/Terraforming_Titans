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
});
