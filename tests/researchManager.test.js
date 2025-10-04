const previousEffectableEntity = global.EffectableEntity;
const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const { ResearchManager } = require('../src/js/research.js');

describe('ResearchManager advanced research multiplier', () => {
  let originalResources;
  let originalSpaceManager;

  beforeEach(() => {
    originalResources = global.resources;
    originalSpaceManager = global.spaceManager;
  });

  afterEach(() => {
    global.resources = originalResources;
    global.spaceManager = originalSpaceManager;
  });

  afterAll(() => {
    global.EffectableEntity = previousEffectableEntity;
  });

  test('calculateAdvancedResearchMultiplier stacks boost effects', () => {
    const manager = new ResearchManager({ general: [] });
    const increase = jest.fn();
    const modifyRate = jest.fn();
    global.resources = {
      colony: {
        advancedResearch: {
          unlocked: true,
          increase,
          modifyRate
        }
      }
    };
    global.spaceManager = {
      getTerraformedPlanetCount: () => 2
    };

    manager.addAndReplace({
      type: 'advancedResearchBoost',
      value: 1.5,
      effectId: 'boost-1',
      sourceId: 'boost-1'
    });

    expect(manager.calculateAdvancedResearchMultiplier()).toBeCloseTo(1.5);
    manager.update(1000);
    expect(increase).toHaveBeenCalledWith(3);
    expect(modifyRate).toHaveBeenCalledWith(3, 'Research Manager', 'research');

    increase.mockClear();
    modifyRate.mockClear();

    manager.addAndReplace({
      type: 'advancedResearchBoost',
      value: 1.2,
      effectId: 'boost-2',
      sourceId: 'boost-2'
    });

    expect(manager.calculateAdvancedResearchMultiplier()).toBeCloseTo(1.8);
    manager.update(1000);
    expect(increase).toHaveBeenCalledTimes(1);
    expect(increase.mock.calls[0][0]).toBeCloseTo(3.6);
    expect(modifyRate).toHaveBeenCalledTimes(1);
    const [rateValue, rateSource, rateCategory] = modifyRate.mock.calls[0];
    expect(rateValue).toBeCloseTo(3.6);
    expect(rateSource).toBe('Research Manager');
    expect(rateCategory).toBe('research');
  });
});
