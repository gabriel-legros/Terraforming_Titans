const { calculateMeltingFreezingRates, simulateSurfaceWaterFlow } = require('../hydrology.js');
const { calculateMeltingFreezingRates: zonalRates } = require('../terraforming-utils.js');
const { getZonePercentage } = require('../zones.js');

global.getZonePercentage = getZonePercentage;

function makeTerraforming(zonalWater) {
  return { zonalWater, zonalSurface: {}, celestialParameters: { surfaceArea: 1 } };
}

describe('hydrology melting with buried ice', () => {
  test('calculateMeltingFreezingRates melts buried ice', () => {
    const T = 280; // above freezing
    const diff = T - 273.15;
    const res = calculateMeltingFreezingRates(T, 0, 0, 10);
    const expected = 10 * 0.0000001 * diff;
    expect(res.meltingRate).toBeCloseTo(expected);
    expect(res.freezingRate).toBe(0);
  });

  test('calculateZonalMeltingFreezingRates uses buried ice from terraforming', () => {
    const terra = { zonalWater: { polar: { ice: 5, buriedIce: 3, liquid: 1 } } };
    const T = 280;
    const diff = T - 273.15;
    const res = zonalRates(terra, 'polar', T);
    const expected = (5 + 3) * 0.0000001 * diff;
    expect(res.meltingRate).toBeCloseTo(expected);
  });

  test('simulateSurfaceWaterFlow melts ice proportionally to warmer neighbour', () => {
    const zonalWater = {
      polar: { liquid: 0, ice: 100, buriedIce: 50 },
      temperate: { liquid: 0, ice: 0, buriedIce: 0 },
      tropical: { liquid: 0, ice: 0, buriedIce: 0 }
    };
    const temps = { polar: 250, temperate: 274, tropical: 260 };
    const melt = simulateSurfaceWaterFlow(makeTerraforming(zonalWater), 1000, temps);
    const slopeFactor = 1 + (1 - 0.5);
    const expectedMelt = (100 + 50) * 0.005 * 0.1 * slopeFactor;
    const surfaceFraction = 100 / (100 + 50);
    const meltFromIce = expectedMelt * surfaceFraction;
    const meltFromBuried = expectedMelt - meltFromIce;
    expect(melt).toBeCloseTo(expectedMelt);
    expect(zonalWater.polar.ice).toBeCloseTo(100 - meltFromIce);
    expect(zonalWater.polar.buriedIce).toBeCloseTo(50 - meltFromBuried);
    expect(zonalWater.temperate.liquid).toBeCloseTo(expectedMelt);
  });

  test('flow occurs from temperate to polar when polar has less water', () => {
    const zonalWater = {
      polar: { liquid: 5, ice: 0, buriedIce: 0 },
      temperate: { liquid: 50, ice: 0, buriedIce: 0 },
      tropical: { liquid: 20, ice: 0, buriedIce: 0 }
    };
    const temps = { polar: 260, temperate: 260, tropical: 260 };
    const moved = simulateSurfaceWaterFlow(makeTerraforming(zonalWater), 1000, temps);
    expect(moved).toBeCloseTo(0); // no melting expected
    expect(zonalWater.polar.liquid).toBeCloseTo(5.157, 3);
    expect(zonalWater.temperate.liquid).toBeCloseTo(49.243, 3);
  });

  test('flow uses total water level difference including ice', () => {
    const zonalWater = {
      polar: { liquid: 10, ice: 50, buriedIce: 0 },
      temperate: { liquid: 40, ice: 0, buriedIce: 0 },
      tropical: { liquid: 40, ice: 0, buriedIce: 0 }
    };
    const temps = { polar: 260, temperate: 260, tropical: 260 };
    simulateSurfaceWaterFlow(makeTerraforming(zonalWater), 1000, temps);
    expect(zonalWater.temperate.liquid).toBeCloseTo(46.889, 3);
    expect(zonalWater.polar.liquid).toBeCloseTo(3.211, 3);
  });

  test('flow does not move directly from polar to tropical', () => {
    const zonalWater = {
      polar: { liquid: 50, ice: 0, buriedIce: 0 },
      temperate: { liquid: 0, ice: 0, buriedIce: 0 },
      tropical: { liquid: 0, ice: 0, buriedIce: 0 }
    };
    const temps = { polar: 260, temperate: 260, tropical: 260 };
    simulateSurfaceWaterFlow(makeTerraforming(zonalWater), 1000, temps);
    expect(zonalWater.tropical.liquid).toBeCloseTo(0, 5);
  });
});
