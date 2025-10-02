// dry-ice-cycle.js — CO₂ (carbon dioxide) phase-change cycle, following hydrocarbon-cycle.js

// ---- Thermophysical constants for CO₂ ----
// Latent heats (approximate, near the triple-point; J/kg)
const L_V_CO2 = 3.75e5;   // latent heat of vaporization (≈ 16.7 kJ/mol / 44 g/mol)
const L_S_CO2 = 5.90e5;   // latent heat of sublimation (≈ 26.0 kJ/mol / 44 g/mol)

// Simple albedo choices for Penman-style surface energy (tweak in your parameters module if needed)
const EVAP_ALBEDO_CO2_LIQ = 0.10; // albedo of liquid CO2 (assumed)
const SUBLIMATION_ALBEDO_CO2_ICE = 0.50; // albedo of dry ice (assumed)

// Triple & critical points (NIST / literature)
const CO2_T_TRIPLE = 216.58;      // K
const CO2_P_TRIPLE = 5.185e5;     // Pa (5.185 bar)
const CO2_T_CRIT   = 304.1282;    // K
const CO2_P_CRIT   = 7.3773e6;    // Pa (73.773 bar)

const isNodeCO2 = (typeof module !== 'undefined' && module.exports);
var psychrometricConstant = globalThis.psychrometricConstant;
var redistributePrecipitationFn = globalThis.redistributePrecipitation;
var ResourceCycleClass = globalThis.ResourceCycle;
// Optional: surface flow for CO₂ (often negligible); keep null unless you have a dedicated model
var simulateSurfaceCO2Flow = globalThis.simulateSurfaceCO2Flow;

if (isNodeCO2) {
  try {
    ({ psychrometricConstant, redistributePrecipitation: redistributePrecipitationFn } = require('./phase-change-utils.js'));
    ResourceCycleClass = require('./resource-cycle.js');
    try {
      // Provide flow if you have one; otherwise this will remain undefined.
      simulateSurfaceCO2Flow = require('./hydrology.js').simulateSurfaceCO2Flow;
    } catch (e) { /* optional */ }
  } catch (e) {
    // fall back to globals if require fails
  }
}
if (!ResourceCycleClass && typeof require === 'function') {
  try {
    ResourceCycleClass = require('./resource-cycle.js');
  } catch (e) {
    try {
      ResourceCycleClass = require('./src/js/terraforming/resource-cycle.js');
    } catch (e2) {
      // ignore
    }
  }
}

// -----------------------------------------------------------------------------
// Saturation vapor pressure correlations for CO₂
//  • Solid–gas (sublimation) branch: Meyers & Van Dusen (1933), Eq. (9).
//    log10(p_bar) = 6.92804 − (1/T) * [ 1347.00 − 1.167e−12 * (T^2 − 35450)^3 ]
//    Valid roughly from ~130 K up to the triple point.
//  • Liquid–gas branch: Meyers & Van Dusen (1933), Eq. (6).
//    log10(p_bar) = a − (1/T) * { b − m*y*(10^(n*y^2) − 1) }, where
//    a=4.674193, b=855.352, m=1.131e−4, n=4.7e−10, y = T^2 − θ1^2, θ1^2 = 69700.
//    Valid from the triple point to just below the critical point.
//  • For T >= Tc, clamp to Pc for numerical stability.
//  • Returns pressure in Pa.
// -----------------------------------------------------------------------------
function psatCO2Solid(T) {
  const term = 1347.00 - 1.167e-12 * Math.pow(T*T - 35450.0, 3);
  const log10Pbar = 6.92804 - (term / T);
  return Math.pow(10, log10Pbar) * 1e5; // bar -> Pa
}
function psatCO2Liquid(T) {
  const a = 4.674193;
  const b = 855.352;
  const m = 1.131e-4;
  const n = 4.7e-10;
  const y = T*T - 69700.0;
  const log10Pbar = a - (1.0/T)*(b - m*y*(Math.pow(10, n*(y*y)) - 1.0));
  return Math.pow(10, log10Pbar) * 1e5; // bar -> Pa
}
function calculateSaturationPressureCO2(T) {
  if (!isFinite(T) || T <= 0) return 0;
  if (T >= CO2_T_CRIT) return CO2_P_CRIT;       // clamp above critical
  if (T < CO2_T_TRIPLE) return psatCO2Solid(T); // solid branch
  return psatCO2Liquid(T);                      // liquid branch
}

