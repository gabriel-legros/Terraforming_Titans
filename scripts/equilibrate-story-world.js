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
const STEP_MS = 10;
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
    verificationSteps: 20000,
    threshold: 0.01,
    tuneCondensation: new Set(),
    pressureRanges: new Map()
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--planet') {
      options.planet = String(argv[++index] || '').toLowerCase();
    } else if (argument === '--passes') {
      options.passes = Number(argv[++index]);
    } else if (argument === '--steps') {
      options.verificationSteps = Number(argv[++index]);
    } else if (argument === '--threshold') {
      options.threshold = Number(argv[++index]);
    } else if (argument === '--tune-condensation') {
      const family = String(argv[++index] || '');
      if (!PHASE_FAMILIES.some((entry) => entry.id === family)) {
        throw new Error(`Unknown phase family for --tune-condensation: ${family}`);
      }
      options.tuneCondensation.add(family);
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
  if (!Number.isInteger(options.verificationSteps) || options.verificationSteps < 1) {
    throw new Error('--steps must be a positive integer.');
  }
  if (!(options.threshold > 0)) {
    throw new Error('--threshold must be greater than zero.');
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
    + '  --steps <count>      Exact 10 ms verification updates (default: 20000)\n'
    + '  --threshold <rate>   Maximum absolute phase rate in t/s (default: 0.01)\n'
    + '  --tune-condensation <family>\n'
    + '                       Preserve that family\'s exposed inventory and tune its global\n'
    + '                       condensation coefficient; repeat for multiple families\n'
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
  if (!zonalSurfaceProperty || !zonalTemperaturesProperty) {
    throw new Error(`World '${planet}' must define zonalSurface and zonalTemperatures in its override.`);
  }
  const replacements = [
    {
      start: zonalSurfaceProperty.value.start,
      end: zonalSurfaceProperty.value.end,
      text: formatReplacement(source, zonalSurfaceProperty, zonalSurface)
    },
    {
      start: zonalTemperaturesProperty.value.start,
      end: zonalTemperaturesProperty.value.end,
      text: formatReplacement(source, zonalTemperaturesProperty, zonalTemperatures)
    }
  ];
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
    const initialBuriedMass = ZONES.reduce(
      (total, zone) => total + (baselineSurface[zone][config.buried] || 0),
      0
    );
    const useAtmosphereReservoir = !tuneCondensation && initialBuriedMass === 0;
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
      solveAtmosphere: false,
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
      if (family.tuneCondensation) {
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
        if (family.solveAtmosphere) {
          try {
            solveAtmosphereAmount(family);
          } catch (error) {
            throw new Error(`${family.id}.atmosphere: ${error.message}`);
          }
        }
        if (family.globalOnly) {
          continue;
        }
        const solveZones = family.tuneCondensation
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
      window.eval('produceResources(10, buildings)');
      observePressures();
      for (const key of phaseResourceKeys) {
        maxima[key] = Math.max(maxima[key], Math.abs(netRate(window.resources.surface[key])));
      }
    }
    const failures = Object.entries(maxima)
      .filter(([, maximum]) => maximum >= options.threshold);
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
    const solver = buildSolver(dom.window, options);
    process.stdout.write(`Solving ${options.planet} at exact ${STEP_MS} ms phase steps...\n`);
    solution = solver.solve();
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
      `Verification exceeded ${options.threshold} t/s (${details}); source edit was reverted.`
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
