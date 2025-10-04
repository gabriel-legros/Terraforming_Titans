const { fastForwardToEquilibrium, generateOverrideSnippet } = require('../src/js/debug-tools.js');

describe('fastForwardToEquilibrium', () => {
  test('reduces step size when stable', () => {
    global.resources = {
      surface: { ice: { value: 0 }, liquidWater: { value: 0 }, dryIce: { value: 0 } },
      atmospheric: { carbonDioxide: { value: 0 }, atmosphericWater: { value: 0 } }
    };
    global.ZONES = [];
    global.terraforming = {
      zonalWater: {},
      zonalSurface: {},
      synchronizeGlobalResources: () => {},
      _updateZonalCoverageCache: () => {},
      updateLuminosity: () => {},
      updateSurfaceTemperature: () => {},
      updateResources: ms => global.updateLogic(ms)
    };

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
    expect(steps.every(s => s > 95 && s < 105)).toBe(true);
  });

  test('always calls updateLogic with a fixed step', () => {
    global.resources = {
      surface: { ice: { value: 0 }, liquidWater: { value: 0 }, dryIce: { value: 0 } },
      atmospheric: { carbonDioxide: { value: 0 }, atmosphericWater: { value: 0 } }
    };
    global.ZONES = [];
    global.terraforming = {
      zonalWater: {},
      zonalSurface: {},
      synchronizeGlobalResources: () => {},
      _updateZonalCoverageCache: () => {},
      updateLuminosity: () => {},
      updateSurfaceTemperature: () => {},
      updateResources: ms => global.updateLogic(ms)
    };

    const steps = [];
    global.updateLogic = ms => {
      steps.push(ms);
      // Make it unstable so it runs a few times
      global.resources.surface.ice.value += 10;
    };

    fastForwardToEquilibrium({
      stepMs: 10000, // 10s jump
      maxSteps: 3,
      stableSteps: 100,
      threshold: 1,
      minStepMs: 1000
    });

    // Each call to updateLogic should be near the fixed step
    expect(steps.length).toBeGreaterThan(1);
    expect(steps.every(s => s > 95 && s < 105)).toBe(true);
  });

  test('zonal biomass and buried hydrocarbons affect stability', () => {
    global.resources = {
      surface: { ice: { value: 0 }, liquidWater: { value: 0 }, dryIce: { value: 0 } },
      atmospheric: { carbonDioxide: { value: 0 }, atmosphericWater: { value: 0 } }
    };
    global.ZONES = ['tropical'];
    global.terraforming = {
      zonalWater: { tropical: { liquid: 0, ice: 0, buriedIce: 0 } },
      zonalCO2: { tropical: { liquid: 0, ice: 0 } },
      zonalSurface: { tropical: { biomass: 0 } },
      zonalHydrocarbons: { tropical: { liquid: 0, ice: 0, buriedIce: 0 } },
      synchronizeGlobalResources: () => {},
      _updateZonalCoverageCache: () => {},
      updateLuminosity: () => {},
      updateSurfaceTemperature: () => {},
      updateResources: ms => global.updateLogic(ms)
    };

    const steps = [];
    global.updateLogic = ms => {
      steps.push(ms);
      terraforming.zonalSurface.tropical.biomass += 5;
      terraforming.zonalHydrocarbons.tropical.buriedIce += 5;
    };

    fastForwardToEquilibrium({
      stepMs: 1000,
      minStepMs: 1000,
      stableSteps: 1,
      threshold: 1,
      maxSteps: 3
    });

    expect(steps.length).toBeGreaterThan(1);
  });

  test('generateOverrideSnippet includes hydrocarbon values', () => {
    const snippet = generateOverrideSnippet({
      global: {
        ice: 10,
        liquidWater: 5,
        dryIce: 2,
        liquidCO2: 4,
        liquidMethane: 3,
        hydrocarbonIce: 1,
        co2: 1,
        waterVapor: 1,
        atmosphericMethane: 9,
        buriedIce: 7
      },
      zones: {
        polar: {
          ice: 3,
          buriedIce: 4,
          liquidWater: 1,
          dryIce: 2,
          liquidCO2: 1,
          liquidMethane: 5,
          hydrocarbonIce: 6
        }
      }
    });

    const obj = JSON.parse(snippet);
    expect(obj.zonalWater.polar.buriedIce).toBe(4);
    expect(obj.resources.surface.liquidMethane.initialValue).toBe(3);
    expect(obj.resources.surface.hydrocarbonIce.initialValue).toBe(1);
    expect(obj.resources.surface.liquidCO2.initialValue).toBe(4);
    expect(obj.resources.atmospheric.atmosphericMethane.initialValue).toBe(9);
    expect(obj.zonalHydrocarbons.polar.liquid).toBe(5);
    expect(obj.zonalHydrocarbons.polar.ice).toBe(6);
    expect(obj.zonalCO2.polar.ice).toBe(2);
  });
});
