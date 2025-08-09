const { getPlanetParameters } = require('../src/js/planet-parameters.js');
const { generateRandomPlanet } = require('../src/js/rwg.js');
const { runEquilibration } = require('../src/js/rwgEquilibrate.js');

function buildResourcesFromParams(params) {
  const out = {};
  const res = params.resources || {};
  for (const cat of Object.keys(res)) {
    out[cat] = {};
    for (const k of Object.keys(res[cat])) {
      const init = res[cat][k]?.initialValue || 0;
      out[cat][k] = { value: init, modifyRate: () => {} };
    }
  }
  return out;
}

describe('RWG equilibration does not mutate live game state', () => {
  test('live globals remain unchanged after equilibration', async () => {
    // Simulate a live game state on Mars
    const mars = getPlanetParameters('mars');
    const liveResources = buildResourcesFromParams(mars);
    global.currentPlanetParameters = mars;
    global.resources = liveResources;
    // Facility hook sentinel
    const sentinelFacility = () => 'sentinel';
    global.calculateZoneSolarFluxWithFacility = sentinelFacility;

    const liveCPPBefore = JSON.stringify(global.currentPlanetParameters);
    const liveResBefore = JSON.stringify(global.resources);

    // Generate a separate RWG planet and equilibrate it
    const rnd = generateRandomPlanet('no-leak-test', { archetype: 'mars-like' });
    const { override } = await runEquilibration(rnd.override, { yearsMax: 10, stepDays: 365, checkEvery: 2, chunkSteps: 2, sync: true });

    expect(override).toBeTruthy();

    // Assert live game state untouched
    const liveACPAfter = JSON.stringify(global.currentPlanetParameters);
    const liveResAfter = JSON.stringify(global.resources);
    expect(liveACPAfter).toBe(liveCPPBefore);
    expect(liveResAfter).toBe(liveResBefore);

    // Facility hook restored
    expect(global.calculateZoneSolarFluxWithFacility).toBe(sentinelFacility);
  });

  test('when no live globals exist, none are created after equilibration', async () => {
    // Ensure removal
    delete global.currentPlanetParameters;
    delete global.resources;
    const rnd = generateRandomPlanet('no-globals', { archetype: 'mars-like' });
    await runEquilibration(rnd.override, { yearsMax: 1, stepDays: 365, sync: true });
    expect(typeof global.currentPlanetParameters).toBe('undefined');
    expect(typeof global.resources).toBe('undefined');
  });
});


