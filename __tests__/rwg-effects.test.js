const { applyRWGEffects } = require('../src/js/rwg/rwgEffects.js');

describe('applyRWGEffects', () => {
  let addEffectSpy;

  beforeEach(() => {
    addEffectSpy = jest.fn();
    global.addEffect = addEffectSpy;
    global.spaceManager = {
      randomWorldStatuses: {
        '12345': {
          terraformed: true,
          original: { classification: { archetype: 'rogue' } }
        }
      }
    };
  });

  afterEach(() => {
    delete global.addEffect;
    delete global.spaceManager;
  });

  test('applies rogue planet maintenance reduction', () => {
    applyRWGEffects();

    const rogueEffects = addEffectSpy.mock.calls
      .map(([effect]) => effect)
      .filter((effect) => effect && effect.sourceId === 'rwg-rogue');

    expect(rogueEffects).toHaveLength(1);
    expect(rogueEffects[0]).toEqual(expect.objectContaining({
      effectId: 'rwg-rogue-maintenance',
      target: 'global',
      type: 'globalMaintenanceReduction',
      value: 1 - 1 / 1.02,
    }));
  });

  test('doubles other archetype bonuses', () => {
    spaceManager.randomWorldStatuses = {
      titan: {
        terraformed: true,
        original: { classification: { archetype: 'titan-like' } }
      },
      mars: {
        terraformed: true,
        original: { classification: { archetype: 'mars-like' } }
      },
      superEarth: {
        terraformed: true,
        original: { classification: { archetype: 'super-earth' } }
      }
    };

    applyRWGEffects();

    const effectFor = (id) => addEffectSpy.mock.calls
      .map(([effect]) => effect)
      .find((effect) => effect && effect.effectId === id);

    expect(effectFor('rwg-titan-nitrogen')).toEqual(expect.objectContaining({
      value: 1 / 1.2,
    }));
    expect(effectFor('rwg-mars-pop')).toEqual(expect.objectContaining({
      value: 0.02,
    }));
    expect(effectFor('rwg-super-earth-bonus')).toEqual(expect.objectContaining({
      value: 2,
    }));
  });
});
