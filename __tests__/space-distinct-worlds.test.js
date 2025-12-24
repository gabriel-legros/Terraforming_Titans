describe('SpaceManager distinct world counts', () => {
  beforeEach(() => {
    jest.resetModules();
    const EffectableEntity = require('../src/js/effectable-entity');
    global.EffectableEntity = EffectableEntity;
    const { planetParameters } = require('../src/js/planet-parameters.js');
    global.planetParameters = planetParameters;
  });

  afterEach(() => {
    delete global.EffectableEntity;
    delete global.planetParameters;
    jest.resetModules();
  });

  const createManager = () => {
    const SpaceManager = require('../src/js/space.js');
    return new SpaceManager({ mars: {}, titan: {} });
  };

  it('filters story, random, and artificial worlds based on options', () => {
    const manager = createManager();
    manager.planetStatuses.mars.terraformed = true;
    manager.randomWorldStatuses.seed1 = { terraformed: true };
    manager.artificialWorldStatuses.A1 = { terraformed: true };

    expect(manager.getUnmodifiedTerraformedWorldCount()).toBe(3);
    expect(manager.getUnmodifiedTerraformedWorldCount({ countArtificial: false })).toBe(2);
    expect(manager.getUnmodifiedTerraformedWorldCount({ countStory: false, countRandom: false })).toBe(1);
  });
});
