const {
  advanceTicks,
  createGameDom,
  loadSaveFromRelativePath,
} = require('./helpers/jsdom-game-harness.js');

const shouldRunSlowTest = process.env.RUN_SLOW_OVERSIGHT_TEST === '1';
const runIt = shouldRunSlowTest ? it : it.skip;

function getGlobal(window, expression) {
  return window.eval(expression);
}

function loadSave(window, saveName) {
  loadSaveFromRelativePath(window, `test_saves/debug/${saveName}`);
}

function computeOversightMetric(window) {
  const settings = getGlobal(window, 'mirrorOversightSettings');
  const terraforming = getGlobal(window, 'terraforming');
  const buildings = getGlobal(window, 'buildings');
  const zones = getGlobal(window, 'getZones()');

  terraforming.updateSurfaceTemperature(0, { ignoreHeatCapacity: true });

  let tempError = 0;
  let maxTempError = 0;

  zones.forEach(zone => {
    const target = settings.targets?.[zone] || 0;
    if (!(target > 0)) {
      return;
    }
    const mode = settings.tempMode?.[zone] || 'average';
    const data = terraforming.temperature.zones[zone];
    const temp = mode === 'day'
      ? data.day
      : (mode === 'night' ? data.night : data.value);
    const err = Math.abs(temp - target);
    tempError += err;
    maxTempError = Math.max(maxTempError, err);
  });

  let waterError = 0;
  const waterTarget = settings.targets?.water || 0;
  const availableSurfaceIce = zones.reduce(
    (sum, zone) => sum + Math.max(0, terraforming.zonalSurface[zone].ice || 0),
    0
  );
  const effectiveWaterTarget = Math.min(waterTarget, availableSurfaceIce);
  if (effectiveWaterTarget > 0) {
    const mirrors = Math.abs(settings.assignments?.mirrors?.focus || 0);
    const lanterns = settings.assignments?.lanterns?.focus || 0;
    const mirrorPowerPer = terraforming.calculateMirrorEffect().interceptedPower || 0;
    const lantern = buildings?.hyperionLantern;
    const lanternBase = Number.isFinite(lantern?._baseProductivity)
      ? lantern._baseProductivity
      : (Number.isFinite(lantern?.productivity) ? lantern.productivity : 1);
    const lanternPowerPer = lantern
      ? (lantern.powerPerBuilding || 0) * lanternBase
      : 0;
    const focusPower = mirrors * mirrorPowerPer + lanterns * lanternPowerPer;
    const deltaT = Math.max(0, 273.15 - (terraforming.temperature.value || 0));
    const energyPerKg = 2100 * deltaT + 334000;
    const melt = energyPerKg > 0
      ? Math.max(0, focusPower / energyPerKg / 1000) * 86400
      : 0;
    waterError = Math.abs(melt - effectiveWaterTarget) / Math.max(1, effectiveWaterTarget);
  }

  return { tempError, maxTempError, waterError };
}

function runAdvancedOversight(window, iterations) {
  const runAssignments = getGlobal(window, 'runAdvancedOversightAssignments');
  const projectManager = getGlobal(window, 'projectManager');
  const project = projectManager.projects.spaceMirrorFacility;
  for (let i = 0; i < iterations; i++) {
    runAssignments(project);
  }
}

function advanceGameTicks(window, tickCount, deltaMs) {
  advanceTicks(window, tickCount, deltaMs);
}

const DEBUG_SAVES = [
  'oversight1.json',
  'oversight2.json',
  'oversight3.json',
  'oversight5.json',
];

const OVERSIGHT4_TICK_CASES = [
  { deltaMs: 100, ticks: 20 },
  { deltaMs: 1000, ticks: 20 },
];

describe('Space Mirror advanced oversight debug saves', () => {
  runIt.each(DEBUG_SAVES)('%s converges on zonal temperatures', async (saveName) => {
    const dom = await createGameDom();
    try {
      const { window } = dom;
      loadSave(window, saveName);

      const settings = getGlobal(window, 'mirrorOversightSettings');
      expect(settings.advancedOversight).toBe(true);

      const before = computeOversightMetric(window);
      runAdvancedOversight(window, 10);
      const after = computeOversightMetric(window);

      expect(after.tempError).toBeLessThan(before.tempError);
      expect(after.tempError).toBeLessThan(Math.max(1, before.tempError * 0.01));
      expect(after.maxTempError).toBeLessThan(0.5);
      expect(Number.isFinite(after.waterError)).toBe(true);
      expect(after.waterError).toBeLessThan(1);
    } finally {
      dom.window.close();
    }
  }, 60000);

  runIt.each(OVERSIGHT4_TICK_CASES)(
    'oversight4 stays stable across $deltaMs ms live ticks',
    async ({ deltaMs, ticks }) => {
      const dom = await createGameDom();
      try {
        const { window } = dom;
        loadSave(window, 'oversight4.json');

        const settings = getGlobal(window, 'mirrorOversightSettings');
        expect(settings.advancedOversight).toBe(true);

        advanceGameTicks(window, ticks, deltaMs);
        const after = computeOversightMetric(window);
        const assignments = getGlobal(window, 'mirrorOversightSettings.assignments.mirrors');

        expect(after.tempError).toBeLessThan(0.2);
        expect(after.maxTempError).toBeLessThan(0.1);
        expect(assignments.tropical || 0).toBeGreaterThanOrEqual(0);
        expect(assignments.temperate || 0).toBeGreaterThanOrEqual(0);
        expect(assignments.polar || 0).toBeGreaterThanOrEqual(0);
      } finally {
        dom.window.close();
      }
    },
    60000
  );
});
