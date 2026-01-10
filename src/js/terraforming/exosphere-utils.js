const EXOSPHERE_KB = 1.380649e-23; // Boltzmann constant [J/K]
const AVOGADRO = 6.02214076e23; // mol^-1
const EXOSPHERE_COLLISION_SIGMA = 2e-19; // m^2

function estimateExosphereHeightMeters(params = {}) {
  const totalMassKg = params.totalMassKg || 0;
  const meanMolecularWeightGmol = params.meanMolecularWeightGmol || 0;
  const temperatureK = params.temperatureK || 0;
  const gravity = params.gravity || 0;
  const surfaceAreaM2 = params.surfaceAreaM2 || 0;
  const collisionSigmaM2 = params.collisionSigmaM2 || EXOSPHERE_COLLISION_SIGMA;

  if (totalMassKg <= 0 || meanMolecularWeightGmol <= 0) return 0;
  if (temperatureK <= 0 || gravity <= 0 || surfaceAreaM2 <= 0 || collisionSigmaM2 <= 0) return 0;

  const particleMassKg = (meanMolecularWeightGmol / 1000) / AVOGADRO;
  const H0 = (EXOSPHERE_KB * temperatureK) / (particleMassKg * gravity);
  const columnNumber = totalMassKg / (surfaceAreaM2 * particleMassKg);
  const logTerm = columnNumber * collisionSigmaM2;
  return logTerm > 1 ? H0 * Math.log(logTerm) : 0;
}

let isNodeExosphere = false;
try {
  isNodeExosphere = module && module.exports;
} catch (error) {
  isNodeExosphere = false;
}

if (isNodeExosphere) {
  module.exports = {
    estimateExosphereHeightMeters,
    EXOSPHERE_COLLISION_SIGMA
  };
} else {
  window.estimateExosphereHeightMeters = estimateExosphereHeightMeters;
  window.EXOSPHERE_COLLISION_SIGMA = EXOSPHERE_COLLISION_SIGMA;
}
