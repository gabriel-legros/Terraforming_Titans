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

  if (!getGlobal(window, 'gameSettings.phaseChangeHeat')) {
    terraforming.updateSurfaceTemperature(0, { ignoreHeatCapacity: true });
  }

  let tempError = 0;
  let maxTempError = 0;

  zones.forEach(zone => {
    const target = settings.targets?.[zone] || 0;
    if (!(target > 0)) {
      return;
    }
    const mode = settings.tempMode?.[zone] || 'average';
    const data = terraforming.temperature.zones[zone];
    const projectedData =
      settings.lastProjectedTemperatureState?.temperature?.zones?.[zone] || data;
    const meanTrend = projectedData.trendValue;
    const temp = mode === 'day'
      ? projectedData.day
      : (mode === 'night' ? projectedData.night : meanTrend);
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
    let melt = 0;
    if (getGlobal(window, 'gameSettings.phaseChangeHeat')) {
      let remainingPower = focusPower;
      const phaseParameters = getGlobal(window, 'terraformingParameters.phaseChange.water');
      const calculateTransitionEnergy = getGlobal(window, 'calculatePhaseTransitionEnergyPerKg');
      zones.map(zone => ({
        zone,
        temperature: terraforming.temperature.zones[zone].value,
        ice: Math.max(0, terraforming.zonalSurface[zone].ice || 0),
      })).filter(entry => entry.ice > 0)
        .sort((a, b) => b.temperature - a.temperature)
        .forEach(entry => {
          if (!(remainingPower > 0)) return;
          const energyPerKg = calculateTransitionEnergy(
            'solid',
            'liquid',
            entry.temperature,
            phaseParameters
          );
          const zonalMelt = Math.min(
            entry.ice,
            remainingPower / energyPerKg / 1000 * 86400
          );
          melt += zonalMelt;
          remainingPower -= zonalMelt * 1000 / 86400 * energyPerKg;
        });
    } else {
      const deltaT = Math.max(0, 273.15 - (terraforming.temperature.value || 0));
      const energyPerKg = 2100 * deltaT + 334000;
      melt = energyPerKg > 0
        ? Math.max(0, focusPower / energyPerKg / 1000) * 86400
        : 0;
    }
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

const LIVE_TICK_CASES = [
  { saveName: 'oversight4.json', deltaMs: 100, ticks: 20, phaseChangeHeat: false },
  { saveName: 'oversight4.json', deltaMs: 1000, ticks: 20, phaseChangeHeat: false },
  { saveName: 'oversight4.json', deltaMs: 1000, ticks: 60, phaseChangeHeat: true },
  { saveName: 'oversight7.json', deltaMs: 1000, ticks: 60, phaseChangeHeat: true },
  { saveName: 'oversight8.json', deltaMs: 1000, ticks: 60, phaseChangeHeat: true },
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

  runIt.each(LIVE_TICK_CASES)(
    '$saveName is handled across $deltaMs ms live ticks (phase-change heat: $phaseChangeHeat)',
    async ({ saveName, deltaMs, ticks, phaseChangeHeat }) => {
      const dom = await createGameDom();
      try {
        const { window } = dom;
        loadSave(window, saveName);

        const settings = getGlobal(window, 'mirrorOversightSettings');
        expect(settings.advancedOversight).toBe(true);
        getGlobal(window, `gameSettings.phaseChangeHeat = ${phaseChangeHeat}`);

        const initialPolarCurrent = getGlobal(window, 'terraforming.temperature.zones.polar.day');
        advanceGameTicks(window, ticks, deltaMs);
        const after = computeOversightMetric(window);
        const assignments = getGlobal(window, 'mirrorOversightSettings.assignments.mirrors');
        const lanternAssignments = getGlobal(window, 'mirrorOversightSettings.assignments.lanterns');
        const phaseChangeHeatFlux = getGlobal(window, 'terraforming.phaseChangeHeatFlux');
        if (saveName === 'oversight8.json') {
          const polarCurrent = getGlobal(window, 'terraforming.temperature.zones.polar.day');
          const polarTrend =
            settings.lastProjectedTemperatureState.temperature.zones.polar.day;
          expect(polarCurrent).toBeLessThan(initialPolarCurrent);
          expect(Math.abs(polarTrend - settings.targets.polar)).toBeLessThan(0.01);
        }
        if (saveName === 'oversight7.json') {
          const polarTarget = settings.targets.polar;
          const polarCurrent = getGlobal(window, 'terraforming.temperature.zones.polar.day');
          const polarTrend =
            settings.lastProjectedTemperatureState.temperature.zones.polar.day;
          expect(Math.abs(polarCurrent - polarTarget)).toBeLessThan(0.05);
          expect(Math.abs(polarTrend - polarTarget)).toBeLessThan(0.01);
        } else {
          expect(after.tempError).toBeLessThan(0.2);
          expect(after.maxTempError).toBeLessThan(0.1);
        }

        expect(Number.isFinite(assignments.tropical || 0)).toBe(true);
        expect(Number.isFinite(assignments.temperate || 0)).toBe(true);
        expect(Number.isFinite(assignments.polar || 0)).toBe(true);
        if (!phaseChangeHeat) {
          expect(assignments.tropical || 0).toBeGreaterThanOrEqual(0);
          expect(assignments.temperate || 0).toBeGreaterThanOrEqual(0);
          expect(assignments.polar || 0).toBeGreaterThanOrEqual(0);
        }
        expect(Number.isFinite(phaseChangeHeatFlux)).toBe(true);
        if (phaseChangeHeat) {
          expect(Math.abs(phaseChangeHeatFlux)).toBeGreaterThan(0);
        }
      } finally {
        dom.window.close();
      }
    },
    60000
  );
});
