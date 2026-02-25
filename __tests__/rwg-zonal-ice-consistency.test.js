const {
  planetParameters,
  defaultPlanetParameters
} = require('../src/js/planet-parameters.js');

global.planetParameters = global.planetParameters || planetParameters;
global.defaultPlanetParameters = global.defaultPlanetParameters || defaultPlanetParameters;

const { RwgManager } = require('../src/js/rwg/rwg.js');

function readInitialValue(override, category, key) {
  const value = override
    && override.resources
    && override.resources[category]
    && override.resources[category][key]
    ? override.resources[category][key].initialValue
    : 0;
  return Number.isFinite(value) ? value : 0;
}

function getZonalIceTotal(override) {
  const zones = ['tropical', 'temperate', 'polar'];
  let total = 0;
  zones.forEach((zone) => {
    const zoneSurface = (override && override.zonalSurface && override.zonalSurface[zone]) || {};
    total += (zoneSurface.ice || 0) + (zoneSurface.buriedIce || 0);
  });
  return total;
}

describe('RWG zonal ice partitioning', () => {
  it('keeps global ice equal to zonal ice + buried ice for generated worlds', () => {
    const manager = new RwgManager();
    const seeds = [
      '1982065114|planet|icy-moon|hz-mid',
      '42|planet|titan-like|cold',
      '9001|planet|cold-desert|hz-outer',
      '1337|planet|mars-like|hz-mid'
    ];

    seeds.forEach((seed) => {
      const result = manager.generateRandomPlanet(seed);
      const override = result.override;
      const globalIce = readInitialValue(override, 'surface', 'ice');
      const zonalIce = getZonalIceTotal(override);
      const tolerance = Math.max(1e-3, globalIce * 1e-9);
      expect(Math.abs(globalIce - zonalIce)).toBeLessThanOrEqual(tolerance);
    });
  });
});
