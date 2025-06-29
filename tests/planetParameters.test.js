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
});
