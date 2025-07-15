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

// Generic helper for melting/freezing calculations used by hydrology
function meltingFreezingRates({
  temperature,
  freezingPoint,
  availableIce = 0,
  availableLiquid = 0,
  availableBuriedIce = 0,
  zoneArea = 1,
  coverageFn
}) {
  const meltingRateMultiplier = 0.000001; // per K per second
  const freezingRateMultiplier = 0.000001; // per K per second

  let meltingRate = 0;
  let freezingRate = 0;

  if (temperature > freezingPoint) {
    const diff = temperature - freezingPoint;

    let surfaceIceCoverage = 1;
    if (coverageFn) {
      surfaceIceCoverage = coverageFn();
    }
    const surfaceMeltCap = zoneArea * surfaceIceCoverage * 0.1;
    const cappedSurfaceIce = Math.min(availableIce || 0, surfaceMeltCap);
    const surfaceMeltRate = cappedSurfaceIce * meltingRateMultiplier * diff;

    const buriedIceCoverage = 1;
    const buriedMeltCap = zoneArea * buriedIceCoverage * 0.1;
    const cappedBuriedIce = Math.min(availableBuriedIce || 0, buriedMeltCap);
    const potentialBuriedMeltRate = cappedBuriedIce * meltingRateMultiplier * diff * 0.1;

    let actualBuriedMeltRate = 0;
    if (potentialBuriedMeltRate > surfaceMeltRate) {
      actualBuriedMeltRate = potentialBuriedMeltRate - surfaceMeltRate;
    }

    meltingRate = surfaceMeltRate + actualBuriedMeltRate;
  } else if (temperature < freezingPoint && availableLiquid > 0) {
    const diff = freezingPoint - temperature;
    freezingRate = availableLiquid * freezingRateMultiplier * diff;
  }

  return { meltingRate, freezingRate };
}

if (isNodePCU) {
  module.exports = { psychrometricConstant, penmanRate, meltingFreezingRates };
} else {
  globalThis.psychrometricConstant = psychrometricConstant;
  globalThis.penmanRate = penmanRate;
  globalThis.meltingFreezingRates = meltingFreezingRates;
}
