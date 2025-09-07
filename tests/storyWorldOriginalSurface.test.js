const { planetParameters, planetOverrides } = require('../src/js/planet-parameters.js');
global.planetOverrides = planetOverrides;
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const SpaceManager = require('../src/js/space.js');

describe('story world original properties', () => {
  test('override used and zonal surface sums applied', () => {
    const sm = new SpaceManager(planetParameters);
    sm._setCurrentPlanetKey('callisto');
    const original = sm.getCurrentWorldOriginal();
    expect(original.override).toBe(planetOverrides.callisto);
    const zones = ['tropical', 'temperate', 'polar'];
    let expectedIce = 0;
    let expectedDryIce = 0;
    zones.forEach(z => {
      const zw = planetOverrides.callisto.zonalWater[z];
      expectedIce += (zw.ice || 0) + (zw.buriedIce || 0);
      const zc = planetOverrides.callisto.zonalCO2[z];
      expectedDryIce += zc.ice || 0;
    });
    expect(original.merged.resources.surface.ice.initialValue).toBeCloseTo(expectedIce);
    expect(original.merged.resources.surface.dryIce.initialValue).toBeCloseTo(expectedDryIce);
  });
});