// Precompute saturation vapor pressure slope at the critical point (Pa/K)
const CRITICAL_SVP_SLOPE_CO2 = (() => {
  const h = 0.01;
  const p1 = psatCO2Liquid(CO2_T_CRIT - h);
  const p2 = psatCO2Liquid(CO2_T_CRIT);
  const slope = (p2 - p1) / h;
  return Number.isFinite(slope) ? Math.max(slope, 0) : 0;
})();
// Numerical slope dPsat/dT (Pa/K)
function slopeSVPCO2(T) {
  const h = 0.01;
  if (T >= CO2_T_CRIT) return CRITICAL_SVP_SLOPE_CO2;
  const T1 = Math.max(1, T - h);
  const T2 = T + h;
  const p1 = calculateSaturationPressureCO2(T1);
  const p2 = calculateSaturationPressureCO2(T2);
  const dPdT = (p2 - p1) / (T2 - T1);
  return Number.isFinite(dPdT) ? Math.max(dPdT, 0) : 0;
}

// -----------------------------------------------------------------------------
// CO₂ cycle implementation (dry ice ↔ liquid CO₂ ↔ gaseous CO₂)
// -----------------------------------------------------------------------------
class CO2Cycle extends ResourceCycleClass {
  constructor({
    key = 'co2',
    atmKey = 'carbonDioxide', // atmospheric resource key
    totalKeys = ['evaporation', 'sublimation', 'rapidSublimation', 'melt', 'freeze'],
    processTotalKeys = { rain: 'co2Rain', snow: 'co2Snow' },
    transitionRange = 2,
    maxDiff = 10,
    boilingPointFn = boilingPointCO2,
    boilTransitionRange = 5,
    zonalKey = 'zonalCO2',
    surfaceBucket = 'co2',
    atmosphereKey = 'co2',
    availableKeys = ['liquid', 'ice', 'buriedIce'],
    gravity = 1,
    condensationParameter = 1,
  } = {}) {
    const coverageKeys = {
      liquid: 'liquidCO2Coverage',
      ice: 'dryIceCoverage',
    };
    const precipitationKeys = {
      liquid: 'potentialCO2Rain',
      solid: 'potentialCO2Snow',
    };
    const finalizeProcesses = [
      {
        container: 'precipitation',
        potentialKey: 'potentialCO2Rain',
        precipitationKey: 'co2Rain',
        surfaceBucket: 'co2',
        surfaceKey: 'liquid',
        totalKey: 'co2Rain',
      },
      {
        container: 'precipitation',
        potentialKey: 'potentialCO2Snow',
        precipitationKey: 'co2Snow',
        surfaceBucket: 'co2',
        surfaceKey: 'ice',
        totalKey: 'co2Snow',
      },
    ];
    const rateMappings = {
      evaporation: [
        { path: 'atmospheric.carbonDioxide', label: 'Evaporation', sign: +1 },
        { path: 'surface.liquidCO2',         label: 'CO2 Evaporation', sign: -1 },
      ],
      sublimation: [
        { path: 'atmospheric.carbonDioxide', label: 'Sublimation', sign: +1 },
        { path: 'surface.dryIce',            label: 'CO2 Sublimation', sign: -1 },
      ],
      rapidSublimation: [
        { path: 'atmospheric.carbonDioxide', label: 'Rapid Sublimation', sign: +1 },
        { path: 'surface.dryIce',            label: 'Rapid Sublimation', sign: -1 },
      ],
      // Prefer CO2-specific precipitation keys collected from zonal changes
      co2Rain: [
        { path: 'atmospheric.carbonDioxide', label: 'Rain', sign: -1 },
        { path: 'surface.liquidCO2',         label: 'CO2 Rain', sign: +1 },
      ],
      co2Snow: [
        { path: 'atmospheric.carbonDioxide', label: 'Snow', sign: -1 },
        { path: 'surface.dryIce',            label: 'CO2 Snow', sign: +1 },
      ],
      // Also support generic keys if finalize fallback is used
      rain: [
        { path: 'atmospheric.carbonDioxide', label: 'Rain', sign: -1 },
        { path: 'surface.liquidCO2',         label: 'CO2 Rain', sign: +1 },
      ],
      snow: [
        { path: 'atmospheric.carbonDioxide', label: 'Snow', sign: -1 },
        { path: 'surface.dryIce',            label: 'CO2 Snow', sign: +1 },
      ],
      melt: [
        { path: 'surface.liquidCO2', label: 'Melt', sign: +1 },
        { path: 'surface.dryIce',    label: 'Melt', sign: -1 },
      ],
      freeze: [
        { path: 'surface.liquidCO2', label: 'Freeze', sign: -1 },
        { path: 'surface.dryIce',    label: 'Freeze', sign: +1 },
      ],
      flowMelt: [
        { path: 'surface.liquidCO2', label: 'Flow Melt', sign: +1 },
        { path: 'surface.dryIce',    label: 'Flow Melt', sign: -1 },
      ],
    };

    const surfaceFlowFn = (terraforming, durationSeconds, tempMap) => {
      // Provide hook if a CO2 surface flow routine exists.
      if (typeof simulateSurfaceCO2Flow === 'function'
          && typeof ZONES !== 'undefined'
          && terraforming && terraforming.zonalCO2) {
        const flow = simulateSurfaceCO2Flow(terraforming, durationSeconds, tempMap) || { changes: {}, totalMelt: 0 };
        const totalMelt = flow.totalMelt || 0;
        terraforming.flowCO2MeltAmount = totalMelt;
        terraforming.flowCO2MeltRate = durationSeconds > 0 ? totalMelt / durationSeconds * 86400 : 0;
        return {
          changes: flow.changes || {},
          totals: { flowMelt: totalMelt },
        };
      }
      return { changes: {}, totals: { flowMelt: 0 } };
    };

    super({
      latentHeatVaporization: L_V_CO2,
      latentHeatSublimation: L_S_CO2,
      saturationVaporPressureFn: calculateSaturationPressureCO2,
      slopeSaturationVaporPressureFn: slopeSVPCO2,
      freezePoint: CO2_T_TRIPLE,     // liquid cannot exist below the triple point if P < P_triple
      sublimationPoint: CO2_T_TRIPLE,
      evaporationAlbedo: EVAP_ALBEDO_CO2_LIQ,
      sublimationAlbedo: SUBLIMATION_ALBEDO_CO2_ICE,
      tripleTemperature: CO2_T_TRIPLE,
      triplePressure: CO2_P_TRIPLE,
      disallowLiquidBelowTriple: true,
      criticalTemperature: CO2_T_CRIT,
      coverageKeys,
      precipitationKeys,
      surfaceFlowFn,
      rateMappings,
      finalizeProcesses,
      rateTotalsPrefix: 'CO2',
    });
    this.key = key;
    this.atmKey = atmKey;
    this.totalKeys = totalKeys;
    this.processTotalKeys = processTotalKeys;
    this.transitionRange = transitionRange;
    this.maxDiff = maxDiff;
    this.boilingPointFn = boilingPointFn;
    this.boilTransitionRange = boilTransitionRange;
    this.zonalKey = zonalKey;
    this.surfaceBucket = surfaceBucket;
    this.atmosphereKey = atmosphereKey;
    this.availableKeys = availableKeys;
    this.defaultExtraParams = { gravity, condensationParameter };
  }

