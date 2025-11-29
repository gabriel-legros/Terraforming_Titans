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

  test('applies rogue planet cost reductions to mirrors and lanterns', () => {
    applyRWGEffects();

    const rogueEffects = addEffectSpy.mock.calls
      .map(([effect]) => effect)
      .filter((effect) => effect && effect.sourceId === 'rwg-rogue');

    expect(rogueEffects).toHaveLength(7);

    ['metal', 'glass', 'energy'].forEach((resource) => {
      expect(addEffectSpy).toHaveBeenCalledWith(expect.objectContaining({
        effectId: `rwg-rogue-space-mirror-cost-${resource}`,
        target: 'building',
        targetId: 'spaceMirror',
        resourceCategory: 'colony',
        resourceId: resource,
        value: 1 / 1.2,
      }));
    });

    ['metal', 'glass', 'electronics', 'components'].forEach((resource) => {
      expect(addEffectSpy).toHaveBeenCalledWith(expect.objectContaining({
        effectId: `rwg-rogue-lantern-cost-${resource}`,
        target: 'building',
        targetId: 'hyperionLantern',
        resourceCategory: 'colony',
        resourceId: resource,
        value: 1 / 1.2,
      }));
    });
  });
});
