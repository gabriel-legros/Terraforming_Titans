const fs = require('fs');
const path = require('path');
const { parse } = require('@babel/parser');
const { createGameDom } = require('../__tests__/helpers/jsdom-game-harness.js');

const REPO_ROOT = path.resolve(__dirname, '..');
const PLANET_PARAMETERS_PATH = path.join(REPO_ROOT, 'src', 'js', 'planet-parameters.js');
const TERRAFORMING_PARAMETERS_PATH = path.join(
  REPO_ROOT,
  'src',
  'js',
  'terraforming',
  'terraforming-parameters.js'
);
const STEP_MS = Function(
  `${fs.readFileSync(TERRAFORMING_PARAMETERS_PATH, 'utf8')};`
  + ' return terraformingParameters.gameplay.simulation.resourceSubstepMs;'
)();
const ZONES = ['tropical', 'temperate', 'polar'];
const PHASE_FAMILIES = [
  {
    id: 'water',
    atmosphere: 'atmosphericWater',
    liquid: 'liquidWater',
    solid: 'ice',
    buried: 'buriedIce',
    cycle: 'waterCycle'
  },
  {
    id: 'carbonDioxide',
    atmosphere: 'carbonDioxide',
    liquid: 'liquidCO2',
    solid: 'dryIce',
    buried: 'buriedDryIce',
    cycle: 'co2Cycle'
  },
  {
    id: 'methane',
    atmosphere: 'atmosphericMethane',
    liquid: 'liquidMethane',
    solid: 'hydrocarbonIce',
    buried: 'buriedHydrocarbonIce',
    cycle: 'methaneCycle'
  },
  {
    id: 'ammonia',
    atmosphere: 'atmosphericAmmonia',
    liquid: 'liquidAmmonia',
    solid: 'ammoniaIce',
    buried: 'buriedAmmoniaIce',
    cycle: 'ammoniaCycle'
  },
  {
    id: 'oxygen',
    atmosphere: 'oxygen',
    liquid: 'liquidOxygen',
    solid: 'oxygenIce',
    buried: 'buriedOxygenIce',
    cycle: 'oxygenCycle'
  },
  {
    id: 'nitrogen',
    atmosphere: 'inertGas',
    liquid: 'liquidNitrogen',
    solid: 'nitrogenIce',
    buried: 'buriedNitrogenIce',
    cycle: 'nitrogenCycle'
  }
];

