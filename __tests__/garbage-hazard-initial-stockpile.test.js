const path = require('path');

const { GarbageHazard } = require(path.join('..', 'src/js/terraforming/hazards/garbageHazard.js'));

describe('Garbage hazard initial stockpile', () => {
  test('calculates initialValue from parameters on load', () => {
    global.resources = {
      surface: {
        garbageMetal: {
          value: 25,
          initialValue: 0,
          unlocked: true
        }
      }
    };

    const hazard = new GarbageHazard(null);
    hazard.initializeResources(
      { initialLand: 100 },
      { surfaceResources: { garbageMetal: { amountMultiplier: 2 } } },
      { unlockOnly: true }
    );

    expect(global.resources.surface.garbageMetal.initialValue).toBe(200);
    expect(global.resources.surface.garbageMetal.value).toBe(25);
  });
});
