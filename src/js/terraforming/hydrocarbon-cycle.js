// Constants for Methane
const L_V_METHANE = 5.1e5; // Latent heat of vaporization for methane (J/kg)
const L_S_METHANE = 5.87e5; // Latent heat of sublimation for methane (J/kg)
const EVAP_ALBEDO_METHANE = 0.1; // Albedo of liquid methane for evaporation calculations
const SUBLIMATION_ALBEDO_HC_ICE = 0.6; // Albedo of hydrocarbon ice for sublimation calculations

const METHANE_T_TRIPLE = 90.694;          // K  (≈ 90.67 ± 0.03 K)
const METHANE_P_TRIPLE = 0.11696e6;       // Pa (≈ 0.1169 ± 0.0006 bar)
const METHANE_T_CRIT   = 190.564;         // K  (≈ 190.6 ± 0.3 K)
const METHANE_P_CRIT   = 4.5992e6;        // Pa (≈ 46.1 ± 0.3 bar)

const isNodeHydrocarbon = (typeof module !== 'undefined' && module.exports);
var psychrometricConstant = globalThis.psychrometricConstant;
var redistributePrecipitationFn = globalThis.redistributePrecipitation;
var ResourceCycleClass = globalThis.ResourceCycle;
var simulateSurfaceHydrocarbonFlow = globalThis.simulateSurfaceHydrocarbonFlow;
if (isNodeHydrocarbon) {
  try {
    ({ psychrometricConstant, redistributePrecipitation: redistributePrecipitationFn } = require('./phase-change-utils.js'));
    ResourceCycleClass = require('./resource-cycle.js');
    simulateSurfaceHydrocarbonFlow = require('./hydrology.js').simulateSurfaceHydrocarbonFlow;
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
if (!simulateSurfaceHydrocarbonFlow && typeof require === 'function') {
  try {
    simulateSurfaceHydrocarbonFlow = require('./hydrology.js').simulateSurfaceHydrocarbonFlow;
  } catch (e) {
    try {
      simulateSurfaceHydrocarbonFlow = require('./src/js/terraforming/hydrology.js').simulateSurfaceHydrocarbonFlow;
    } catch (e2) {
      // ignore
    }
  }
}

// Sublimation branch (solid CH4): Dykyj et al. (1999) as compiled in Titan materials DB
// log10(P[bar]) = 4.31972 - 451.64/(T - 4.66), valid ~48 K to 90.686 K
function psatMethaneSolid(T) {
  const log10Pbar = 4.31972 - 451.64 / (T - 4.66);
  return Math.pow(10, log10Pbar) * 1e5; // bar -> Pa
}

// Liquid-vapor branch (CH4(l) ↔ CH4(g)): NIST Antoine (Prydz & Goodwin)
// log10(P[bar]) = 3.9895 - 443.028/(T - 0.49), valid ~90.99 K to 189.99 K
function psatMethaneLiquid(T) {
  const log10Pbar = 3.9895 - 443.028 / (T - 0.49); // NIST uses T + C with C = -0.49
  return Math.pow(10, log10Pbar) * 1e5; // bar -> Pa
}

// Unified saturation vapor pressure (Pa)
function calculateSaturationPressureMethane(T) {
  if (!isFinite(T) || T <= 0) return 0;

  // For T >= Tc there is no two-phase envelope; clamp to Pc for numerical stability
  if (T >= METHANE_T_CRIT) return METHANE_P_CRIT;

  // Below triple point: only solid ↔ vapor is thermodynamically allowed
  if (T < METHANE_T_TRIPLE) {
    // Limit the solid correlation to its validated low end (~48 K); extrapolation below is tiny anyway
    const Tmin = 48.0;
    return psatMethaneSolid(Math.max(T, Tmin));
  }

  // Between triple and critical: use liquid-vapor branch
  return psatMethaneLiquid(T);
}

// Numerical derivative d(Psat)/dT (Pa/K) using central difference and the piecewise Psat above
function slopeSVPMethane(T) {
  const h = 0.01; // 0.01 K step gives a stable slope while keeping precision
  const T1 = Math.max(1, T - h);
  const T2 = T + h;

  // Avoid crossing the critical clamp in the stencil
  const p1 = calculateSaturationPressureMethane(T1);
  const p2 = calculateSaturationPressureMethane(T2);
  const dPdT = (p2 - p1) / (T2 - T1);

  // Guard against negatives from numerical noise
  return Number.isFinite(dPdT) ? Math.max(dPdT, 0) : 0;
}

class MethaneCycle extends ResourceCycleClass {
  constructor({
    key = 'methane',
    atmKey = 'atmosphericMethane',
    totalKeys = ['evaporation', 'sublimation', 'rapidSublimation', 'melt', 'freeze'],
    processTotalKeys = { rain: 'methaneRain', snow: 'methaneSnow' },
    transitionRange = 2,
    maxDiff = 10,
    boilingPointFn = boilingPointMethane,
    boilTransitionRange = 5,
    zonalKey = 'zonalHydrocarbons',
    surfaceBucket = 'methane',
    atmosphereKey = 'methane',
    availableKeys = ['liquid', 'ice', 'buriedIce'],
    gravity = 1,
    condensationParameter = 1,
  } = {}) {
    const coverageKeys = {
      liquid: 'liquidMethaneCoverage',
      ice: 'hydrocarbonIceCoverage',
    };
    const precipitationKeys = {
      liquid: 'potentialMethaneRain',
      solid: 'potentialMethaneSnow',
    };
    const finalizeProcesses = [
      {
        container: 'precipitation',
        potentialKey: 'potentialMethaneRain',
        precipitationKey: 'methaneRain',
        surfaceBucket: 'methane',
        surfaceKey: 'liquid',
        totalKey: 'methaneRain',
      },
      {
        container: 'precipitation',
        potentialKey: 'potentialMethaneSnow',
        precipitationKey: 'methaneSnow',
        surfaceBucket: 'methane',
        surfaceKey: 'ice',
        totalKey: 'methaneSnow',
      },
    ];
    const rateMappings = {
      evaporation: [
        { path: 'atmospheric.atmosphericMethane', label: 'Evaporation', sign: +1 },
        { path: 'surface.liquidMethane', label: 'Methane Evaporation', sign: -1 },
      ],
      sublimation: [
        { path: 'atmospheric.atmosphericMethane', label: 'Sublimation', sign: +1 },
        { path: 'surface.hydrocarbonIce', label: 'Methane Sublimation', sign: -1 },
      ],
      rapidSublimation: [
        { path: 'atmospheric.atmosphericMethane', label: 'Rapid Sublimation', sign: +1 },
        { path: 'surface.hydrocarbonIce', label: 'Rapid Sublimation', sign: -1 },
      ],
      // Prefer methane-specific precipitation keys collected from zonal changes
      methaneRain: [
        { path: 'atmospheric.atmosphericMethane', label: 'Rain', sign: -1 },
        { path: 'surface.liquidMethane', label: 'Methane Rain', sign: +1 },
      ],
      methaneSnow: [
        { path: 'atmospheric.atmosphericMethane', label: 'Snow', sign: -1 },
        { path: 'surface.hydrocarbonIce', label: 'Methane Snow', sign: +1 },
      ],
      // Also support generic keys if finalize fallback is used (no double count due to one path used)
      rain: [
        { path: 'atmospheric.atmosphericMethane', label: 'Rain', sign: -1 },
        { path: 'surface.liquidMethane', label: 'Methane Rain', sign: +1 },
      ],
      snow: [
        { path: 'atmospheric.atmosphericMethane', label: 'Snow', sign: -1 },
        { path: 'surface.hydrocarbonIce', label: 'Methane Snow', sign: +1 },
      ],
      melt: [
        { path: 'surface.liquidMethane', label: 'Melt', sign: +1 },
        { path: 'surface.hydrocarbonIce', label: 'Melt', sign: -1 },
      ],
      freeze: [
        { path: 'surface.liquidMethane', label: 'Freeze', sign: -1 },
        { path: 'surface.hydrocarbonIce', label: 'Freeze', sign: +1 },
      ],
      flowMelt: [
        { path: 'surface.liquidMethane', label: 'Flow Melt', sign: +1 },
        { path: 'surface.hydrocarbonIce', label: 'Flow Melt', sign: -1 },
      ],
    };
    const surfaceFlowFn = (terraforming, durationSeconds, tempMap) => {
      if (typeof simulateSurfaceHydrocarbonFlow === 'function'
        && typeof ZONES !== 'undefined'
        && terraforming && terraforming.zonalHydrocarbons) {
        const flow = simulateSurfaceHydrocarbonFlow(terraforming, durationSeconds, tempMap) || { changes: {}, totalMelt: 0 };
        const totalMelt = flow.totalMelt || 0;
        // Optional debug/display fields retained
        terraforming.flowMethaneMeltAmount = totalMelt;
        terraforming.flowMethaneMeltRate = durationSeconds > 0 ? totalMelt / durationSeconds * 86400 : 0;
        return {
          changes: flow.changes || {},
          // Only report flowMelt as a separate total; phase-change melt remains in 'melt'
          totals: { flowMelt: totalMelt },
        };
      }
      return { changes: {}, totals: { flowMelt: 0 } };
    };

    super({
      latentHeatVaporization: L_V_METHANE,
      latentHeatSublimation: L_S_METHANE,
      saturationVaporPressureFn: calculateSaturationPressureMethane,
      slopeSaturationVaporPressureFn: slopeSVPMethane,
      freezePoint: METHANE_T_TRIPLE,     // liquid cannot exist below T_triple
      sublimationPoint: METHANE_T_TRIPLE,
      evaporationAlbedo: EVAP_ALBEDO_METHANE,
      sublimationAlbedo: SUBLIMATION_ALBEDO_HC_ICE,
      tripleTemperature: METHANE_T_TRIPLE,
      triplePressure: METHANE_P_TRIPLE,
      disallowLiquidBelowTriple: true,
      coverageKeys,
      precipitationKeys,
      surfaceFlowFn,
      rateMappings,
      finalizeProcesses,
      rateTotalsPrefix: 'Methane',
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
      condensationParameter: terraforming.equilibriumMethaneCondensationParameter,
    };
  }

  /**
   * Extract methane-related coverage values for a zone from a cache object.
   */
  getCoverage(zone, cache = {}) {
    const data = cache[zone] || {};
    return {
      liquidMethaneCoverage: data.liquidMethane ?? 0,
      hydrocarbonIceCoverage: data.hydrocarbonIce ?? 0,
    };
  }

  redistributePrecipitation(terraforming, zonalChanges, zonalTemperatures) {
    if (typeof redistributePrecipitationFn === 'function') {
      redistributePrecipitationFn(terraforming, 'methane', zonalChanges, zonalTemperatures);
    }
  }

  updateResourceRates(terraforming, totals = {}, durationSeconds = 1) {
    super.updateResourceRates(terraforming, totals, durationSeconds);
    const rapid = terraforming.totalMethaneRapidSublimationRate || 0;
    terraforming.totalMethaneSublimationRate = (terraforming.totalMethaneSublimationRate || 0) + rapid;
  }

}

const methaneCycle = new MethaneCycle();

// Function to calculate psychrometric constant for methane
function psychrometricConstantMethane(atmPressure) {
  return psychrometricConstant(atmPressure, L_V_METHANE); // Pa/K
}

// Boiling point T(K) such that Psat(T) = atmPressure (Pa)
// Returns 0 if pressure is at or below P_triple (no liquid possible).
function boilingPointMethane(atmPressure) {
  if (!isFinite(atmPressure) || atmPressure <= METHANE_P_TRIPLE) return 0;
  if (atmPressure >= METHANE_P_CRIT) return METHANE_T_CRIT;

  // Bisection between T_triple and T_c
  let lo = METHANE_T_TRIPLE + 1e-6;
  let hi = METHANE_T_CRIT   - 1e-6;
  for (let i = 0; i < 60; i++) {
    const mid = 0.5 * (lo + hi);
    const p = calculateSaturationPressureMethane(mid);
    if (!isFinite(p)) break;
    if (p > atmPressure) hi = mid; else lo = mid;
  }
  return 0.5 * (lo + hi);
}

// Function to calculate evaporation rate for methane using the modified Penman equation
function evaporationRateMethane(T, solarFlux, atmPressure, e_a, r_a = 100) {
    return methaneCycle.evaporationRate({ T, solarFlux, atmPressure, vaporPressure: e_a, r_a });
}

// Function to calculate psychrometric constant for methane sublimation
function psychrometricConstantMethaneSublimation(atmPressure) {
  return psychrometricConstant(atmPressure, L_S_METHANE); // Pa/K
}

// Function to calculate sublimation rate for methane using the modified Penman equation
function sublimationRateMethane(T, solarFlux, atmPressure, e_a, r_a = 100) {
    return methaneCycle.sublimationRate({ T, solarFlux, atmPressure, vaporPressure: e_a, r_a });
}

function calculateMethaneEvaporationRate({
    zoneArea,
    liquidMethaneCoverage,
    dayTemperature,
    nightTemperature,
    methaneVaporPressure,
    avgAtmPressure,
    zonalSolarFlux
}) {
    if (zoneArea <= 0 || liquidMethaneCoverage <= 0) {
        return 0;
    }

    const liquidMethaneCoveredArea = zoneArea * liquidMethaneCoverage;
    const daySolarFlux = 2 * zonalSolarFlux;
    const nightSolarFlux = 0;

    let dayEvaporationRate = 0;
    if (typeof dayTemperature === 'number') {
        const rate = evaporationRateMethane(dayTemperature, daySolarFlux, avgAtmPressure, methaneVaporPressure, 100);
        dayEvaporationRate = rate * liquidMethaneCoveredArea / 1000;
    }

    let nightEvaporationRate = 0;
    if (typeof nightTemperature === 'number') {
        const rate = evaporationRateMethane(nightTemperature, nightSolarFlux, avgAtmPressure, methaneVaporPressure, 100);
        nightEvaporationRate = rate * liquidMethaneCoveredArea / 1000;
    }

    return (dayEvaporationRate + nightEvaporationRate) / 2;
}

function calculateMethaneSublimationRate({
    zoneArea,
    hydrocarbonIceCoverage,
    dayTemperature,
    nightTemperature,
    methaneVaporPressure,
    avgAtmPressure,
    zonalSolarFlux
}) {
    if (zoneArea <= 0 || hydrocarbonIceCoverage <= 0) {
        return 0;
    }

    const hydrocarbonIceCoveredArea = zoneArea * hydrocarbonIceCoverage;
    const daySolarFlux = 2 * zonalSolarFlux;
    const nightSolarFlux = 0;

    let daySublimationRate = 0;
    if (typeof dayTemperature === 'number') {
        const rate = sublimationRateMethane(dayTemperature, daySolarFlux, avgAtmPressure, methaneVaporPressure, 100);
        daySublimationRate = rate * hydrocarbonIceCoveredArea / 1000; // tons/s
    }

    let nightSublimationRate = 0;
    if (typeof nightTemperature === 'number') {
        const rate = sublimationRateMethane(nightTemperature, nightSolarFlux, avgAtmPressure, methaneVaporPressure, 100);
        nightSublimationRate = rate * hydrocarbonIceCoveredArea / 1000; // tons/s
    }

    return (daySublimationRate + nightSublimationRate) / 2;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MethaneCycle,
        methaneCycle,
        calculateSaturationPressureMethane,
        slopeSVPMethane,
        psychrometricConstantMethane,
        evaporationRateMethane,
        calculateMethaneEvaporationRate,
        sublimationRateMethane,
        calculateMethaneSublimationRate,
        boilingPointMethane,
        EVAP_ALBEDO_METHANE,
        SUBLIMATION_ALBEDO_HC_ICE
    };
} else {
    // Expose functions globally for browser usage
    globalThis.MethaneCycle = MethaneCycle;
    globalThis.methaneCycle = methaneCycle;
    globalThis.calculateSaturationPressureMethane = calculateSaturationPressureMethane;
    globalThis.slopeSVPMethane = slopeSVPMethane;
    globalThis.psychrometricConstantMethane = psychrometricConstantMethane;
    globalThis.evaporationRateMethane = evaporationRateMethane;
    globalThis.calculateMethaneEvaporationRate = calculateMethaneEvaporationRate;
    globalThis.sublimationRateMethane = sublimationRateMethane;
    globalThis.calculateMethaneSublimationRate = calculateMethaneSublimationRate;
    globalThis.boilingPointMethane = boilingPointMethane;
    globalThis.EVAP_ALBEDO_METHANE = EVAP_ALBEDO_METHANE;
    globalThis.SUBLIMATION_ALBEDO_HC_ICE = SUBLIMATION_ALBEDO_HC_ICE;
}