  getExtraParams(terraforming) {
    return {
      gravity: terraforming.celestialParameters.gravity,
      condensationParameter: terraforming.equilibriumCO2CondensationParameter,
    };
  }

  /**
   * Extract CO₂-related fractional coverage values for a zone from a cache object.
   * Expects terraforming.zonalCoverageCache[zone] to include keys: liquidCO2, dryIce
   */
  getCoverage(zone, cache = {}) {
    const data = cache[zone] || {};
    return {
      liquidCO2Coverage: data.liquidCO2 ?? 0,
      dryIceCoverage: data.dryIce ?? 0,
    };
  }

  redistributePrecipitation(terraforming, zonalChanges, zonalTemperatures) {
    if (typeof redistributePrecipitationFn === 'function') {
      redistributePrecipitationFn(terraforming, 'co2', zonalChanges, zonalTemperatures);
    }
  }

  updateResourceRates(terraforming, totals = {}, durationSeconds = 1) {
    super.updateResourceRates(terraforming, totals, durationSeconds);
    const rapid = terraforming.totalCO2RapidSublimationRate || 0;
    terraforming.totalCO2SublimationRate = (terraforming.totalCO2SublimationRate || 0) + rapid;
  }
}

const co2Cycle = new CO2Cycle();

// Psychrometric constants specialized to CO₂ latent heats
function psychrometricConstantCO2(atmPressure) {
  return psychrometricConstant(atmPressure, L_V_CO2); // Pa/K
}
function psychrometricConstantCO2Sublimation(atmPressure) {
  return psychrometricConstant(atmPressure, L_S_CO2); // Pa/K
}

// Boiling point T(K) such that Psat(T) = atmPressure (Pa); returns 0 if P <= P_triple
function boilingPointCO2(atmPressure) {
  if (!isFinite(atmPressure) || atmPressure <= CO2_P_TRIPLE) return 0;
  if (atmPressure >= CO2_P_CRIT) return CO2_T_CRIT;
  let lo = CO2_T_TRIPLE + 1e-6;
  let hi = CO2_T_CRIT   - 1e-6;
  for (let i = 0; i < 60; i++) {
    const mid = 0.5 * (lo + hi);
    const p = calculateSaturationPressureCO2(mid);
    if (!isFinite(p)) break;
    if (p > atmPressure) hi = mid; else lo = mid;
  }
  return 0.5 * (lo + hi);
}

