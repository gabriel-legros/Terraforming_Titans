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
  H2O: 18.01528
};

/**
 * Calculate mean molecular weight of an atmosphere from component fractions.
 * @param {Object} composition - mapping of gas keys to mole fractions (summing to 1).
 * @param {Object} [weights=MOLECULAR_WEIGHTS] - mapping of gas keys to molecular weights.
 * @returns {number} molecular weight in g/mol.
 */
function calculateMolecularWeight(composition, weights = MOLECULAR_WEIGHTS) {
  let total = 0;
  let fractionSum = 0;
  for (const gas in composition) {
    const fraction = composition[gas] ?? 0;
    const weight = weights[gas];
    if (typeof weight === 'number') {
      total += fraction * weight;
      fractionSum += fraction;
    }
  }
  return fractionSum > 0 ? total / fractionSum : 0;
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

if (!isNodeAtmos) {
  globalThis.MOLECULAR_WEIGHTS = MOLECULAR_WEIGHTS;
  globalThis.calculateMolecularWeight = calculateMolecularWeight;
  globalThis.calculateSpecificLift = calculateSpecificLift;
  globalThis.approximateSpecificLift = approximateSpecificLift;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MOLECULAR_WEIGHTS,
    calculateMolecularWeight,
    calculateSpecificLift,
    approximateSpecificLift
  };
}

