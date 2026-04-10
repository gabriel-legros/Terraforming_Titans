#!/usr/bin/env node

const path = require('path');
const {
  advanceTicks,
  createGameDom,
  loadSaveFromRelativePath
} = require('../../__tests__/helpers/jsdom-game-harness.js');

function parseArgs(argv) {
  const args = {
    save: 'test_saves/debug/oversight4.json',
    ticks: 15,
    deltaMs: 10
  };

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (token === '--save' && next) {
      args.save = next;
      index += 1;
      continue;
    }
    if (token === '--ticks' && next) {
      args.ticks = Math.max(1, Math.floor(Number(next)));
      index += 1;
      continue;
    }
    if (token === '--delta-ms' && next) {
      args.deltaMs = Math.max(1, Math.floor(Number(next)));
      index += 1;
    }
  }

  if (!Number.isFinite(args.ticks) || args.ticks < 1) {
    throw new Error('Invalid --ticks value');
  }
  if (!Number.isFinite(args.deltaMs) || args.deltaMs < 1) {
    throw new Error('Invalid --delta-ms value');
  }

  return args;
}

function getGlobal(window, expression) {
  return window.eval(expression);
}

function toSignedNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function roundValue(value, digits = 6) {
  if (!Number.isFinite(value)) {
    return value;
  }
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function captureTickState(window, tick) {
  const settings = getGlobal(window, 'mirrorOversightSettings');
  const terraforming = getGlobal(window, 'terraforming');
  const buildings = getGlobal(window, 'buildings');
  const zones = getGlobal(window, 'getZones()');

  terraforming.updateSurfaceTemperature(0, { ignoreHeatCapacity: true });

  const zoneData = {};
  let totalTempError = 0;
  let maxTempError = 0;

  for (let index = 0; index < zones.length; index += 1) {
    const zone = zones[index];
    const target = Number(settings.targets?.[zone] || 0);
    const tempMode = settings.tempMode?.[zone] || 'average';
    const zoneTemps = terraforming.temperature.zones[zone];
    const actual = tempMode === 'day'
      ? Number(zoneTemps.day || 0)
      : (tempMode === 'night' ? Number(zoneTemps.night || 0) : Number(zoneTemps.value || 0));
    const error = target > 0 ? Math.abs(actual - target) : 0;

    zoneData[zone] = {
      targetK: roundValue(target, 6),
      actualK: roundValue(actual, 6),
      errorK: roundValue(error, 6),
      tempMode
    };

    totalTempError += error;
    maxTempError = Math.max(maxTempError, error);
  }

  const mirrorAssignments = {
    tropical: toSignedNumber(settings.assignments?.mirrors?.tropical),
    temperate: toSignedNumber(settings.assignments?.mirrors?.temperate),
    polar: toSignedNumber(settings.assignments?.mirrors?.polar),
    focus: toSignedNumber(settings.assignments?.mirrors?.focus),
    any: toSignedNumber(settings.assignments?.mirrors?.any)
  };
  const lanternAssignments = {
    tropical: toSignedNumber(settings.assignments?.lanterns?.tropical),
    temperate: toSignedNumber(settings.assignments?.lanterns?.temperate),
    polar: toSignedNumber(settings.assignments?.lanterns?.polar),
    focus: toSignedNumber(settings.assignments?.lanterns?.focus),
    any: toSignedNumber(settings.assignments?.lanterns?.any)
  };

  const mirrorEffect = terraforming.calculateMirrorEffect();
  const lantern = buildings.hyperionLantern;
  const lanternBaseProductivity = Number.isFinite(lantern._baseProductivity)
    ? lantern._baseProductivity
    : (Number.isFinite(lantern.productivity) ? lantern.productivity : 1);
  const lanternPowerPer = (lantern.powerPerBuilding || 0) * lanternBaseProductivity;
  const focusPower =
    Math.abs(mirrorAssignments.focus) * Number(mirrorEffect.interceptedPower || 0) +
    lanternAssignments.focus * lanternPowerPer;

  return {
    tick,
    temperatureK: {
      mean: roundValue(Number(terraforming.temperature.value || 0), 6),
      day: roundValue(Number(terraforming.temperature.day || 0), 6),
      night: roundValue(Number(terraforming.temperature.night || 0), 6)
    },
    zoneData,
    metrics: {
      totalTempErrorK: roundValue(totalTempError, 6),
      maxTempErrorK: roundValue(maxTempError, 6),
      waterTarget: roundValue(Number(settings.targets?.water || 0), 6),
      focusPowerW: roundValue(focusPower, 3)
    },
    assignments: {
      mirrors: mirrorAssignments,
      lanterns: lanternAssignments
    },
    trend: {
      equilibriumK: roundValue(Number(terraforming.temperature.equilibrium || 0), 6),
      yearlyDeltaK: roundValue(Number(terraforming.temperature.trend || 0), 6)
    }
  };
}

function buildSummary(points) {
  let largestMirrorJump = 0;
  let largestLanternJump = 0;
  let largestErrorJump = 0;
  let signFlipCount = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const mirrorZones = Object.keys(current.assignments.mirrors);
    const lanternZones = Object.keys(current.assignments.lanterns);

    for (let zoneIndex = 0; zoneIndex < mirrorZones.length; zoneIndex += 1) {
      const zone = mirrorZones[zoneIndex];
      const prev = previous.assignments.mirrors[zone] || 0;
      const next = current.assignments.mirrors[zone] || 0;
      largestMirrorJump = Math.max(largestMirrorJump, Math.abs(next - prev));
      if (prev !== 0 && next !== 0 && Math.sign(prev) !== Math.sign(next)) {
        signFlipCount += 1;
      }
    }

    for (let zoneIndex = 0; zoneIndex < lanternZones.length; zoneIndex += 1) {
      const zone = lanternZones[zoneIndex];
      const prev = previous.assignments.lanterns[zone] || 0;
      const next = current.assignments.lanterns[zone] || 0;
      largestLanternJump = Math.max(largestLanternJump, Math.abs(next - prev));
    }

    largestErrorJump = Math.max(
      largestErrorJump,
      Math.abs(current.metrics.totalTempErrorK - previous.metrics.totalTempErrorK)
    );
  }

  const start = points[0];
  const end = points[points.length - 1];
  return {
    startTotalTempErrorK: start.metrics.totalTempErrorK,
    endTotalTempErrorK: end.metrics.totalTempErrorK,
    bestTotalTempErrorK: Math.min.apply(null, points.map(point => point.metrics.totalTempErrorK)),
    worstTotalTempErrorK: Math.max.apply(null, points.map(point => point.metrics.totalTempErrorK)),
    largestMirrorJump,
    largestLanternJump,
    largestErrorJumpK: roundValue(largestErrorJump, 6),
    signFlipCount
  };
}

async function run() {
  const args = parseArgs(process.argv);
  const dom = await createGameDom();

  try {
    loadSaveFromRelativePath(dom.window, args.save);

    const points = [captureTickState(dom.window, 0)];
    for (let tick = 1; tick <= args.ticks; tick += 1) {
      advanceTicks(dom.window, 1, args.deltaMs);
      points.push(captureTickState(dom.window, tick));
    }

    process.stdout.write(JSON.stringify({
      save: args.save,
      absoluteSavePath: path.resolve(process.cwd(), args.save),
      ticks: args.ticks,
      deltaMs: args.deltaMs,
      summary: buildSummary(points),
      points
    }, null, 2) + '\n');
  } finally {
    dom.window.close();
  }
}

run().catch(error => {
  process.stderr.write(`${error && error.stack ? error.stack : error}\n`);
  process.exit(1);
});