// Rates via ResourceCycle helpers (Penman-based)
function evaporationRateCO2(T, solarFlux, atmPressure, e_a, r_a = 100) {
  return co2Cycle.evaporationRate({ T, solarFlux, atmPressure, vaporPressure: e_a, r_a });
}
function sublimationRateCO2(T, solarFlux, atmPressure, e_a, r_a = 100) {
  return co2Cycle.sublimationRate({ T, solarFlux, atmPressure, vaporPressure: e_a, r_a });
}

// Convenience zonal calculators (tons/s) mirroring hydrocarbon-cycle.js
function calculateCO2EvaporationRate({
  zoneArea,
  liquidCO2Coverage,
  dayTemperature,
  nightTemperature,
  co2VaporPressure,
  avgAtmPressure,
  zonalSolarFlux
}) {
  if (zoneArea <= 0 || liquidCO2Coverage <= 0) return 0;
  const area = zoneArea * liquidCO2Coverage;
  const daySolarFlux = 2 * zonalSolarFlux;
  const nightSolarFlux = 0;

  let dayEvaporationRate = 0;
  if (typeof dayTemperature === 'number') {
    const rate = evaporationRateCO2(dayTemperature, daySolarFlux, avgAtmPressure, co2VaporPressure, 100);
    dayEvaporationRate = rate * area / 1000; // tons/s
  }
  let nightEvaporationRate = 0;
  if (typeof nightTemperature === 'number') {
    const rate = evaporationRateCO2(nightTemperature, nightSolarFlux, avgAtmPressure, co2VaporPressure, 100);
    nightEvaporationRate = rate * area / 1000; // tons/s
  }
  return (dayEvaporationRate + nightEvaporationRate) / 2;
}

function calculateCO2SublimationRate({
  zoneArea,
  dryIceCoverage,
  dayTemperature,
  nightTemperature,
  co2VaporPressure,
  avgAtmPressure,
  zonalSolarFlux
}) {
  if (zoneArea <= 0 || dryIceCoverage <= 0) return 0;
  const area = zoneArea * dryIceCoverage;
  const daySolarFlux = 2 * zonalSolarFlux;
  const nightSolarFlux = 0;

  let daySublimationRate = 0;
  if (typeof dayTemperature === 'number') {
    const rate = sublimationRateCO2(dayTemperature, daySolarFlux, avgAtmPressure, co2VaporPressure, 100);
    daySublimationRate = rate * area / 1000; // tons/s
  }
  let nightSublimationRate = 0;
  if (typeof nightTemperature === 'number') {
    const rate = sublimationRateCO2(nightTemperature, nightSolarFlux, avgAtmPressure, co2VaporPressure, 100);
    nightSublimationRate = rate * area / 1000; // tons/s
  }
  return (daySublimationRate + nightSublimationRate) / 2;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CO2Cycle,
    co2Cycle,
    calculateSaturationPressureCO2,
    slopeSVPCO2,
    psychrometricConstantCO2,
    evaporationRateCO2,
    calculateCO2EvaporationRate,
    sublimationRateCO2,
    calculateCO2SublimationRate,
    boilingPointCO2,
    EVAP_ALBEDO_CO2_LIQ,
    SUBLIMATION_ALBEDO_CO2_ICE,
    psatCO2Solid,
    psatCO2Liquid,
    CO2_T_TRIPLE,
    CO2_P_TRIPLE,
    CO2_T_CRIT,
    CO2_P_CRIT,
  };
} else {
  // Browser globals
  globalThis.CO2Cycle = CO2Cycle;
  globalThis.co2Cycle = co2Cycle;
  globalThis.calculateSaturationPressureCO2 = calculateSaturationPressureCO2;
  globalThis.slopeSVPCO2 = slopeSVPCO2;
  globalThis.psychrometricConstantCO2 = psychrometricConstantCO2;
  globalThis.evaporationRateCO2 = evaporationRateCO2;
  globalThis.calculateCO2EvaporationRate = calculateCO2EvaporationRate;
  globalThis.sublimationRateCO2 = sublimationRateCO2;
  globalThis.calculateCO2SublimationRate = calculateCO2SublimationRate;
  globalThis.boilingPointCO2 = boilingPointCO2;
  globalThis.EVAP_ALBEDO_CO2_LIQ = EVAP_ALBEDO_CO2_LIQ;
  globalThis.SUBLIMATION_ALBEDO_CO2_ICE = SUBLIMATION_ALBEDO_CO2_ICE;
  globalThis.psatCO2Solid = psatCO2Solid;
  globalThis.psatCO2Liquid = psatCO2Liquid;
  globalThis.CO2_T_TRIPLE = CO2_T_TRIPLE;
  globalThis.CO2_P_TRIPLE = CO2_P_TRIPLE;
  globalThis.CO2_T_CRIT = CO2_T_CRIT;
  globalThis.CO2_P_CRIT = CO2_P_CRIT;
}
