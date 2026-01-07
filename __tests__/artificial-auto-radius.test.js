describe('Artificial world auto radius', () => {
  beforeEach(() => {
    jest.resetModules();
    global.EffectableEntity = class EffectableEntity {
      constructor(config = {}) {
        Object.assign(this, config);
        this.booleanFlags = new Set();
        this.activeEffects = [];
      }
      applyEffect() {}
    };
    global.spaceManager = {
      getTerraformedPlanetCount: () => 3,
    };
  });

  afterEach(() => {
    delete global.EffectableEntity;
    delete global.spaceManager;
    jest.resetModules();
  });

  it('allows construction time exactly at the 5-hour limit', () => {
    const { ArtificialManager } = require('../src/js/space/artificial.js');
    const manager = new ArtificialManager();
    const fiveHoursMs = 5 * 3_600_000;

    expect(manager.exceedsDurationLimit(fiveHoursMs)).toBe(false);
    expect(manager.exceedsDurationLimit(fiveHoursMs + 1)).toBe(true);
  });

  it('finds an auto radius that respects the 5-hour limit', () => {
    const { ArtificialManager } = require('../src/js/space/artificial.js');
    const manager = new ArtificialManager();
    const bounds = { min: 2, max: 8 };
    const radius = manager.getAutoRadius(bounds);
    const durationMs = manager.getDurationContext(radius).durationMs;

    expect(radius).toBeGreaterThanOrEqual(bounds.min);
    expect(radius).toBeLessThanOrEqual(bounds.max);
    expect(durationMs).toBeLessThanOrEqual(5 * 3_600_000);

    if (radius + 0.01 <= bounds.max) {
      const longer = manager.getDurationContext(radius + 0.01).durationMs;
      expect(longer).toBeGreaterThan(5 * 3_600_000);
    }
  });
});
