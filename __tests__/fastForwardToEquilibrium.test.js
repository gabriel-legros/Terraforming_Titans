const { fastForwardToEquilibrium } = require('../debug-tools.js');

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
});
