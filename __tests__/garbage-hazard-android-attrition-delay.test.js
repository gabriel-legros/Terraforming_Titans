const path = require('path');

const { GarbageHazard } = require(path.join('..', 'src/js/terraforming/hazards/garbageHazard.js'));

function seedResources() {
  global.resources = {
    surface: {
      garbageMetal: {
        value: 10,
        initialValue: 10,
        unlocked: true
      }
    },
    colony: {
      androids: { value: 100 }
    }
  };
}

describe('Garbage hazard android attrition delay', () => {
  test('starts countdown on fresh world initialization', () => {
    seedResources();
    const hazard = new GarbageHazard(null);
    const params = {
      surfaceResources: { garbageMetal: { amountMultiplier: 1 } },
      penalties: { garbageMetal: { androidAttrition: 0.1 } }
    };

    hazard.initializeResources({ initialLand: 10 }, params);
    expect(hazard.getAndroidAttritionDelaySeconds()).toBe(60);

    hazard.applyEffects(
      {
        addEffect: () => {},
        buildings: {},
        colonies: {},
        structures: {}
      },
      params
    );

    hazard.update(1);
    expect(global.resources.colony.androids.value).toBe(100);
    hazard.update(59);
    expect(global.resources.colony.androids.value).toBe(100);
    hazard.update(1);
    expect(global.resources.colony.androids.value).toBeCloseTo(90, 3);
  });

  test('does not start countdown when unlocking resources on load', () => {
    seedResources();
    const hazard = new GarbageHazard(null);
    const params = {
      surfaceResources: { garbageMetal: { amountMultiplier: 1 } },
      penalties: { garbageMetal: { androidAttrition: 0.1 } }
    };

    hazard.initializeResources({ initialLand: 10 }, params, { unlockOnly: true });
    expect(hazard.getAndroidAttritionDelaySeconds()).toBe(0);
  });

  test('persists remaining countdown through save and load', () => {
    seedResources();
    const hazard = new GarbageHazard(null);
    const params = {
      surfaceResources: { garbageMetal: { amountMultiplier: 1 } },
      penalties: { garbageMetal: { androidAttrition: 0.1 } }
    };

    hazard.initializeResources({ initialLand: 10 }, params);
    hazard.update(30);

    const saved = hazard.save();
    const loaded = new GarbageHazard(null);
    loaded.load(saved);

    expect(loaded.getAndroidAttritionDelaySeconds()).toBe(30);
  });
});
