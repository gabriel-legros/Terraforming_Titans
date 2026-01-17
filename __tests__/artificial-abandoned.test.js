const EffectableEntity = require('../src/js/effectable-entity');

describe('Artificial world abandonment snapshot', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  const buildManagers = () => {
    global.EffectableEntity = EffectableEntity;
    global.prepareForTravel = jest.fn();
    global.getEcumenopolisLandFraction = () => 0;
    global.terraforming = {};
    global.resources = { colony: { colonists: { value: 5 } } };
    global.planetOverrides = {};
    global.planetParameters = {
      gabbag: { hazards: { garbage: {} } },
      tartarus: { hazards: { kessler: { orbitalDebrisPerLand: 100 } } }
    };
    global.ARTIFICIAL_FLEET_CAPACITY_WORLDS = 5;
    global.defaultPlanetParameters = {
      resources: {
        surface: { land: { initialValue: 0, baseCap: 0 } },
        colony: {
          metal: { baseCap: 0 },
          silicon: { baseCap: 0 },
        },
      },
      celestialParameters: { sector: 'R5-07', starLuminosity: 1 },
      visualization: {},
    };
    global.currentPlanetParameters = {
      name: 'Test Shellworld',
      classification: { archetype: 'artificial', type: 'shell', core: 'super-earth' },
      celestialParameters: {
        radius: 2 * 6371,
        sector: 'R1-01',
        rogue: false,
        distanceFromSun: 1,
        targetFluxWm2: 1000,
      },
      resources: {
        surface: {
          land: { initialValue: 1000, baseCap: 1000 },
        },
        colony: {
          metal: { initialValue: 123, baseCap: 200 },
          silicon: { initialValue: 456, baseCap: 200 },
        },
      },
      star: {
        name: 'Test Star',
        spectralType: 'G',
        luminositySolar: 1,
        massSolar: 1,
        temperatureK: 5800,
        habitableZone: { inner: 0.95, outer: 1.4 },
      },
    };

    const { ArtificialManager } = require('../src/js/space/artificial.js');
    const SpaceManager = require('../src/js/space.js');
    const spaceManager = new SpaceManager({ mars: { name: 'Mars' } });
    const artificialManager = new ArtificialManager();

    spaceManager.currentArtificialKey = 'A-001';
    spaceManager.currentPlanetKey = 'A-001';
    spaceManager.currentRandomSeed = null;
    spaceManager.currentRandomName = 'Test Shellworld';
    spaceManager.artificialWorldStatuses = {};

    global.spaceManager = spaceManager;
    global.artificialManager = artificialManager;

    return { spaceManager };
  };

  afterEach(() => {
    delete global.EffectableEntity;
    delete global.prepareForTravel;
    delete global.getEcumenopolisLandFraction;
    delete global.terraforming;
    delete global.resources;
    delete global.planetOverrides;
    delete global.planetParameters;
    delete global.ARTIFICIAL_FLEET_CAPACITY_WORLDS;
    delete global.defaultPlanetParameters;
    delete global.currentPlanetParameters;
    delete global.spaceManager;
    delete global.artificialManager;
    jest.resetModules();
  });

  it('records abandoned status and initial stockpiles on departure', () => {
    const { spaceManager } = buildManagers();

    spaceManager.recordDepartureSnapshot();

    const status = spaceManager.artificialWorldStatuses['A-001'];
    expect(status.abandoned).toBe(true);
    expect(status.artificialSnapshot.stockpile.metal).toBe(123);
    expect(status.artificialSnapshot.stockpile.silicon).toBe(456);
    expect(status.artificialSnapshot.radiusEarth).toBeCloseTo(2, 5);
  });
});
