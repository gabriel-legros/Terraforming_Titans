// Utility functions for atmospheric calculations

const isNodeAtmos = (typeof module !== 'undefined' && module.exports);

// Common molecular weights in g/mol
const MOLECULAR_WEIGHTS = {
  N2: 28.0134,
  O2: 31.9988,
  Ar: 39.948,
  CO2: 44.01,
  CH4: 16.04,
  H2: 2.016,
  He: 4.0026,
  H2O: 18.01528,
  SF6: 146.06,
  H2SO4: 98.079,
  CaCO3: 100.0869
};

const SPECIFIC_HEAT_CAPACITIES = {
  N2: 1040,
  O2: 918,
  Ar: 520,
  CO2: 844,
  CH4: 2220,
  H2: 14300,
  He: 5190,
  H2O: 1870,
  SF6: 658,
  H2SO4: 1400,
  CaCO3: 820
};

const MOLECULAR_WEIGHT_ALIASES = {
  carbondioxide: 'CO2',
  co2: 'CO2',
  oxygen: 'O2',
  o2: 'O2',
  inertgas: 'N2',
  nitrogen: 'N2',
  n2: 'N2',
  atmosphericwater: 'H2O',
  water: 'H2O',
  h2o: 'H2O',
  atmosphericmethane: 'CH4',
  methane: 'CH4',
  ch4: 'CH4',
  greenhousegas: 'SF6',
  sf6: 'SF6',
  sulfuricacid: 'H2SO4',
  h2so4: 'H2SO4',
  calciteaerosol: 'CaCO3',
  caco3: 'CaCO3',
  hydrogen: 'H2',
  h2: 'H2',
  helium: 'He',
  he: 'He',
  argon: 'Ar',
  ar: 'Ar'
};

const GRAMS_PER_TON = 1e6;
const TONS_TO_KG = 1e3;
const UNIVERSAL_GAS_CONSTANT = 8.314462618;


function normalizeNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function extractMassTons(entry) {
  if (entry === null || entry === undefined) {
    return 0;
  }
  if (typeof entry === 'number' || typeof entry === 'string') {
    const numeric = normalizeNumber(entry);
    return numeric !== null ? numeric : 0;
  }
  if (typeof entry === 'object') {
    const candidates = [entry.value, entry.amount, entry.initialValue];
    for (const candidate of candidates) {
      const numeric = normalizeNumber(candidate);
      if (numeric !== null) {
        return numeric;
      }
    }
  }
  return 0;
}

function resolveMolecularWeight(gasKey, weights) {
  if (!gasKey) {
    return undefined;
  }
  const direct = weights[gasKey];
  if (typeof direct === 'number' && Number.isFinite(direct)) {
    return direct;
  }

  const keyString = String(gasKey);
  const lower = keyString.toLowerCase();

  const lowerDirect = weights[lower];
  if (typeof lowerDirect === 'number' && Number.isFinite(lowerDirect)) {
    return lowerDirect;
  }

  const alias = MOLECULAR_WEIGHT_ALIASES[lower];
  if (alias) {
    const aliasWeight = weights[alias];
    if (typeof aliasWeight === 'number' && Number.isFinite(aliasWeight)) {
      return aliasWeight;
    }
  }

  for (const key in weights) {
    if (key.toLowerCase() === lower) {
      const weight = weights[key];
      if (typeof weight === 'number' && Number.isFinite(weight)) {
        return weight;
      }
    }
  }
  return undefined;
}

function resolveSpecificHeatCapacity(gasKey, capacities) {
  if (!gasKey) {
    return undefined;
  }
  const direct = capacities[gasKey];
  if (Number.isFinite(direct)) {
    return direct;
  }

  const keyString = String(gasKey);
  const lower = keyString.toLowerCase();

  const lowerDirect = capacities[lower];
  if (Number.isFinite(lowerDirect)) {
    return lowerDirect;
  }

  const alias = MOLECULAR_WEIGHT_ALIASES[lower];
  if (alias) {
    const aliasCapacity = capacities[alias];
    if (Number.isFinite(aliasCapacity)) {
      return aliasCapacity;
    }
  }

  for (const key in capacities) {
    if (key.toLowerCase() === lower) {
      const capacity = capacities[key];
      if (Number.isFinite(capacity)) {
        return capacity;
      }
    }
  }
  return undefined;
}

/**
 * Calculate mean molecular weight of an atmosphere from component masses.
 * @param {Object} composition - mapping of gas keys to mass amounts (tons).
 * @param {Object} [weights=MOLECULAR_WEIGHTS] - mapping of gas keys to molecular weights.
 * @returns {number} molecular weight in g/mol.
 */
function calculateMolecularWeight(composition, weights = MOLECULAR_WEIGHTS) {
  if (!composition || typeof composition !== 'object') {
    return 0;
  }
  let totalMass = 0;
  let totalMoles = 0;
  for (const gas in composition) {
    const massTons = extractMassTons(composition[gas]);
    if (!Number.isFinite(massTons) || massTons <= 0) {
      continue;
    }
    const weight = resolveMolecularWeight(gas, weights);
    if (typeof weight !== 'number' || !Number.isFinite(weight) || weight <= 0) {
      continue;
    }
    const massGrams = massTons * GRAMS_PER_TON;
    totalMass += massGrams;
    totalMoles += massGrams / weight;
  }
  if (totalMass <= 0 || totalMoles <= 0) {
    return 0;
  }
  return totalMass / totalMoles;
}

