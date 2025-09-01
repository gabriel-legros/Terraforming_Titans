const { calculateMeltingFreezingRates, simulateSurfaceWaterFlow, simulateSurfaceHydrocarbonFlow } = require('../src/js/hydrology.js');
const { getZonePercentage, estimateCoverage } = require('../src/js/zones.js');

global.getZonePercentage = getZonePercentage;
global.estimateCoverage = estimateCoverage;

const zoneElevations = { tropical: 0, temperate: 0.5, polar: 1 };

function makeTerraforming(zonalWater) {
  const cache = {};
  for (const zone in zonalWater) {
    cache[zone] = {
      ice: (zonalWater[zone].ice || 0) > 0 ? 0.1 : 0 // Simplified mock
    };
  }
  return { zonalWater, zonalCoverageCache: cache, zonalSurface: {}, celestialParameters: { surfaceArea: 1 } };
}

function makeTerraformingWithRadius(zonalWater, radius) {
  const cache = {};
  for (const zone in zonalWater) {
    cache[zone] = {
      ice: (zonalWater[zone].ice || 0) > 0 ? 0.1 : 0
    };
  }
  return {
    zonalWater,
    zonalCoverageCache: cache,
    zonalSurface: {},
    celestialParameters: { surfaceArea: 1, radius }
  };
}

function makeHydroTerraforming(zonalHydro) {
  const cache = {};
  for (const zone in zonalHydro) {
    cache[zone] = {
      hydrocarbonIce: (zonalHydro[zone].ice || 0) > 0 ? 0.2 : 0
    };
  }
  return { zonalHydrocarbons: zonalHydro, zonalCoverageCache: cache, zonalSurface: {}, celestialParameters: { surfaceArea: 1 } };
}

