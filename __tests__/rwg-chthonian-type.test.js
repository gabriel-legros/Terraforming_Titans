describe('RWG chthonian type selection', () => {
  let RwgManager;

  beforeEach(() => {
    global.defaultPlanetParameters = {
      resources: {
        colony: {},
        surface: {},
        atmospheric: {},
      },
    };
    global.planetParameters = {
      gabbag: { hazards: { garbage: {} } },
    };

    jest.isolateModules(() => {
      ({ RwgManager } = require('../src/js/rwg/rwg.js'));
    });
  });

  afterEach(() => {
    delete global.defaultPlanetParameters;
    delete global.planetParameters;
  });

  test('keeps explicit chthonian archetype', () => {
    const manager = new RwgManager();
    const world = manager.generateRandomPlanet(12345, { type: 'chthonian', orbitPreset: 'hz-mid' });
    expect(world.override.classification.archetype).toBe('chthonian');
  });

  test('keeps explicit super-earth archetype', () => {
    const manager = new RwgManager();
    const world = manager.generateRandomPlanet(54321, { type: 'super-earth', orbitPreset: 'hz-mid' });
    expect(world.override.classification.archetype).toBe('super-earth');
  });
});
