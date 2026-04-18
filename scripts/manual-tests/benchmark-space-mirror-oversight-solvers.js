#!/usr/bin/env node

const {
  createGameDom,
  loadSaveFromRelativePath,
} = require('../../__tests__/helpers/jsdom-game-harness.js');

const SAVES = [
  'test_saves/debug/oversight1.json',
  'test_saves/debug/oversight2.json',
  'test_saves/debug/oversight3.json',
  'test_saves/debug/oversight4.json',
  'test_saves/debug/oversight5.json',
];

const ALGORITHMS = ['current', 'newton'];
const MAX_ITERATIONS = 12;

function getGlobal(window, expression) {
  return window.eval(expression);
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
    if (!(target > 0)) return;

    const mode = settings.tempMode?.[zone] || 'average';
    const data = terraforming.temperature.zones[zone];
    const value = mode === 'day'
      ? data.day
      : (mode === 'night'
        ? data.night
        : (mode === 'flux'
          ? (terraforming.luminosity.zonalFluxes[zone] / 4)
          : data.value));

    const error = Math.abs(value - target);
    tempError += error;
    maxTempError = Math.max(maxTempError, error);
  });

  let waterError = 0;
  const waterTarget = settings.targets?.water || 0;
  if (waterTarget > 0) {
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
    const focusPower = (mirrors * mirrorPowerPer) + (lanterns * lanternPowerPer);
    const deltaT = Math.max(0, 273.15 - (terraforming.temperature.value || 0));
    const energyPerKg = 2100 * deltaT + 334000;
    const melt = energyPerKg > 0
      ? Math.max(0, focusPower / energyPerKg / 1000) * 86400
      : 0;
    waterError = Math.abs(melt - waterTarget) / Math.max(1, waterTarget);
  }

  return { tempError, maxTempError, waterError };
}

function isConverged(before, after) {
  return (
    after.tempError < before.tempError &&
    after.tempError < Math.max(1, before.tempError * 0.01) &&
    after.maxTempError < 0.5 &&
    Number.isFinite(after.waterError) &&
    after.waterError < 1
  );
}

async function benchmarkSave(algorithm, savePath) {
  const dom = await createGameDom();
  try {
    const { window } = dom;
    loadSaveFromRelativePath(window, savePath);
    getGlobal(window, `SpaceMirrorAdvancedOversight.solverAlgorithm = ${JSON.stringify(algorithm)}`);

    const before = computeOversightMetric(window);
    const projectExpr = 'projectManager.projects.spaceMirrorFacility';
    let iterations = 0;
    let totalNs = 0n;
    let after = before;

    while (iterations < MAX_ITERATIONS) {
      const start = process.hrtime.bigint();
      getGlobal(window, `runAdvancedOversightAssignments(${projectExpr})`);
      const end = process.hrtime.bigint();
      totalNs += end - start;
      iterations += 1;

      after = computeOversightMetric(window);
      if (isConverged(before, after)) {
        break;
      }
    }

    return {
      algorithm,
      save: savePath.split('/').pop(),
      iterations,
      converged: isConverged(before, after),
      totalMs: Number(totalNs) / 1e6,
      meanMs: iterations > 0 ? (Number(totalNs) / 1e6) / iterations : 0,
      before,
      after,
    };
  } finally {
    dom.window.close();
  }
}

async function main() {
  const results = [];
  for (const savePath of SAVES) {
    for (const algorithm of ALGORITHMS) {
      results.push(await benchmarkSave(algorithm, savePath));
    }
  }

  const summary = {};
  for (const algorithm of ALGORITHMS) {
    const rows = results.filter(result => result.algorithm === algorithm);
    summary[algorithm] = {
      converged: rows.filter(row => row.converged).length,
      totalMs: rows.reduce((sum, row) => sum + row.totalMs, 0),
      meanMsPerSave: rows.reduce((sum, row) => sum + row.totalMs, 0) / rows.length,
      meanIterations: rows.reduce((sum, row) => sum + row.iterations, 0) / rows.length,
    };
  }

  process.stdout.write(JSON.stringify({ results, summary }, null, 2) + '\n');
}

main().catch(error => {
  process.stderr.write(`${error && error.stack ? error.stack : error}\n`);
  process.exit(1);
});
