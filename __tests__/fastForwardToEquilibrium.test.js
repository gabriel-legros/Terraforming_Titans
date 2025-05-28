const { fastForwardToEquilibrium, generateOverrideSnippet } = require('../debug-tools.js');

describe('fastForwardToEquilibrium', () => {
  test('reduces step size when stable', () => {
    global.resources = {
      surface: { ice: { value: 0 }, liquidWater: { value: 0 }, dryIce: { value: 0 } },
      atmospheric: { carbonDioxide: { value: 0 }, atmosphericWater: { value: 0 } }
    };
    global.ZONES = [];
    global.terraforming = { zonalWater: {}, zonalSurface: {} };

    const steps = [];
    global.updateLogic = ms => steps.push(ms);

    fastForwardToEquilibrium({
      stepMs: 10,
      minStepMs: 3,
      refineFactor: 0.5,
      stableSteps: 1,
      threshold: 0,
      maxSteps: 10
    });

    expect(steps.length).toBeGreaterThan(1);
    expect(Math.min(...steps)).toBeLessThan(Math.max(...steps));
  });

  test('increases step size when unstable for many steps', () => {
    global.resources = {
      surface: { ice: { value: 0 }, liquidWater: { value: 0 }, dryIce: { value: 0 } },
      atmospheric: { carbonDioxide: { value: 0 }, atmosphericWater: { value: 0 } }
    };
    global.ZONES = [];
    global.terraforming = { zonalWater: {}, zonalSurface: {} };

    const steps = [];
    global.updateLogic = ms => {
      steps.push(ms);
      global.resources.surface.ice.value += 1;
    };

    fastForwardToEquilibrium({
      stepMs: 1,
      maxSteps: 5,
      stableSteps: 100,
      accelerateThreshold: 1,
      accelerateFactor: 2,
      threshold: 0,
      minStepMs: 1
    });

    expect(steps.length).toBeGreaterThan(1);
    expect(Math.max(...steps)).toBeGreaterThan(Math.min(...steps));
  });

  test('generateOverrideSnippet includes buried ice', () => {
    const snippet = generateOverrideSnippet({
      global: {
        ice: 10,
        liquidWater: 5,
        dryIce: 2,
        co2: 1,
        waterVapor: 1,
        buriedIce: 7
      },
      zones: {
        polar: { ice: 3, buriedIce: 4, liquidWater: 1, dryIce: 2 }
      }
    });

    const obj = JSON.parse(snippet);
    expect(obj.zonalWater.polar.buriedIce).toBe(4);
  });
});
