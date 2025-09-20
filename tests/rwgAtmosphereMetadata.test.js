describe('Random World Generator atmosphere metadata', () => {
  test('propagates hideWhenSmall flags for atmospheric resources', () => {
    jest.resetModules();
    const { defaultPlanetParameters } = require('../src/js/planet-parameters.js');
    global.defaultPlanetParameters = defaultPlanetParameters;
    try {
      const { generateRandomPlanet } = require('../src/js/rwg.js');
      const result = generateRandomPlanet(12345, { type: 'mars-like' });
      const atmospheric = result?.override?.resources?.atmospheric || {};

      expect(atmospheric.hydrogen?.hideWhenSmall).toBe(true);
      expect(atmospheric.sulfuricAcid?.hideWhenSmall).toBe(true);
    } finally {
      delete global.defaultPlanetParameters;
    }
  });
});