describe('hydrology melting with buried ice', () => {
  test('calculateMeltingFreezingRates respects area cap', () => {
    const T = 280; // above freezing
    const res = calculateMeltingFreezingRates(T, 0, 0, 10, 1, 0, 0);
    expect(res.meltingRate).toBeCloseTo(0);
    expect(res.freezingRate).toBe(0);
  });

  test('calculateMeltingFreezingRates scales freezing by liquid coverage', () => {
    const T = 260; // below freezing
    const diff = 273.15 - T;
    const coverage = 0.2;
    const availableLiquid = 10;
    const res = calculateMeltingFreezingRates(T, 0, availableLiquid, 0, 1, 0, coverage);
    const expected = availableLiquid * 0.000001 * diff * coverage;
    expect(res.freezingRate).toBeCloseTo(expected);
  });

  test('calculateZonalMeltingFreezingRates caps melt by coverage', () => {
    const terra = {
      zonalWater: { polar: { ice: 5, buriedIce: 3, liquid: 1 } },
      zonalCoverageCache: { polar: { ice: 0.1 } }, // Mocked coverage
      celestialParameters: { surfaceArea: 1 }
    };
    const T = 280;
    const zoneArea = terra.celestialParameters.surfaceArea * getZonePercentage('polar');
    const coverage = terra.zonalCoverageCache.polar.ice;
    const meltCap = zoneArea * coverage * 0.1;
    const diff = T - 273.15;
    const expected = meltCap * 0.000001 * diff;
    const res = calculateMeltingFreezingRates(
      T,
      terra.zonalWater.polar.ice,
      terra.zonalWater.polar.liquid,
      terra.zonalWater.polar.buriedIce,
      zoneArea,
      coverage,
      terra.zonalCoverageCache.polar.liquidWater || 0
    );
    expect(res.meltingRate).toBeCloseTo(expected);
  });

  test('simulateSurfaceWaterFlow melts ice proportionally to warmer neighbour', () => {
    const zonalWater = {
      polar: { liquid: 0, ice: 100, buriedIce: 50 },
      temperate: { liquid: 0, ice: 0, buriedIce: 0 },
      tropical: { liquid: 0, ice: 0, buriedIce: 0 }
    };
    const temps = { polar: 250, temperate: 274, tropical: 260 };
    const terra = makeTerraforming(zonalWater);
    const { totalMelt: melt } = simulateSurfaceWaterFlow(terra, 1, temps, zoneElevations);
    const slopeFactor = 1 + (zoneElevations.polar - zoneElevations.temperate);
    const zoneArea = getZonePercentage('polar');
    const coverage = terra.zonalCoverageCache.polar.ice;
    const meltCap = zoneArea * coverage * 0.1;
    const expectedMelt = meltCap * 0.001 * slopeFactor;
    const surfaceFraction = 100 / (100 + 50);
    const meltFromIce = expectedMelt * surfaceFraction;
    const meltFromBuried = expectedMelt - meltFromIce;
    expect(melt).toBeCloseTo(expectedMelt);
    expect(zonalWater.polar.ice).toBeCloseTo(100 - meltFromIce);
    expect(zonalWater.polar.buriedIce).toBeCloseTo(50 - meltFromBuried);
    expect(zonalWater.temperate.liquid).toBeCloseTo(expectedMelt);
  });

  test('no flow occurs when zones share temperature despite level differences', () => {
    const zonalWater = {
      polar: { liquid: 5, ice: 0, buriedIce: 0 },
      temperate: { liquid: 50, ice: 0, buriedIce: 0 },
      tropical: { liquid: 20, ice: 0, buriedIce: 0 }
    };
    const temps = { polar: 260, temperate: 260, tropical: 260 };
    const { totalMelt: moved } = simulateSurfaceWaterFlow(makeTerraforming(zonalWater), 1, temps, zoneElevations);
    expect(moved).toBeCloseTo(0); // no melting expected
    expect(zonalWater.polar.liquid).toBeCloseTo(5);
    expect(zonalWater.temperate.liquid).toBeCloseTo(50);
  });

  test('flow uses total water level difference including ice', () => {
    const zonalWater = {
      polar: { liquid: 10, ice: 50, buriedIce: 0 },
      temperate: { liquid: 40, ice: 0, buriedIce: 0 },
      tropical: { liquid: 40, ice: 0, buriedIce: 0 }
    };
    const temps = { polar: 260, temperate: 260, tropical: 260 };
    simulateSurfaceWaterFlow(makeTerraforming(zonalWater), 1, temps, zoneElevations);
    expect(zonalWater.temperate.liquid).toBeGreaterThanOrEqual(40);
    expect(zonalWater.polar.liquid).toBeLessThanOrEqual(10);
  });

  test('buried ice does not affect water level difference', () => {
    const zonalWater = {
      polar: { liquid: 10, ice: 0, buriedIce: 50 },
      temperate: { liquid: 10, ice: 0, buriedIce: 0 },
      tropical: { liquid: 10, ice: 0, buriedIce: 0 }
    };
    const temps = { polar: 260, temperate: 260, tropical: 260 };
    simulateSurfaceWaterFlow(makeTerraforming(zonalWater), 1, temps, zoneElevations);
    expect(zonalWater.polar.liquid).toBeLessThanOrEqual(10);
    expect(zonalWater.temperate.liquid).toBeGreaterThanOrEqual(10);
  });

  test('flow does not move directly from polar to tropical', () => {
    const zonalWater = {
      polar: { liquid: 50, ice: 0, buriedIce: 0 },
      temperate: { liquid: 0, ice: 0, buriedIce: 0 },
      tropical: { liquid: 0, ice: 0, buriedIce: 0 }
    };
    const temps = { polar: 260, temperate: 260, tropical: 260 };
    simulateSurfaceWaterFlow(makeTerraforming(zonalWater), 1, temps, zoneElevations);
    expect(zonalWater.tropical.liquid).toBeCloseTo(0, 5);
  });

  test('surface flow scales with planet radius', () => {
    const marsRadius = 3389.5;
    const zonalWater = {
      polar: { liquid: 0, ice: 100, buriedIce: 0 },
      temperate: { liquid: 0, ice: 0, buriedIce: 0 },
      tropical: { liquid: 0, ice: 0, buriedIce: 0 }
    };
    const temps = { polar: 250, temperate: 274, tropical: 260 };
    const meltMars = simulateSurfaceWaterFlow(
      makeTerraformingWithRadius(JSON.parse(JSON.stringify(zonalWater)), marsRadius),
      1,
      temps,
      zoneElevations
    ).totalMelt;

    const meltBig = simulateSurfaceWaterFlow(
      makeTerraformingWithRadius(JSON.parse(JSON.stringify(zonalWater)), marsRadius * 2),
      1,
      temps,
      zoneElevations
    ).totalMelt;

    expect(meltBig).toBeCloseTo(meltMars * 2);
  });
});

describe('hydrocarbon flow', () => {
  test('uses cached coverage for melting', () => {
    const zonalHydro = {
      polar: { liquid: 0, ice: 50 },
      temperate: { liquid: 0, ice: 0 },
      tropical: { liquid: 0, ice: 0 }
    };
    const temps = { polar: 85, temperate: 95, tropical: 85 };
    const terra = makeHydroTerraforming(zonalHydro);
    const { totalMelt: melt } = simulateSurfaceHydrocarbonFlow(terra, 1, temps, zoneElevations);
    const slopeFactor = 1 + (zoneElevations.polar - zoneElevations.temperate);
    const zoneArea = getZonePercentage('polar');
    const coverage = terra.zonalCoverageCache.polar.hydrocarbonIce;
    const meltCap = zoneArea * coverage * 0.1;
    const expectedMelt = meltCap * (0.001 / 0.12) * slopeFactor;
    expect(melt).toBeCloseTo(expectedMelt);
    expect(zonalHydro.polar.ice).toBeCloseTo(50 - expectedMelt);
    expect(zonalHydro.temperate.liquid).toBeCloseTo(expectedMelt);
  });
});
