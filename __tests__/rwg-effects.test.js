describe('applyRWGEffects', () => {
  let applyRWGEffects;
  let effects;

  beforeEach(() => {
    effects = [];
    global.addEffect = (effect) => effects.push(effect);
    global.spaceManager = {
      randomWorldStatuses: {
        '12345': {
          terraformed: true,
          original: { classification: { archetype: 'rogue' } }
        }
      }
    };
    jest.isolateModules(() => {
      ({ applyRWGEffects } = require('../src/js/rwg/rwgEffects.js'));
    });
  });

  afterEach(() => {
    delete global.addEffect;
    delete global.spaceManager;
  });

  test('applies rogue planet maintenance reduction', () => {
    applyRWGEffects();

    const rogueEffects = effects.filter((effect) => effect && effect.sourceId === 'rwg-rogue');

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

    const effectFor = (id) => effects.find((effect) => effect && effect.effectId === id);

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

  test('counts hazard bonuses from selected hazards', () => {
    spaceManager.randomWorldStatuses = {
      mars: {
        terraformed: true,
        original: { classification: { archetype: 'mars-like' } },
        override: { rwgMeta: { selectedHazards: ['garbage', 'hazardousBiomass'] } }
      }
    };

    applyRWGEffects();

    const effect = effects.find((entry) => entry && entry.effectId === 'rwg-mars-pop');

    expect(effect).toEqual(expect.objectContaining({
      value: 0.06,
    }));
  });

  test('adds life design points for ammonia-rich worlds', () => {
    spaceManager.randomWorldStatuses = {
      ammonia: {
        terraformed: true,
        original: { classification: { archetype: 'ammonia-rich' } }
      }
    };

    applyRWGEffects();

    const effect = effects.find((entry) => entry && entry.effectId === 'rwg-ammonia-life-points');

    expect(effect).toEqual(expect.objectContaining({
      target: 'lifeDesigner',
      type: 'lifeDesignPointBonus',
      value: 1,
    }));
  });
});
