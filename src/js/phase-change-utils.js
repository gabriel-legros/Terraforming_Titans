// Utility functions for phase change calculations

const isNodePCU = (typeof module !== 'undefined' && module.exports);
var airDensityFn;
if (isNodePCU) {
  airDensityFn = require('./physics.js').airDensity;
} else {
  airDensityFn = globalThis.airDensity;
}

function psychrometricConstant(atmPressure, latentHeat) {
  return (C_P_AIR * atmPressure) / (EPSILON * latentHeat);
}

function penmanRate({ T, solarFlux, atmPressure, e_a, latentHeat, albedo = 0.6, r_a = 100, Delta_s, e_s }) {
  if (typeof Delta_s !== 'number' || typeof e_s !== 'number') {
    throw new Error('penmanRate requires Delta_s and e_s');
  }
  const R_n = (1 - albedo) * solarFlux;
  const gamma_s = psychrometricConstant(atmPressure, latentHeat);
  const rho_a_val = airDensityFn(atmPressure, T);

  const numerator = (Delta_s * R_n) + (rho_a_val * C_P_AIR * (e_s - e_a) / r_a);
  const denominator = (Delta_s + gamma_s) * latentHeat;
  const rate = numerator / denominator;
  return Math.max(0, rate);
}

if (isNodePCU) {
  module.exports = { psychrometricConstant, penmanRate };
} else {
  globalThis.psychrometricConstant = psychrometricConstant;
  globalThis.penmanRate = penmanRate;
}
