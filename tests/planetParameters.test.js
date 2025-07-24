const { getPlanetParameters, defaultPlanetParameters } = require('../src/js/planet-parameters.js');

describe('getPlanetParameters', () => {
  test('applies overrides for titan', () => {
    const titan = getPlanetParameters('titan');
    expect(titan.name).toBe('Titan');
    expect(titan.fundingRate).toBe(0); // override
    expect(titan.buildingParameters.maintenanceFraction).toBe(defaultPlanetParameters.buildingParameters.maintenanceFraction);
  });

  test('unknown planet returns defaults copy', () => {
    const unknown = getPlanetParameters('pluto');
    expect(unknown).not.toBe(defaultPlanetParameters);
    expect(unknown.name).toBe(defaultPlanetParameters.name);
    expect(unknown.fundingRate).toBe(defaultPlanetParameters.fundingRate);
  });
  test('default planet includes advanced research resource', () => {
    const params = getPlanetParameters('mars');
    expect(params.resources.colony.advancedResearch).toBeDefined();
    expect(params.resources.colony.advancedResearch.hasCap).toBe(false);
    expect(params.resources.colony.advancedResearch.unlocked).toBe(false);
  });

  test('moons specify their parent body', () => {
    const moons = [
      { key: 'titan', parent: 'Saturn' },
      { key: 'callisto', parent: 'Jupiter' },
      { key: 'ganymede', parent: 'Jupiter' }
    ];
    for (const { key, parent } of moons) {
      const params = getPlanetParameters(key);
      expect(params.parentBody).toBeDefined();
      expect(params.parentBody.name).toBe(parent);
      expect(typeof params.parentBody.mass).toBe('number');
      expect(typeof params.parentBody.orbitRadius).toBe('number');
    }
  });

  test('all planets include mass estimates', () => {
    const planets = ['mars', 'titan', 'callisto', 'ganymede'];
    for (const name of planets) {
      const params = getPlanetParameters(name);
      expect(typeof params.celestialParameters.mass).toBe('number');
    }
  });
});
