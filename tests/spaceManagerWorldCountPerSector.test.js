const EffectableEntity = require('../src/js/effectable-entity.js');
global.EffectableEntity = EffectableEntity;
const SpaceManager = require('../src/js/space.js');

describe('SpaceManager world counts per sector', () => {
  afterAll(() => {
    delete global.EffectableEntity;
  });

  test('defaults to R5-07 and counts orbital rings as extra worlds', () => {
    const manager = new SpaceManager({
      mars: { name: 'Mars', celestialParameters: {} }
    });

    manager.planetStatuses.mars.terraformed = true;
    manager.planetStatuses.mars.orbitalRing = true;

    expect(manager.getWorldCountPerSector()).toBe(2);
    expect(manager.getWorldCountPerSector('R5-07')).toBe(2);
  });

  test('counts random worlds and super-earth bonuses for matching sectors', () => {
    const manager = new SpaceManager({
      mars: { name: 'Mars', celestialParameters: {} },
      titan: { name: 'Titan', celestialParameters: { sector: 'R5-08' } }
    });

    manager.planetStatuses.titan.terraformed = true;

    manager.randomWorldStatuses.alpha = {
      terraformed: true,
      orbitalRing: false,
      original: {
        override: {
          celestialParameters: { sector: 'R5-08' },
          classification: { archetype: 'super-earth' }
        }
      }
    };

    expect(manager.getWorldCountPerSector('R5-07')).toBe(0);
    expect(manager.getWorldCountPerSector('R5-08')).toBe(3);
  });
});
