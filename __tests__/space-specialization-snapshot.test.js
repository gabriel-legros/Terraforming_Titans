const EffectableEntity = require('../src/js/effectable-entity');

describe('SpaceManager specialization snapshots', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  const buildManager = () => {
    global.EffectableEntity = EffectableEntity;
    global.prepareForTravel = jest.fn();
    global.getEcumenopolisLandFraction = () => 0;
    global.terraforming = { requirementId: 'gabbagian' };
    global.resources = { colony: { colonists: { value: 42 } } };
    global.planetParameters = {
      gabbag: { hazards: { garbage: {} } },
      tartarus: { hazards: { kessler: {} } }
    };
    const SpaceManager = require('../src/js/space.js');
    const spaceManager = new SpaceManager({ mars: {}, titan: {} });
    global.spaceManager = spaceManager;
    return spaceManager;
  };

  afterEach(() => {
    delete global.EffectableEntity;
    delete global.prepareForTravel;
    delete global.getEcumenopolisLandFraction;
    delete global.terraforming;
    delete global.resources;
    delete global.planetParameters;
    delete global.spaceManager;
    jest.resetModules();
  });

  it('records specialization on story worlds', () => {
    const spaceManager = buildManager();
    spaceManager.currentRandomSeed = null;
    spaceManager.currentArtificialKey = null;
    spaceManager.currentPlanetKey = 'mars';

    spaceManager.recordDepartureSnapshot();

    expect(spaceManager.planetStatuses.mars.specialization).toBe('gabbagian');
  });

  it('records specialization on random worlds', () => {
    const spaceManager = buildManager();
    spaceManager.currentRandomSeed = 12345;
    spaceManager.currentRandomName = 'Seed 12345';
    spaceManager.currentPlanetKey = '12345';

    spaceManager.recordDepartureSnapshot();

    expect(spaceManager.randomWorldStatuses['12345'].specialization).toBe('gabbagian');
  });
});