/**
 * Compute specific lift (density difference) between outside air and internal gas.
 * @param {number} pressurePa - ambient pressure in Pascals.
 * @param {number} temperatureK - ambient temperature in Kelvin.
 * @param {number} externalMolWeight - outside mean molecular weight in g/mol.
 * @param {number} [internalMolWeight=29] - internal gas molecular weight in g/mol.
 * @returns {number} specific lift in kg/m^3.
 */
function calculateSpecificLift(pressurePa, temperatureK, externalMolWeight, internalMolWeight = 29) {
  const R = 8.314; // J mol^-1 K^-1
  const mExt = externalMolWeight / 1000; // kg/mol
  const mIn = internalMolWeight / 1000; // kg/mol
  return (pressurePa / (R * temperatureK)) * (mExt - mIn);
}

/**
 * Approximate specific lift using p in bar and simplified constants.
 * @param {number} pressureBar - ambient pressure in bar.
 * @param {number} temperatureK - ambient temperature in Kelvin.
 * @param {number} externalMolWeight - outside mean molecular weight in g/mol.
 * @param {number} [internalMolWeight=29] - internal gas molecular weight in g/mol.
 * @returns {number} specific lift in kg/m^3.
 */
function approximateSpecificLift(pressureBar, temperatureK, externalMolWeight, internalMolWeight = 29) {
  const delta = externalMolWeight - internalMolWeight;
  return 0.0401 * pressureBar * (300 / temperatureK) * delta;
}

/**
 * Calculate the effective atmospheric heat capacity (J/m^2/K).
 * Implements C_atm,eff = (c_p * p_s / g) / (1 + kappa).
 * @param {Object} composition - mapping of gas keys to mass amounts (tons).
 * @param {number} surfacePressure - Surface pressure in Pascals.
 * @param {number} gravity - Surface gravity in m/s^2.
 * @param {Object} [options] - optional overrides for property calculation.
 * @returns {number} effective heat capacity in J/m^2/K.
 */
function calculateEffectiveAtmosphericHeatCapacity(composition, surfacePressure, gravity, options) {
  const properties = calculateAtmosphericHeatProperties(composition, options);
  const cp = Number.isFinite(properties.specificHeatCapacity) ? properties.specificHeatCapacity : 0;
  const ps = Number(surfacePressure);
  const g = Number(gravity);
  const lapseFactor = Number.isFinite(properties.kappa) ? properties.kappa : 0;

  const isoCapacity = cp > 0 && Number.isFinite(ps) && Number.isFinite(g) && g !== 0
    ? (cp * ps) / g
    : 0;

  const denominator = 1 + lapseFactor;
  return denominator !== 0 ? isoCapacity / denominator : 0;
}

/**
 * Derive bulk specific heat capacity and kappa from atmospheric composition.
 * @param {Object} composition - mapping of gas keys to mass amounts (tons).
 * @param {Object} [options] - optional overrides for data tables.
 * @param {Object} [options.heatCapacities=SPECIFIC_HEAT_CAPACITIES] - cp lookup in J/kg/K.
 * @param {Object} [options.molecularWeights=MOLECULAR_WEIGHTS] - molecular weight lookup in g/mol.
 * @returns {{ specificHeatCapacity: number, meanMolecularWeight: number, gasConstant: number, kappa: number }}
 */
function calculateAtmosphericHeatProperties(composition, options) {
  const settings = options || {};
  const heatCapacities = settings.heatCapacities || SPECIFIC_HEAT_CAPACITIES;
  const weights = settings.molecularWeights || MOLECULAR_WEIGHTS;
  const isObject = Object.prototype.toString.call(composition || '') === '[object Object]';
  if (!isObject) {
    return { specificHeatCapacity: 0, meanMolecularWeight: 0, gasConstant: 0, kappa: 0 };
  }

  let contributingMassKg = 0;
  let weightedCp = 0;
  for (const gas in composition) {
    const massTons = extractMassTons(composition[gas]);
    if (!Number.isFinite(massTons) || massTons <= 0) {
      continue;
    }
    const cp = resolveSpecificHeatCapacity(gas, heatCapacities);
    if (!Number.isFinite(cp) || cp <= 0) {
      continue;
    }
    const massKg = massTons * TONS_TO_KG;
    contributingMassKg += massKg;
    weightedCp += massKg * cp;
  }

  const specificHeatCapacity = contributingMassKg > 0 ? weightedCp / contributingMassKg : 0;
  const meanMolecularWeight = calculateMolecularWeight(composition, weights);
  const gasConstant = meanMolecularWeight > 0 ? (UNIVERSAL_GAS_CONSTANT * 1000) / meanMolecularWeight : 0;
  const kappa = specificHeatCapacity > 0 ? gasConstant / specificHeatCapacity : 0;

  return { specificHeatCapacity, meanMolecularWeight, gasConstant, kappa };
}

if (!isNodeAtmos) {
  globalThis.MOLECULAR_WEIGHTS = MOLECULAR_WEIGHTS;
  globalThis.SPECIFIC_HEAT_CAPACITIES = SPECIFIC_HEAT_CAPACITIES;
  globalThis.calculateMolecularWeight = calculateMolecularWeight;
  globalThis.calculateSpecificLift = calculateSpecificLift;
  globalThis.approximateSpecificLift = approximateSpecificLift;
  globalThis.calculateEffectiveAtmosphericHeatCapacity = calculateEffectiveAtmosphericHeatCapacity;
  globalThis.calculateAtmosphericHeatProperties = calculateAtmosphericHeatProperties;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MOLECULAR_WEIGHTS,
    SPECIFIC_HEAT_CAPACITIES,
    calculateMolecularWeight,
    calculateSpecificLift,
    approximateSpecificLift,
    calculateEffectiveAtmosphericHeatCapacity,
    calculateAtmosphericHeatProperties
  };
}

