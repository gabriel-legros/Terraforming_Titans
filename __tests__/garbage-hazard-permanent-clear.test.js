const path = require('path');

const { HazardManager, setHazardManager } = require(path.join('..', 'src/js/terraforming/hazard.js'));

function setupGarbageHazard() {
  global.resources = {
    surface: {
      garbageMetal: {
        value: 10,
        initialValue: 10,
        unlocked: true
      }
    },
    colony: {
      androids: { value: 0 }
    }
  };

  const manager = new HazardManager();
  setHazardManager(manager);
  manager.initialize({
    garbage: {
      surfaceResources: { garbageMetal: { amountMultiplier: 1 } },
      penalties: { garbageMetal: { happiness: 0.1 } }
    }
  });

  return manager;
}

describe('Garbage hazard permanent clearance', () => {
  test('penalties stay removed after a category hits zero', () => {
    const manager = setupGarbageHazard();
    const effects = [];
    const context = {
      addEffect: (effect) => effects.push(effect),
      buildings: {},
      colonies: { alpha: {} },
      structures: {}
    };

    manager.applyHazardEffects(context);
    expect(effects.some((effect) => effect.effectId === 'garbageHazard-garbageMetal-happiness-alpha')).toBe(true);

    effects.length = 0;
    global.resources.surface.garbageMetal.value = 0;
    manager.applyHazardEffects(context);
    const clearedEffect = effects.find((effect) => effect.effectId === 'garbageHazard-garbageMetal-happiness-alpha');
    expect(clearedEffect).toBeTruthy();
    expect(clearedEffect.value).toBe(0);

    effects.length = 0;
    global.resources.surface.garbageMetal.value = 5;
    manager.applyHazardEffects(context);
    expect(effects.some((effect) => effect.effectId === 'garbageHazard-garbageMetal-happiness-alpha')).toBe(false);
    expect(manager.getHazardClearanceStatus(null)).toBe(true);
  });
});