function parseArguments(argv) {
  const options = {
    planet: '',
    passes: 50,
    relaxationSteps: 0,
    verificationSteps: 20000,
    threshold: 0.01,
    verificationThreshold: null,
    tuneCondensation: new Set(),
    preserveExposed: new Set(),
    solveAtmosphere: new Set(),
    globalBalance: new Set(),
    pressureRanges: new Map(),
    adaptiveOnly: false,
    adaptiveBalance: new Set(),
    relaxationRefinementChecks: 100
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--planet') {
      options.planet = String(argv[++index] || '').toLowerCase();
    } else if (argument === '--passes') {
      options.passes = Number(argv[++index]);
    } else if (argument === '--relax-steps') {
      options.relaxationSteps = Number(argv[++index]);
    } else if (argument === '--relax-refine-checks') {
      options.relaxationRefinementChecks = Number(argv[++index]);
    } else if (argument === '--steps') {
      options.verificationSteps = Number(argv[++index]);
    } else if (argument === '--threshold') {
      options.threshold = Number(argv[++index]);
    } else if (argument === '--verification-threshold') {
      options.verificationThreshold = Number(argv[++index]);
    } else if (argument === '--tune-condensation') {
      const family = String(argv[++index] || '');
      if (!PHASE_FAMILIES.some((entry) => entry.id === family)) {
        throw new Error(`Unknown phase family for --tune-condensation: ${family}`);
      }
      options.tuneCondensation.add(family);
    } else if (argument === '--preserve-exposed') {
      const family = String(argv[++index] || '');
      if (!PHASE_FAMILIES.some((entry) => entry.id === family)) {
        throw new Error(`Unknown phase family for --preserve-exposed: ${family}`);
      }
      options.preserveExposed.add(family);
    } else if (argument === '--solve-atmosphere') {
      const family = String(argv[++index] || '');
      if (!PHASE_FAMILIES.some((entry) => entry.id === family)) {
        throw new Error(`Unknown phase family for --solve-atmosphere: ${family}`);
      }
      options.solveAtmosphere.add(family);
    } else if (argument === '--global-balance') {
      const family = String(argv[++index] || '');
      if (!PHASE_FAMILIES.some((entry) => entry.id === family)) {
        throw new Error(`Unknown phase family for --global-balance: ${family}`);
      }
      options.globalBalance.add(family);
    } else if (argument === '--adaptive-only') {
      options.adaptiveOnly = true;
    } else if (argument === '--adaptive-balance') {
      const family = String(argv[++index] || '');
      if (!PHASE_FAMILIES.some((entry) => entry.id === family)) {
        throw new Error(`Unknown phase family for --adaptive-balance: ${family}`);
      }
      options.adaptiveBalance.add(family);
    } else if (argument === '--pressure-range') {
      const [family, minimumText, maximumText] = String(argv[++index] || '').split(':');
      const minimum = Number(minimumText);
      const maximum = Number(maximumText);
      if (!PHASE_FAMILIES.some((entry) => entry.id === family)) {
        throw new Error(`Unknown phase family for --pressure-range: ${family}`);
      }
      if (!(minimum >= 0) || !(maximum > minimum)) {
        throw new Error('--pressure-range must use <family>:<minimum-Pa>:<maximum-Pa>.');
      }
      options.pressureRanges.set(family, { minimum, maximum });
    } else if (argument === '--help' || argument === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (!options.help && !options.planet) {
    throw new Error('Missing required --planet <story-world-key>.');
  }
  if (!Number.isInteger(options.passes) || options.passes < 1) {
    throw new Error('--passes must be a positive integer.');
  }
  if (!Number.isInteger(options.relaxationSteps) || options.relaxationSteps < 0) {
    throw new Error('--relax-steps must be a non-negative integer.');
  }
  if (
    !Number.isInteger(options.relaxationRefinementChecks)
    || options.relaxationRefinementChecks < 1
  ) {
    throw new Error('--relax-refine-checks must be a positive integer.');
  }
  if (!Number.isInteger(options.verificationSteps) || options.verificationSteps < 1) {
    throw new Error('--steps must be a positive integer.');
  }
  if (!(options.threshold > 0)) {
    throw new Error('--threshold must be greater than zero.');
  }
  if (options.verificationThreshold === null) {
    options.verificationThreshold = options.threshold;
  }
  if (!(options.verificationThreshold > 0)) {
    throw new Error('--verification-threshold must be greater than zero.');
  }
  if (options.adaptiveOnly && options.relaxationSteps === 0) {
    throw new Error('--adaptive-only requires --relax-steps.');
  }
  if (options.adaptiveOnly && options.tuneCondensation.size > 0) {
    throw new Error('--adaptive-only cannot tune condensation coefficients.');
  }
  if (options.adaptiveBalance.size > 0 && !options.adaptiveOnly) {
    throw new Error('--adaptive-balance requires --adaptive-only.');
  }
  return options;
}

function printHelp() {
  process.stdout.write(
    'Usage: npm run equilibrate:world -- --planet <key> [options]\n\n'
    + 'Directly rewrites the selected story-world zonal surface and temperature override.\n\n'
    + 'Options:\n'
    + '  --planet <key>       Story-world key from planet-parameters.js (required)\n'
    + '  --passes <count>     Coordinate-solver passes (default: 50)\n'
    + '  --relax-steps <count> Maximum adaptive coarse-to-fine updates before solving\n'
    + `                       (default: 0; final refinement is ${STEP_MS} ms)\n`
    + '  --relax-refine-checks <count>\n'
    + '                       Unstable checks before halving the adaptive step (default: 100)\n'
    + `  --steps <count>      Exact ${STEP_MS} ms verification updates (default: 20000)\n`
    + '  --threshold <rate>   Maximum absolute phase rate in t/s (default: 0.01)\n'
    + '  --verification-threshold <rate>\n'
    + '                       Long-run acceptance rate; defaults to --threshold\n'
    + '  --tune-condensation <family>\n'
    + '                       Preserve that family\'s exposed inventory and tune its global\n'
    + '                       condensation coefficient; repeat for multiple families\n'
    + '  --preserve-exposed <family>\n'
    + '                       Preserve total exposed liquid/solid inventory while solving\n'
    + '                       its atmosphere and zonal distribution\n'
    + '  --solve-atmosphere <family>\n'
    + '                       Solve atmospheric mass with every zonal exposed reservoir;\n'
    + '                       store the inventory remainder in the largest buried reservoir\n'
    + '  --global-balance <family>\n'
    + '                       Solve global atmosphere and solid-phase rates while preserving\n'
    + '                       the other seeded exposed reservoirs\n'
    + '  --adaptive-only      Save the adaptively relaxed state directly; skip the algebraic\n'
    + `                       phase solver and use ${STEP_MS} ms steps only for verification\n`
    + '  --adaptive-balance <family>\n'
    + '                       After adaptive relaxation, solve only that family\'s conserved\n'
    + '                       atmosphere/exposed-reservoir split; repeat for multiple families\n'
    + '  --pressure-range <family>:<minimum-Pa>:<maximum-Pa>\n'
    + '                       Reject any solution that leaves this partial-pressure band\n'
    + '                       during verification; repeat for multiple families\n'
  );
}

function netRate(resource) {
  return resource.productionRate - resource.consumptionRate;
}

function getObjectProperty(node, key) {
  if (!node || node.type !== 'ObjectExpression') {
    return null;
  }
  return node.properties.find((property) => {
    if (property.type !== 'ObjectProperty' && property.type !== 'ObjectMethod') {
      return false;
    }
    if (property.computed) {
      return false;
    }
    return property.key.name === key || property.key.value === key;
  }) || null;
}

function findOverrideDeclaration(ast, source, planet) {
  let overrideVariable = '';
  for (const statement of ast.program.body) {
    if (statement.type !== 'VariableDeclaration') continue;
    for (const declaration of statement.declarations) {
      if (declaration.id?.name !== 'planetSpecificOverrides') continue;
      const property = getObjectProperty(declaration.init, planet);
      if (property?.value?.type === 'Identifier') {
        overrideVariable = property.value.name;
      }
    }
  }
  if (!overrideVariable) {
    throw new Error(`Story world '${planet}' is not registered in planetSpecificOverrides.`);
  }
  for (const statement of ast.program.body) {
    if (statement.type !== 'VariableDeclaration') continue;
    for (const declaration of statement.declarations) {
      if (declaration.id?.name === overrideVariable && declaration.init?.type === 'ObjectExpression') {
        return declaration.init;
      }
    }
  }
  throw new Error(`Could not locate the ${overrideVariable} object in ${source}.`);
}

function formatReplacement(source, property, value) {
  const lineStart = source.lastIndexOf('\n', property.start) + 1;
  const leadingWhitespace = source.slice(lineStart, property.start).match(/^\s*/)[0];
  return JSON.stringify(value, null, 2).replace(/\n/g, `\n${leadingWhitespace}`);
}

function rewriteOverride(
  source,
  planet,
  zonalSurface,
  zonalTemperatures,
  atmosphericValues
) {
  const ast = parse(source, {
    sourceType: 'script',
    plugins: ['bigInt', 'numericSeparator', 'optionalChaining']
  });
  const overrideNode = findOverrideDeclaration(ast, PLANET_PARAMETERS_PATH, planet);
  const zonalSurfaceProperty = getObjectProperty(overrideNode, 'zonalSurface');
  const zonalTemperaturesProperty = getObjectProperty(overrideNode, 'zonalTemperatures');
  if (!zonalTemperaturesProperty) {
    throw new Error(`World '${planet}' must define zonalTemperatures in its override.`);
  }
  const replacements = [];
  if (zonalSurfaceProperty) {
    replacements.push({
      start: zonalSurfaceProperty.value.start,
      end: zonalSurfaceProperty.value.end,
      text: formatReplacement(source, zonalSurfaceProperty, zonalSurface)
    });
  } else {
    const lineStart = source.lastIndexOf('\n', zonalTemperaturesProperty.start) + 1;
    const indentation =
      source.slice(lineStart, zonalTemperaturesProperty.start).match(/^\s*/)[0];
    const formattedSurface = JSON.stringify(zonalSurface, null, 2)
      .replace(/\n/g, `\n${indentation}`);
    replacements.push({
      start: lineStart,
      end: lineStart,
      text: `${indentation}zonalSurface: ${formattedSurface},\n`
    });
  }
  replacements.push({
    start: zonalTemperaturesProperty.value.start,
    end: zonalTemperaturesProperty.value.end,
    text: formatReplacement(source, zonalTemperaturesProperty, zonalTemperatures)
  });
  const resourcesNode = getObjectProperty(overrideNode, 'resources')?.value;
  const atmosphericNode = getObjectProperty(resourcesNode, 'atmospheric')?.value;
  for (const [resourceKey, value] of Object.entries(atmosphericValues)) {
    const resourceNode = getObjectProperty(atmosphericNode, resourceKey)?.value;
    const initialValueProperty = getObjectProperty(resourceNode, 'initialValue');
    if (!initialValueProperty) {
      throw new Error(
        `World '${planet}' must define resources.atmospheric.${resourceKey}.initialValue.`
      );
    }
    replacements.push({
      start: initialValueProperty.value.start,
      end: initialValueProperty.value.end,
      text: String(value)
    });
  }
  replacements.sort((left, right) => right.start - left.start);
  let output = source;
  for (const replacement of replacements) {
    output = output.slice(0, replacement.start) + replacement.text + output.slice(replacement.end);
  }
  return output;
}

function rewriteCondensationParameters(source, condensationParameters) {
  if (Object.keys(condensationParameters).length === 0) {
    return source;
  }
  const ast = parse(source, {
    sourceType: 'script',
    plugins: ['bigInt', 'numericSeparator', 'optionalChaining']
  });
  let root = null;
  for (const statement of ast.program.body) {
    if (statement.type !== 'VariableDeclaration') continue;
    for (const declaration of statement.declarations) {
      if (declaration.id?.name === 'terraformingParameters') {
        root = declaration.init;
      }
    }
  }
  const phaseChange = getObjectProperty(root, 'phaseChange')?.value;
  const replacements = [];
  for (const [family, value] of Object.entries(condensationParameters)) {
    const familyNode = getObjectProperty(phaseChange, family)?.value;
    const property = getObjectProperty(familyNode, 'equilibriumCondensationParameter');
    if (!property) {
      throw new Error(`Could not locate phaseChange.${family}.equilibriumCondensationParameter.`);
    }
    replacements.push({
      start: property.value.start,
      end: property.value.end,
      text: String(value)
    });
  }
  replacements.sort((left, right) => right.start - left.start);
  let output = source;
  for (const replacement of replacements) {
    output = output.slice(0, replacement.start) + replacement.text + output.slice(replacement.end);
  }
  return output;
}

function selectWorld(window, planet) {
  window.eval(`currentPlanetParameters = getPlanetParameters(${JSON.stringify(planet)})`);
  window.eval('initializeGameState()');
  window.eval('terraforming.calculateInitialValues()');
}

async function adaptivelyRelaxWorld(
  window,
  maximumSteps,
  threshold,
  refinementChecks
) {
  const relaxationInput =
    window.eval('JSON.parse(JSON.stringify(currentPlanetParameters))');
  let reportedRefinements = -1;
  const result = await window.runEquilibration(
    relaxationInput,
    {
      stepDays: 10,
      checkEvery: 5,
      chunkSteps: 1000,
      minRunMs: 60 * 60 * 1000,
      additionalRunMs: 0,
      timeoutMs: 60 * 60 * 1000,
      maxSteps: maximumSteps,
      instabilityRefinementEveryChecks: refinementChecks,
      absTol: threshold * STEP_MS / 1000,
      relTol: -1
    },
    (progress, info) => {
      const refinements =
        info.refinementsFromStability + info.refinementsFromInstability;
      if (refinements !== reportedRefinements) {
        reportedRefinements = refinements;
        process.stdout.write(
          `  Adaptive relaxation step ${info.step}, refinements ${refinements}, `
          + `simulated ${info.simulatedMs} ms\n`
        );
      }
    }
  );
  window.eval(`currentPlanetParameters = ${JSON.stringify(result.override)}`);
  window.eval('initializeGameState()');
  window.eval('terraforming.calculateInitialValues()');
  return result;
}

function balanceAdaptiveFamily(window, familyId, threshold) {
  const family = PHASE_FAMILIES.find((entry) => entry.id === familyId);
  const terraforming = window.eval('terraforming');
  const resources = window.resources;
  const baselineAtmosphere = Object.fromEntries(
    PHASE_FAMILIES.map((entry) => [
      entry.atmosphere,
      resources.atmospheric[entry.atmosphere].value
    ])
  );
  const baselineSurface = structuredClone(terraforming.zonalSurface);
  const baselineTemperatures = structuredClone(terraforming.temperature.zones);
  const exposedEntries = ZONES.flatMap((zone) => [
    { zone, phase: family.liquid, amount: baselineSurface[zone][family.liquid] || 0 },
    { zone, phase: family.solid, amount: baselineSurface[zone][family.solid] || 0 }
  ]);
  const reservoir = exposedEntries.reduce(
    (largest, entry) => entry.amount > largest.amount ? entry : largest,
    exposedEntries[0]
  );
  const exchangeableMass =
    baselineAtmosphere[family.atmosphere]
    + exposedEntries.reduce((total, entry) => total + entry.amount, 0);
  const fixedExposedMass = exposedEntries.reduce(
    (total, entry) => total + (
      entry.zone === reservoir.zone && entry.phase === reservoir.phase
        ? 0
        : entry.amount
    ),
    0
  );
  const maximumAtmosphere = Math.max(0, exchangeableMass - fixedExposedMass);

  const setState = (atmosphericAmount) => {
    for (const [atmosphereKey, value] of Object.entries(baselineAtmosphere)) {
      resources.atmospheric[atmosphereKey].value = value;
    }
    resources.atmospheric[family.atmosphere].value = atmosphericAmount;
    for (const zone of ZONES) {
      terraforming.zonalSurface[zone] = { ...baselineSurface[zone] };
      terraforming.temperature.zones[zone] = { ...baselineTemperatures[zone] };
    }
    terraforming.zonalSurface[reservoir.zone][reservoir.phase] =
      exchangeableMass - fixedExposedMass - atmosphericAmount;
    terraforming.synchronizeGlobalResources();
    terraforming._updateZonalCoverageCache();
    terraforming._updateAtmosphericPressureCache();
    terraforming.updateLuminosity();
    terraforming.updateSurfaceTemperature(0, { ignoreHeatCapacity: true });
  };
  const solvedAtmosphere = bisect(
    (candidate) => {
      setState(candidate);
      terraforming.updateResources(STEP_MS, { refreshStandaloneRates: true });
      return netRate(resources.atmospheric[family.atmosphere]);
    },
    0,
    maximumAtmosphere,
    threshold / 10
  );
  setState(solvedAtmosphere);
  process.stdout.write(
    `Adaptive ${familyId} balance: atmosphere ${solvedAtmosphere} tons, `
    + `${reservoir.zone} ${reservoir.phase} `
    + `${terraforming.zonalSurface[reservoir.zone][reservoir.phase]} tons.\n`
  );
}

function captureAdaptiveSolution(window) {
  const terraforming = window.eval('terraforming');
  const resources = window.resources;
  const activeFamilies = PHASE_FAMILIES.filter((family) => (
    resources.atmospheric[family.atmosphere].value > 0
    || ZONES.some((zone) => (
      (terraforming.zonalSurface[zone][family.liquid] || 0) > 0
      || (terraforming.zonalSurface[zone][family.solid] || 0) > 0
      || (terraforming.zonalSurface[zone][family.buried] || 0) > 0
    ))
  ));
  const zonalSurface = structuredClone(terraforming.zonalSurface);
  const zonalTemperatures = Object.fromEntries(
    ZONES.map((zone) => [zone, {
      value: terraforming.temperature.zones[zone].value,
      day: terraforming.temperature.zones[zone].day,
      night: terraforming.temperature.zones[zone].night
    }])
  );
  const atmosphericValues = Object.fromEntries(
    activeFamilies.map((family) => [
      family.atmosphere,
      resources.atmospheric[family.atmosphere].value
    ])
  );
  terraforming.updateResources(STEP_MS, { refreshStandaloneRates: true });
  const phaseResourceKeys = Array.from(new Set(
    activeFamilies.flatMap((family) => [family.liquid, family.solid])
  ));
  return {
    zonalSurface,
    zonalTemperatures,
    atmosphericValues,
    phaseResourceKeys,
    families: activeFamilies.map((family) => family.id),
    condensationParameters: {},
    oneStepRates: Object.fromEntries(
      phaseResourceKeys.map((key) => [key, netRate(resources.surface[key])])
    ),
    pressurePa: terraforming.atmosphericPressureCache.totalPressure
  };
}

function getCoverageScale(terraforming, resourceKey) {
  const config = terraforming.zonalSurfaceResourceConfigs.find(
    (entry) => entry.keys.includes(resourceKey)
  );
  if (!config) {
    throw new Error(`No zonal surface configuration found for ${resourceKey}.`);
  }
  return config.coverageScales?.[resourceKey] || config.coverageScale;
}

function bisect(fn, low, high, tolerance) {
  let lowValue = fn(low);
  if (Math.abs(lowValue) <= tolerance) return low;
  let highValue = fn(high);
  if (Math.abs(highValue) <= tolerance) return high;
  if (Math.sign(lowValue) === Math.sign(highValue)) {
    throw new Error(`Could not bracket phase root (${lowValue}, ${highValue}).`);
  }
  for (let iteration = 0; iteration < 100; iteration += 1) {
    const middle = (low + high) / 2;
    if (middle === low || middle === high) break;
    const value = fn(middle);
    if (Math.abs(value) <= tolerance) return middle;
    if (Math.sign(value) === Math.sign(lowValue)) {
      low = middle;
      lowValue = value;
    } else {
      high = middle;
      highValue = value;
    }
  }
  return Math.abs(lowValue) <= Math.abs(highValue) ? low : high;
}

function buildSolver(window, options) {
  const terraforming = window.eval('terraforming');
  const resources = window.resources;
  const familyStates = [];
  const baselineSurface = structuredClone(terraforming.zonalSurface);

  for (const config of PHASE_FAMILIES) {
    const atmosphericAmount = resources.atmospheric[config.atmosphere].value;
    const totalMass = atmosphericAmount + ZONES.reduce(
      (total, zone) => total
        + (baselineSurface[zone][config.liquid] || 0)
        + (baselineSurface[zone][config.solid] || 0)
        + (baselineSurface[zone][config.buried] || 0),
      0
    );
    const condensedMass = totalMass - atmosphericAmount;
    if (!(condensedMass > 0) && !options.tuneCondensation.has(config.id)) continue;
    const cycle = window.eval(config.cycle);
    const phaseByZone = {};
    const amountByZone = {};
    for (const zone of ZONES) {
      const liquidAmount = baselineSurface[zone][config.liquid] || 0;
      const solidAmount = baselineSurface[zone][config.solid] || 0;
      const temperature = terraforming.temperature.zones[zone].value;
      const phase = liquidAmount > solidAmount
        ? config.liquid
        : (solidAmount > 0
          ? config.solid
          : (temperature < cycle.freezePoint ? config.solid : config.liquid));
      phaseByZone[zone] = phase;
      amountByZone[zone] = phase === config.liquid ? liquidAmount : solidAmount;
    }
    const reservoirZone = ZONES.reduce(
      (best, zone) => baselineSurface[zone][config.buried] > baselineSurface[best][config.buried]
        ? zone
        : best,
      'polar'
    );
    const tuneCondensation = options.tuneCondensation.has(config.id);
    const preserveSurfaceMass = options.preserveExposed.has(config.id);
    const solveAtmosphere = options.solveAtmosphere.has(config.id);
    const globalPhaseBalance = options.globalBalance.has(config.id);
    const initialBuriedMass = ZONES.reduce(
      (total, zone) => total + (baselineSurface[zone][config.buried] || 0),
      0
    );
    const useAtmosphereReservoir =
      !tuneCondensation
      && !preserveSurfaceMass
      && !solveAtmosphere
      && !globalPhaseBalance
      && initialBuriedMass === 0;
    const baselineBuried = Object.fromEntries(
      ZONES.map((zone) => [zone, baselineSurface[zone][config.buried] || 0])
    );
    familyStates.push({
      ...config,
      atmosphericAmount,
      initialAtmosphericAmount: atmosphericAmount,
      totalMass,
      phaseByZone,
      amountByZone,
      baselineAmountByZone: { ...amountByZone },
      reservoirZone,
      tuneCondensation,
      preserveSurfaceMass,
      globalPhaseBalance,
      solveAtmosphere: preserveSurfaceMass || solveAtmosphere || globalPhaseBalance,
      deferAtmosphereSolve: false,
      globalOnly: false,
      useAtmosphereReservoir,
      baselineBuried,
      targetSurfaceMass: ZONES.reduce(
        (total, zone) => total
          + (baselineSurface[zone][config.liquid] || 0)
          + (baselineSurface[zone][config.solid] || 0),
        0
      ),
      exchangeableMass: atmosphericAmount + ZONES.reduce(
        (total, zone) => total
          + (baselineSurface[zone][config.liquid] || 0)
          + (baselineSurface[zone][config.solid] || 0),
        0
      ),
      condensationParameter: cycle.equilibriumCondensationParameter,
      fixedBuried: Object.fromEntries(
        ZONES.filter((zone) =>
          tuneCondensation || useAtmosphereReservoir || zone !== reservoirZone
        ).map((zone) => [zone, baselineBuried[zone]])
      )
    });
  }

  function setState() {
    terraforming.calculateInitialValues();
    for (const family of familyStates) {
      const cycle = window.eval(family.cycle);
      cycle.equilibriumCondensationParameter = family.condensationParameter;
      if (family.tuneCondensation || family.preserveSurfaceMass) {
        const assignedOutsideReservoir = ZONES.reduce(
          (total, zone) => zone === family.reservoirZone
            ? total
            : total + family.amountByZone[zone],
          0
        );
        const reservoirSurfaceAmount =
          family.targetSurfaceMass - assignedOutsideReservoir;
        if (reservoirSurfaceAmount < 0) {
          throw new Error(
            `${family.id} zonal allocation exceeds its exposed inventory.`
          );
        }
        family.amountByZone[family.reservoirZone] = reservoirSurfaceAmount;
      }
      if (family.useAtmosphereReservoir) {
        const assignedSurface = ZONES.reduce(
          (total, zone) => total + family.amountByZone[zone],
          0
        );
        family.atmosphericAmount = family.exchangeableMass - assignedSurface;
        const atmosphereRoundingTolerance = Math.max(1, family.totalMass * 1e-12);
        if (family.atmosphericAmount < -atmosphereRoundingTolerance) {
          throw new Error(
            `${family.id} phase roots exceed its total atmosphere and surface inventory.`
          );
        }
        family.atmosphericAmount = Math.max(0, family.atmosphericAmount);
      }
      resources.atmospheric[family.atmosphere].value = family.atmosphericAmount;
      for (const zone of ZONES) {
        const activePhase = family.phaseByZone[zone];
        terraforming.zonalSurface[zone][family.liquid] =
          activePhase === family.liquid ? family.amountByZone[zone] : 0;
        terraforming.zonalSurface[zone][family.solid] =
          activePhase === family.solid ? family.amountByZone[zone] : 0;
        if (
          family.tuneCondensation
          || family.useAtmosphereReservoir
          || zone !== family.reservoirZone
        ) {
          terraforming.zonalSurface[zone][family.buried] = family.fixedBuried[zone];
        }
      }
      if (family.tuneCondensation || family.useAtmosphereReservoir) {
        continue;
      }
      const assignedSurface = ZONES.reduce(
        (total, zone) => total + family.amountByZone[zone],
        0
      );
      const fixedBuriedTotal = Object.values(family.fixedBuried).reduce(
        (total, amount) => total + amount,
        0
      );
      const reservoirAmount =
        family.totalMass - family.atmosphericAmount - assignedSurface - fixedBuriedTotal;
      const inventoryRoundingTolerance = Math.max(1, family.totalMass * 1e-12);
      if (reservoirAmount < -inventoryRoundingTolerance) {
        throw new Error(
          `${family.id} phase roots exceed the world's total inventory by ${-reservoirAmount} tons.`
        );
      }
      terraforming.zonalSurface[family.reservoirZone][family.buried] =
        Math.max(0, reservoirAmount);
    }
    terraforming.synchronizeGlobalResources();
    terraforming._updateZonalCoverageCache();
    terraforming._updateAtmosphericPressureCache();
    terraforming.updateLuminosity();
    terraforming.updateSurfaceTemperature(0, { ignoreHeatCapacity: true });
  }

  function evaluate(family, zone) {
    setState();
    const phase = family.phaseByZone[zone];
    const before = terraforming.zonalSurface[zone][phase];
    terraforming.updateResources(STEP_MS, { refreshStandaloneRates: true });
    return (terraforming.zonalSurface[zone][phase] - before) * (1000 / STEP_MS);
  }

  function evaluateAtmosphere(family) {
    setState();
    terraforming.updateResources(STEP_MS, { refreshStandaloneRates: true });
    return netRate(resources.atmospheric[family.atmosphere]);
  }

  function evaluateSurfaceResource(resourceKey) {
    setState();
    terraforming.updateResources(STEP_MS, { refreshStandaloneRates: true });
    return netRate(resources.surface[resourceKey]);
  }

  function solve() {
    const coordinateTolerance = options.threshold / 10;
    const activateAtmosphereSolve = (family) => {
      family.solveAtmosphere = true;
      family.amountByZone = { ...family.baselineAmountByZone };
      family.atmosphericAmount = family.initialAtmosphericAmount;
    };
    const activateGlobalOnlySolve = (family) => {
      family.globalOnly = true;
      family.amountByZone = { ...family.baselineAmountByZone };
      family.atmosphericAmount = family.initialAtmosphericAmount;
    };
    const solveAtmosphereAmount = (family) => {
      const fixedBuriedTotal = Object.values(family.fixedBuried).reduce(
        (total, amount) => total + amount,
        0
      );
      const assignedSurface = ZONES.reduce(
        (total, zone) => total + family.amountByZone[zone],
        0
      );
      const maximumAtmosphere = Math.max(
        0,
        family.totalMass - fixedBuriedTotal - assignedSurface
      );
      family.atmosphericAmount = bisect(
        (candidate) => {
          family.atmosphericAmount = candidate;
          return evaluateAtmosphere(family);
        },
        0,
        maximumAtmosphere,
        coordinateTolerance
      );
    };
    const solveCoordinates = () => {
    for (let pass = 0; pass < options.passes; pass += 1) {
      for (const family of familyStates) {
        if (family.globalPhaseBalance) {
          try {
            const previousAtmosphere = family.atmosphericAmount;
            solveAtmosphereAmount(family);
            family.atmosphericAmount =
              (previousAtmosphere + family.atmosphericAmount) / 2;
            const solidZones = ZONES.filter(
              (zone) => family.phaseByZone[zone] === family.solid
            );
            if (solidZones.length === 0) {
              throw new Error('No seeded solid-phase zone is available.');
            }
            const solidZone = solidZones.reduce(
              (best, zone) =>
                family.amountByZone[zone] > family.amountByZone[best] ? zone : best,
              solidZones[0]
            );
            const fixedBuriedTotal = Object.values(family.fixedBuried).reduce(
              (total, amount) => total + amount,
              0
            );
            const otherSurface = ZONES.reduce(
              (total, zone) => zone === solidZone
                ? total
                : total + family.amountByZone[zone],
              0
            );
            const maximumSolid = Math.max(
              0,
              family.totalMass
                - fixedBuriedTotal
                - family.atmosphericAmount
                - otherSurface
            );
            const previousSolid = family.amountByZone[solidZone];
            const solvedSolid = bisect(
              (candidate) => {
                family.amountByZone[solidZone] = candidate;
                return evaluateSurfaceResource(family.solid);
              },
              0,
              maximumSolid,
              coordinateTolerance
            );
            family.amountByZone[solidZone] = (previousSolid + solvedSolid) / 2;
          } catch (error) {
            throw new Error(`${family.id}.global: ${error.message}`);
          }
          continue;
        }
        if (family.solveAtmosphere && !family.deferAtmosphereSolve) {
          try {
            solveAtmosphereAmount(family);
          } catch (error) {
            throw new Error(`${family.id}.atmosphere: ${error.message}`);
          }
        }
        if (family.globalOnly) {
          continue;
        }
        const solveZones = family.tuneCondensation || family.preserveSurfaceMass
          ? ZONES.filter((zone) => zone !== family.reservoirZone)
          : ZONES;
        for (const zone of solveZones) {
          const phase = family.phaseByZone[zone];
          const zoneArea = terraforming.celestialParameters.surfaceArea
            * terraforming.getZoneWeight(zone);
          const fixedBuriedTotal = Object.values(family.fixedBuried).reduce(
            (total, amount) => total + amount,
            0
          );
          const otherSurfaceTotal = ZONES.reduce(
            (total, otherZone) => otherZone === zone
              ? total
              : total + family.amountByZone[otherZone],
            0
          );
          const availableInventory = family.tuneCondensation
            ? Math.max(
              0,
              family.targetSurfaceMass - ZONES.reduce(
                (total, otherZone) => otherZone === zone || otherZone === family.reservoirZone
                  ? total
                  : total + family.amountByZone[otherZone],
                0
              )
            )
            : family.useAtmosphereReservoir
              ? Math.max(
                0,
                family.exchangeableMass - otherSurfaceTotal
              )
            : Math.max(
              0,
              family.totalMass
                - family.atmosphericAmount
                - fixedBuriedTotal
                - otherSurfaceTotal
            );
          const maximumAmount = Math.min(
            zoneArea / getCoverageScale(terraforming, phase),
            availableInventory
          );
          try {
            family.amountByZone[zone] = bisect(
              (candidate) => {
                family.amountByZone[zone] = candidate;
                return evaluate(family, zone);
              },
              0,
              maximumAmount,
              coordinateTolerance
            );
          } catch (error) {
            if (
              !family.tuneCondensation
              && !family.useAtmosphereReservoir
              && !family.solveAtmosphere
            ) {
              activateAtmosphereSolve(family);
              return solveCoordinates();
            }
            if (family.solveAtmosphere && !family.globalOnly) {
              activateGlobalOnlySolve(family);
              return solveCoordinates();
            }
            throw new Error(`${family.id}.${zone}.${phase}: ${error.message}`);
          }
        }
        if (family.solveAtmosphere) {
          try {
            solveAtmosphereAmount(family);
            family.deferAtmosphereSolve = false;
          } catch (error) {
            throw new Error(`${family.id}.atmosphere: ${error.message}`);
          }
        } else if (family.tuneCondensation) {
          try {
            family.condensationParameter = bisect(
              (candidate) => {
                family.condensationParameter = candidate;
                return evaluateAtmosphere(family);
              },
              1e-12,
              0.1,
              coordinateTolerance
            );
          } catch (error) {
            throw new Error(`${family.id}.condensation: ${error.message}`);
          }
        }
      }
    }
    };
    solveCoordinates();
    setState();
    terraforming.updateResources(STEP_MS, { refreshStandaloneRates: true });
    let globallyUnbalancedFamilies = familyStates.filter((family) =>
      family.useAtmosphereReservoir
      && Math.max(
        Math.abs(netRate(resources.surface[family.liquid])),
        Math.abs(netRate(resources.surface[family.solid]))
      ) >= options.threshold
    );
    const singlePhaseFamilies = globallyUnbalancedFamilies.filter((family) =>
      new Set(Object.values(family.phaseByZone)).size === 1
    );
    for (const family of singlePhaseFamilies) {
      const baselineSurfaceTotal = ZONES.reduce(
        (total, zone) => total + family.baselineAmountByZone[zone],
        0
      );
      const weights = Object.fromEntries(ZONES.map((zone) => [
        zone,
        baselineSurfaceTotal > 0
          ? family.baselineAmountByZone[zone] / baselineSurfaceTotal
          : 1 / ZONES.length
      ]));
      const solvedSurfaceTotal = bisect(
        (candidate) => {
          for (const zone of ZONES) {
            family.amountByZone[zone] = candidate * weights[zone];
          }
          return evaluateAtmosphere(family);
        },
        0,
        family.exchangeableMass,
        coordinateTolerance
      );
      for (const zone of ZONES) {
        family.amountByZone[zone] = solvedSurfaceTotal * weights[zone];
      }
    }
    if (singlePhaseFamilies.length > 0) {
      setState();
      terraforming.updateResources(STEP_MS, { refreshStandaloneRates: true });
      globallyUnbalancedFamilies = globallyUnbalancedFamilies.filter((family) =>
        Math.max(
          Math.abs(netRate(resources.surface[family.liquid])),
          Math.abs(netRate(resources.surface[family.solid]))
        ) >= options.threshold
      );
    }
    if (globallyUnbalancedFamilies.length > 0) {
      for (const family of globallyUnbalancedFamilies) {
        family.useAtmosphereReservoir = false;
        family.solveAtmosphere = true;
        family.deferAtmosphereSolve = true;
        family.globalOnly = false;
        family.amountByZone = { ...family.baselineAmountByZone };
        family.atmosphericAmount = family.initialAtmosphericAmount;
        family.fixedBuried = Object.fromEntries(
          ZONES.filter((zone) => zone !== family.reservoirZone)
            .map((zone) => [zone, family.baselineBuried[zone]])
        );
      }
      solveCoordinates();
      setState();
      terraforming.updateResources(STEP_MS, { refreshStandaloneRates: true });
      globallyUnbalancedFamilies = globallyUnbalancedFamilies.filter((family) =>
        Math.max(
          Math.abs(netRate(resources.surface[family.liquid])),
          Math.abs(netRate(resources.surface[family.solid]))
        ) >= options.threshold
      );
      if (globallyUnbalancedFamilies.length > 0) {
        for (const family of globallyUnbalancedFamilies) {
          family.globalOnly = true;
          family.deferAtmosphereSolve = false;
          family.amountByZone = { ...family.baselineAmountByZone };
          family.atmosphericAmount = family.initialAtmosphericAmount;
        }
        solveCoordinates();
        setState();
        terraforming.updateResources(STEP_MS, { refreshStandaloneRates: true });
        globallyUnbalancedFamilies = globallyUnbalancedFamilies.filter((family) =>
          Math.max(
            Math.abs(netRate(resources.surface[family.liquid])),
            Math.abs(netRate(resources.surface[family.solid]))
          ) >= options.threshold
        );
        if (globallyUnbalancedFamilies.length > 0) {
          const details = globallyUnbalancedFamilies.map((family) => (
            `${family.id} liquid=${netRate(resources.surface[family.liquid])}, `
            + `solid=${netRate(resources.surface[family.solid])}`
          )).join('; ');
          throw new Error(`Global buried-reservoir solve did not converge: ${details}.`);
        }
      }
    }
    setState();
    const solvedZonalSurface = structuredClone(terraforming.zonalSurface);
    const solvedTemperatures = Object.fromEntries(
      ZONES.map((zone) => [zone, {
        value: terraforming.temperature.zones[zone].value,
        day: terraforming.temperature.zones[zone].day,
        night: terraforming.temperature.zones[zone].night
      }])
    );
    terraforming.updateResources(STEP_MS, { refreshStandaloneRates: true });
    const oneStepRates = Object.fromEntries(
      familyStates.flatMap((family) => [family.liquid, family.solid])
        .filter((key, index, keys) => keys.indexOf(key) === index)
        .map((key) => [key, netRate(resources.surface[key])])
    );
    return {
      zonalSurface: solvedZonalSurface,
      zonalTemperatures: solvedTemperatures,
      families: familyStates.map((family) => family.id),
      phaseResourceKeys: Array.from(new Set(
        familyStates.flatMap((family) => [family.liquid, family.solid])
      )),
      condensationParameters: Object.fromEntries(
        familyStates
          .filter((family) => family.tuneCondensation)
          .map((family) => [family.id, family.condensationParameter])
      ),
      oneStepRates,
      atmosphericValues: Object.fromEntries(
        familyStates.map((family) => [family.atmosphere, family.atmosphericAmount])
      ),
      pressurePa: terraforming.atmosphericPressureCache.totalPressure
    };
  }

  return { solve };
}

async function verifyWrittenWorld(options, phaseResourceKeys) {
  const dom = await createGameDom({ trackEventListeners: false });
  const { window } = dom;
  try {
    selectWorld(window, options.planet);
    const maxima = Object.fromEntries(phaseResourceKeys.map((key) => [key, 0]));
    const pressureObservations = Object.fromEntries(
      Array.from(options.pressureRanges.keys())
        .map((family) => [family, { minimum: Infinity, maximum: -Infinity }])
    );
    const observePressures = () => {
      for (const [family, range] of options.pressureRanges) {
        const atmosphereKey = PHASE_FAMILIES.find((entry) => entry.id === family).atmosphere;
        const pressure =
          window.eval('terraforming').atmosphericPressureCache.pressureByKey[atmosphereKey] || 0;
        pressureObservations[family].minimum =
          Math.min(pressureObservations[family].minimum, pressure);
        pressureObservations[family].maximum =
          Math.max(pressureObservations[family].maximum, pressure);
        if (pressure < range.minimum || pressure > range.maximum) {
          throw new Error(
            `${family} partial pressure ${pressure} Pa left the required `
            + `${range.minimum}-${range.maximum} Pa range.`
          );
        }
      }
    };
    observePressures();
    for (let step = 0; step < options.verificationSteps; step += 1) {
      window.eval(`produceResources(${STEP_MS}, buildings)`);
      observePressures();
      for (const key of phaseResourceKeys) {
        maxima[key] = Math.max(maxima[key], Math.abs(netRate(window.resources.surface[key])));
      }
    }
    const failures = Object.entries(maxima)
      .filter(([, maximum]) => maximum >= options.verificationThreshold);
    return { maxima, failures, pressureObservations };
  } finally {
    window.close();
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const originalSource = fs.readFileSync(PLANET_PARAMETERS_PATH, 'utf8');
  const originalTerraformingSource = fs.readFileSync(TERRAFORMING_PARAMETERS_PATH, 'utf8');
  const dom = await createGameDom({ trackEventListeners: false });
  let solution;
  try {
    selectWorld(dom.window, options.planet);
    if (options.relaxationSteps > 0) {
      process.stdout.write(
        `Adaptively relaxing ${options.planet} for at most `
        + `${options.relaxationSteps} coarse-to-fine updates...\n`
      );
      const relaxation = await adaptivelyRelaxWorld(
        dom.window,
        options.relaxationSteps,
        options.threshold,
        options.relaxationRefinementChecks
      );
      process.stdout.write(
        `Adaptive relaxation completed after ${relaxation.steps} updates.\n`
      );
    }
    if (options.adaptiveOnly) {
      for (const family of options.adaptiveBalance) {
        balanceAdaptiveFamily(dom.window, family, options.threshold);
      }
      process.stdout.write(
        `Capturing adaptively equilibrated ${options.planet} state directly.\n`
      );
      solution = captureAdaptiveSolution(dom.window);
    } else {
      const solver = buildSolver(dom.window, options);
      process.stdout.write(`Solving ${options.planet} at exact ${STEP_MS} ms phase steps...\n`);
      solution = solver.solve();
    }
    process.stdout.write(
      `Solved coefficient(s): ${JSON.stringify(solution.condensationParameters)}\n`
      + `One-step rates: ${JSON.stringify(solution.oneStepRates)}\n`
    );
  } finally {
    dom.window.close();
  }

  const rewrittenSource = rewriteOverride(
    originalSource,
    options.planet,
    solution.zonalSurface,
    solution.zonalTemperatures,
    solution.atmosphericValues
  );
  fs.writeFileSync(PLANET_PARAMETERS_PATH, rewrittenSource);
  fs.writeFileSync(
    TERRAFORMING_PARAMETERS_PATH,
    rewriteCondensationParameters(
      originalTerraformingSource,
      solution.condensationParameters
    )
  );

  const phaseResourceKeys = solution.phaseResourceKeys;
  let verification;
  try {
    verification = await verifyWrittenWorld(options, phaseResourceKeys);
  } catch (error) {
    fs.writeFileSync(PLANET_PARAMETERS_PATH, originalSource);
    fs.writeFileSync(TERRAFORMING_PARAMETERS_PATH, originalTerraformingSource);
    throw error;
  }
  if (verification.failures.length > 0) {
    fs.writeFileSync(PLANET_PARAMETERS_PATH, originalSource);
    fs.writeFileSync(TERRAFORMING_PARAMETERS_PATH, originalTerraformingSource);
    const details = verification.failures
      .map(([key, maximum]) => `${key}=${maximum}`)
      .join(', ');
    throw new Error(
      `Verification exceeded ${options.verificationThreshold} t/s `
      + `(${details}); source edit was reverted.`
    );
  }

  process.stdout.write(
    `Updated ${path.relative(REPO_ROOT, PLANET_PARAMETERS_PATH)} for ${options.planet}.\n`
    + `Pressure: ${solution.pressurePa.toFixed(6)} Pa\n`
    + `Solved families: ${solution.families.join(', ') || 'none'}\n`
    + `Tuned condensation: ${JSON.stringify(solution.condensationParameters)}\n`
    + `Maximum absolute phase rates over ${options.verificationSteps} steps:\n`
  );
  for (const [key, maximum] of Object.entries(verification.maxima)) {
    process.stdout.write(`  ${key}: ${maximum} t/s\n`);
  }
  for (const [family, observation] of Object.entries(verification.pressureObservations)) {
    process.stdout.write(
      `  ${family} pressure: ${observation.minimum} to ${observation.maximum} Pa\n`
    );
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
