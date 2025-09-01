const { generateRandomPlanet } = require('../src/js/rwg.js');
const { dayNightTemperaturesModel, calculateAtmosphericPressure } = require('../src/js/physics.js');
const { calculateSurfaceFractions, calculateAverageCoverage } = require('../src/js/terraforming-utils.js');
const { getZonePercentage, estimateCoverage } = require('../src/js/zones.js');

test('random world generator uses physics model and precomputes zonal coverage', () => {
  const result = generateRandomPlanet(12345, { archetype: 'mars-like', orbitPreset: 'hz-mid' });
  const { star, override } = result;
  expect(override.zonalCoverageCache).toBeDefined();

  const cp = override.celestialParameters;
  const terraObj = {
    zonalWater: override.zonalWater,
    zonalHydrocarbons: override.zonalHydrocarbons,
    zonalSurface: override.zonalSurface,
    celestialParameters: { surfaceArea: cp.surfaceArea }
  };
  const zoneArea = terraObj.celestialParameters.surfaceArea * getZonePercentage('tropical');
  const expectedCoverage = estimateCoverage(terraObj.zonalWater.tropical.liquid, zoneArea);
  expect(override.zonalCoverageCache.tropical.liquidWater).toBeCloseTo(expectedCoverage);

  terraObj.zonalCoverageCache = override.zonalCoverageCache;
  expect(cp.temperature.mean).toBeGreaterThan(0);
  expect(typeof cp.actualAlbedo).toBe('number');
  expect(override.finalTemps).toBeDefined();
  expect(override.finalTemps.mean).toBeCloseTo(cp.temperature.mean);
  expect(override.finalTemps.day).toBeCloseTo(cp.temperature.day);
  expect(override.finalTemps.night).toBeCloseTo(cp.temperature.night);
});
