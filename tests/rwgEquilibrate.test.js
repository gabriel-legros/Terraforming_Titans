const { generateRandomPlanet } = require('../src/js/rwg.js');
const { defaultPlanetParameters } = require('../src/js/planet-parameters.js');
const { runEquilibration } = require('../src/js/rwgEquilibrate.js');

function pickAtmo(o) {
  const a = (((o || {}).resources || {}).atmospheric) || {};
  return {
    CO2: a.carbonDioxide?.initialValue || 0,
    IG: a.inertGas?.initialValue || 0,
    O2: a.oxygen?.initialValue || 0,
    H2O: a.atmosphericWater?.initialValue || 0,
    CH4: a.atmosphericMethane?.initialValue || 0,
  };
}

describe('RWG equilibration (isolated Terraforming)', () => {
  test('produces zonal data and leaves original override unchanged', async () => {
    const seed = 'rwg-eq-test-1';
    const res = generateRandomPlanet(seed, { archetype: 'mars-like' });
    const override0 = res.override;
    const json0 = JSON.stringify(override0);

    // Sentinel globals to ensure restoration
    const sentinelCPP = { S: 'CPP' };
    const sentinelRes = { S: 'RES' };
    global.currentPlanetParameters = sentinelCPP;
    global.resources = sentinelRes;

    const { override: eq1, steps } = await runEquilibration(override0, {
      yearsMax: 50,
      stepDays: 365,
      checkEvery: 5,
      chunkSteps: 5,
      sync: true,
    });

    expect(steps).toBeGreaterThan(0);
    expect(eq1.zonalWater).toBeTruthy();
    expect(eq1.zonalHydrocarbons).toBeTruthy();
    expect(eq1.zonalSurface).toBeTruthy();

    // Original override not mutated
    expect(JSON.stringify(override0)).toBe(json0);

    // Globals restored
    expect(global.currentPlanetParameters).toBe(sentinelCPP);
    expect(global.resources).toBe(sentinelRes);

    // Determinism: re-run yields same atmospheric snapshot
    const { override: eq2 } = await runEquilibration(override0, {
      yearsMax: 50,
      stepDays: 365,
      checkEvery: 5,
      chunkSteps: 5,
      sync: true,
    });
    const a1 = pickAtmo(eq1);
    const a2 = pickAtmo(eq2);
    expect(a2.CO2).toBeCloseTo(a1.CO2, 6);
    expect(a2.IG).toBeCloseTo(a1.IG, 6);
    expect(a2.O2).toBeCloseTo(a1.O2, 6);
    expect(a2.H2O).toBeCloseTo(a1.H2O, 6);
    expect(a2.CH4).toBeCloseTo(a1.CH4, 6);

    // Live game not wired to sandboxed terraforming
    expect(typeof global.terraforming).toBe('undefined');
  });

  test('cancel token aborts run', async () => {
    const seed = 'rwg-eq-test-cancel';
    const res = generateRandomPlanet(seed, { archetype: 'mars-like' });
    const cancelToken = { cancelled: true };
    await expect(runEquilibration(res.override, { cancelToken, sync: true })).rejects.toThrow();
  });

  test('honors minimum runtime', async () => {
    const seed = 'rwg-eq-test-min-time';
    const res = generateRandomPlanet(seed, { archetype: 'mars-like' });
    const start = Date.now();
    await runEquilibration(res.override, {
      yearsMax: 1,
      stepDays: 365,
      checkEvery: 1,
      chunkSteps: 365,
      minRunMs: 50
    });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(50);
  });

  test('times out and restores globals', async () => {
    const seed = 'rwg-eq-test-timeout';
    const res = generateRandomPlanet(seed, { archetype: 'mars-like' });
    const sentinelCPP = { S: 'CPP' };
    const sentinelRes = { S: 'RES' };
    global.currentPlanetParameters = sentinelCPP;
    global.resources = sentinelRes;
    await expect(runEquilibration(res.override, {
      yearsMax: 1e9,
      stepDays: 365,
      checkEvery: 1e9,
      chunkSteps: 1,
      timeoutMs: 10
    })).rejects.toThrow('timeout');
    expect(global.currentPlanetParameters).toBe(sentinelCPP);
    expect(global.resources).toBe(sentinelRes);
  });
});


