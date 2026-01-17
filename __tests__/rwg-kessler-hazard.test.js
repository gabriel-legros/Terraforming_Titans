describe('RWG kessler hazard preset', () => {
  let RwgManager;

  beforeEach(() => {
    global.defaultPlanetParameters = {
      resources: {
        colony: {},
        surface: {},
        atmospheric: {},
        special: {}
      }
    };
    global.planetParameters = {
      gabbag: { hazards: { garbage: {} } },
      tartarus: { hazards: { kessler: { orbitalDebrisPerLand: 120 } } }
    };

    jest.isolateModules(() => {
      ({ RwgManager } = require('../src/js/rwg/rwg.js'));
    });
  });

  afterEach(() => {
    delete global.defaultPlanetParameters;
    delete global.planetParameters;
  });

  test('applies the kessler hazard preset when selected', () => {
    const manager = new RwgManager();
    manager.unlockFeature('hazards');
    manager.unlockHazard('kessler');

    const world = manager.generateRandomPlanet(4444, { orbitPreset: 'hz-mid', hazards: ['kessler'] });

    expect(world.override.hazards.kessler).toEqual(expect.objectContaining({
      orbitalDebrisPerLand: 120
    }));
    expect(world.override.rwgMeta.selectedHazards).toEqual(['kessler']);
  });
});
