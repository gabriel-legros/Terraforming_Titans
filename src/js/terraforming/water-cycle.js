const L_S_WATER = 2.83e6; // Latent heat of sublimation for water (J/kg)
const L_V_WATER = 2.45e6; // Latent heat of vaporization for water (J/kg)
const EVAP_ALBEDO_WATER = 0.06; // Representative albedo for liquid water
const SUBLIMATION_ALBEDO_ICE = 0.6; // Representative albedo for ice// --- Triple point (water) ---
const WATER_TRIPLE_T = 273.16;      // K
const WATER_TRIPLE_P = 611.657;     // Pa  (NIST) 
const WATER_CRITICAL_T = 647.096;   // K  (approximate critical temperature)

const isNodeWaterCycle = (typeof module !== 'undefined' && module.exports);
var psychrometricConstant = globalThis.psychrometricConstant;
var redistributePrecipitationFn = globalThis.redistributePrecipitation;
var ResourceCycleClass = globalThis.ResourceCycle;
var simulateSurfaceWaterFlow = globalThis.simulateSurfaceWaterFlow;
if (isNodeWaterCycle) {
  try {
    ({ psychrometricConstant, redistributePrecipitation: redistributePrecipitationFn } = require('./phase-change-utils.js'));
    ResourceCycleClass = require('./resource-cycle.js');
    simulateSurfaceWaterFlow = require('./hydrology.js').simulateSurfaceWaterFlow;
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
if (!simulateSurfaceWaterFlow && typeof require === 'function') {
  try {
    simulateSurfaceWaterFlow = require('./hydrology.js').simulateSurfaceWaterFlow;
  } catch (e) {
    try {
      simulateSurfaceWaterFlow = require('./src/js/terraforming/hydrology.js').simulateSurfaceWaterFlow;
    } catch (e2) {
      // ignore
    }
  }
}


// --- Murphy & Koop (2005) saturation vapor pressure (Pa) ---
function saturationVaporPressureMK(T) {
  if (T <= WATER_TRIPLE_T) {
    // Over ice (natural logs, T in K, result in Pa)
    return Math.exp(9.550426 - 5723.265 / T + 3.53068 * Math.log(T) - 0.00728332 * T);
  } else {
    // Over liquid water (natural logs, T in K, result in Pa)
    const term = 54.842763 - 6763.22 / T - 4.21 * Math.log(T) + 0.000367 * T;
    const corr = Math.tanh(0.0415 * (T - 218.8)) *
      (53.878 - 1331.22 / T - 9.44523 * Math.log(T) + 0.014025 * T);
    return Math.exp(term + corr);
  }
}

// Robust numerical slope d(es)/dT (central difference)
function derivativeSaturationVaporPressureMK(T) {
  const h = Math.max(0.05, 1e-3 * T); // K, stable & cheap
  const em = saturationVaporPressureMK(Math.max(1, T - h));
  const ep = saturationVaporPressureMK(T + h);
  return (ep - em) / (2 * h);
}

class WaterCycle extends ResourceCycleClass {
  constructor({
    key = 'water',
    atmKey = 'atmosphericWater',
    totalKeys = ['evaporation', 'sublimation', 'rapidSublimation', 'melt', 'freeze'],
    processTotalKeys = { rain: 'rain', snow: 'snow' },
    transitionRange = 2,
    maxDiff = 10,
    boilingPointFn = boilingPointWater,
    boilTransitionRange = 5,
    zonalKey = 'zonalWater',
    surfaceBucket = 'water',
    atmosphereKey = 'water',
    availableKeys = ['liquid', 'ice', 'buriedIce'],
    gravity = 1,
    condensationParameter = 1,
  } = {}) {
    const coverageKeys = {
      liquid: 'liquidWaterCoverage',
      ice: 'iceCoverage',
    };
    const precipitationKeys = {
      liquid: 'potentialRain',
      solid: 'potentialSnow',
    };
    const finalizeProcesses = [
      {
        container: 'precipitation',
        potentialKey: 'potentialRain',
        precipitationKey: 'rain',
        surfaceBucket: 'water',
        surfaceKey: 'liquid',
        totalKey: 'rainfall',
      },
      {
        container: 'precipitation',
        potentialKey: 'potentialSnow',
        precipitationKey: 'snow',
        surfaceBucket: 'water',
        surfaceKey: 'ice',
        totalKey: 'snowfall',
      },
    ];
    const rateMappings = {
      evaporation: [
        { path: 'atmospheric.atmosphericWater', label: 'Evaporation', sign: +1 },
        { path: 'surface.liquidWater', label: 'Evaporation', sign: -1 },
      ],
      sublimation: [
        { path: 'atmospheric.atmosphericWater', label: 'Sublimation', sign: +1 },
        { path: 'surface.ice', label: 'Sublimation', sign: -1 },
      ],
      rapidSublimation: [
        { path: 'atmospheric.atmosphericWater', label: 'Rapid Sublimation', sign: +1 },
        { path: 'surface.ice', label: 'Rapid Sublimation', sign: -1 },
      ],
      // Totals often arrive as 'rain'/'snow' from zonal precipitation
      rain: [
        { path: 'atmospheric.atmosphericWater', label: 'Rainfall', sign: -1 },
        { path: 'surface.liquidWater', label: 'Rain', sign: +1 },
      ],
      snow: [
        { path: 'atmospheric.atmosphericWater', label: 'Snowfall', sign: -1 },
        { path: 'surface.ice', label: 'Snow', sign: +1 },
      ],
      rainfall: [
        { path: 'atmospheric.atmosphericWater', label: 'Rainfall', sign: -1 },
        { path: 'surface.liquidWater', label: 'Rain', sign: +1 },
      ],
      snowfall: [
        { path: 'atmospheric.atmosphericWater', label: 'Snowfall', sign: -1 },
        { path: 'surface.ice', label: 'Snow', sign: +1 },
      ],
      melt: [
        { path: 'surface.liquidWater', label: 'Melt', sign: +1 },
        { path: 'surface.ice', label: 'Melt', sign: -1 },
      ],
      freeze: [
        { path: 'surface.liquidWater', label: 'Freeze', sign: -1 },
        { path: 'surface.ice', label: 'Freeze', sign: +1 },
      ],
      flowMelt: [
        { path: 'surface.liquidWater', label: 'Flow Melt', sign: +1 },
        { path: 'surface.ice', label: 'Flow Melt', sign: -1 },
      ],
    };
    super({
      latentHeatVaporization: L_V_WATER,
      latentHeatSublimation: L_S_WATER,
      saturationVaporPressureFn: saturationVaporPressureMK,
      slopeSaturationVaporPressureFn: derivativeSaturationVaporPressureMK,
      freezePoint: 273.15,
      sublimationPoint: 273.15,
      evaporationAlbedo: EVAP_ALBEDO_WATER,
      sublimationAlbedo: SUBLIMATION_ALBEDO_ICE,
      tripleTemperature: WATER_TRIPLE_T,
      triplePressure: WATER_TRIPLE_P,
      disallowLiquidBelowTriple: true,
      criticalTemperature: WATER_CRITICAL_T,
      coverageKeys,
      precipitationKeys,
      surfaceFlowFn: (terraforming, durationSeconds, tempMap) => {
        if (typeof simulateSurfaceWaterFlow === 'function'
          && typeof ZONES !== 'undefined'
          && terraforming && terraforming.zonalWater) {
          const flow = simulateSurfaceWaterFlow(terraforming, durationSeconds, tempMap) || { changes: {}, totalMelt: 0 };
          const totalMelt = flow.totalMelt || 0;
          terraforming.flowMeltAmount = totalMelt;
          terraforming.flowMeltRate = durationSeconds > 0 ? totalMelt / durationSeconds * 86400 : 0;
          return { changes: flow.changes || {}, totals: { flowMelt: totalMelt } };
        }
        return { changes: {}, totals: { flowMelt: 0 } };
      },
      rateMappings,
      finalizeProcesses,
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
      condensationParameter: terraforming.equilibriumWaterCondensationParameter,
    };
  }

  /**
   * Extract water-related coverage values for a zone from a cache object.
   */
  getCoverage(zone, cache = {}) {
    const data = cache[zone] || {};
    return {
      liquidWaterCoverage: data.liquidWater ?? 0,
      iceCoverage: data.ice ?? 0,
    };
  }

  // Delegate to shared ResourceCycle implementation
  processZone(params) { return super.processZone(params); }


  // Use base finalizeAtmosphere with constructor-provided finalizeProcesses

  redistributePrecipitation(terraforming, zonalChanges, zonalTemperatures) {
    if (typeof redistributePrecipitationFn === 'function') {
      redistributePrecipitationFn(terraforming, 'water', zonalChanges, zonalTemperatures);
    }
  }

  // Delegate to base for flow + zonal changes
  runCycle(terraforming, zones, options = {}) { return super.runCycle(terraforming, zones, options); }
  // Override only to add focused-melt and water-specific aliases
  updateResourceRates(terraforming, totals = {}, durationSeconds = 1) {
    // Apply base rates and resource changes from mappings
    super.updateResourceRates(terraforming, totals, durationSeconds);

    // Focused melt adds extra melt on top of phase-change and flow
    const resources = terraforming.resources;
    const rateType = 'terraforming';
    const focusMeltAmount = typeof globalThis.applyFocusedMelt === 'function'
      ? globalThis.applyFocusedMelt(terraforming, resources, durationSeconds)
      : 0;
    terraforming.focusMeltAmount = focusMeltAmount;
    const focusRate = durationSeconds > 0 ? focusMeltAmount / durationSeconds * 86400 : 0;
    terraforming.focusMeltRate = focusRate;
    if (focusRate > 0) {
      resources.surface.liquidWater?.modifyRate(focusRate, 'Focused Melt', rateType);
      resources.surface.ice?.modifyRate(-focusRate, 'Focused Melt', rateType);
    }

    // Alias expected fields
    const rapid = terraforming.totalRapidSublimationRate || 0;
    terraforming.totalSublimationRate = (terraforming.totalSublimationRate || 0) + rapid;
    terraforming.totalWaterSublimationRate = terraforming.totalSublimationRate;
    // UI expects rainfall/snowfall names, but totals keys are often rain/snow
    const rainRate = durationSeconds > 0 ? (totals.rain || 0) / durationSeconds * 86400 : 0;
    const snowRate = durationSeconds > 0 ? (totals.snow || 0) / durationSeconds * 86400 : 0;
    terraforming.totalRainfallRate = rainRate;
    terraforming.totalSnowfallRate = snowRate;
    // Include focused melt in the displayed melt rate
    terraforming.totalMeltRate = (terraforming.totalMeltRate || 0) + focusRate;
  }
}

const waterCycle = new WaterCycle();

// Function to calculate the slope of the saturation vapor pressure curve (Delta_s)
function slopeSaturationVaporPressureWater(T) {
    // T: Temperature in Kelvin (K)
    return derivativeSaturationVaporPressureMK(T); // Pa/K
}
  
// Function to calculate psychrometric constant (gamma_s) for water evaporation
function psychrometricConstantWater(atmPressure) {
    return psychrometricConstant(atmPressure, L_V_WATER); // Pa/K
}

// Function to calculate psychrometric constant for water sublimation
function psychrometricConstantWaterSublimation(atmPressure) {
    return psychrometricConstant(atmPressure, L_S_WATER); // Pa/K
}

// Solve e_w(T) = atmPressure for T using MK liquid branch.
// Returns undefined if no liquid phase exists (p <= triple pressure).
function boilingPointWater(atmPressure) {
  if (!(atmPressure > 0)) return undefined;
  if (atmPressure <= WATER_TRIPLE_P) return undefined; // no liquid region

  // Bracket between triple temperature and an upper cap well below critical.
  // 450 K covers up to several bars; adjust if you simulate very high pressures.
  let lo = WATER_TRIPLE_T, hi = 450.0;
  // Ensure the upper bracket pressure exceeds atmPressure
  const p_hi = saturationVaporPressureMK(hi);
  if (p_hi < atmPressure) hi = 647.0; // near critical temp (still OK)
  // Bisection
  for (let i = 0; i < 32; i++) {
    const mid = 0.5 * (lo + hi);
    const p = saturationVaporPressureMK(mid);
    if (p > atmPressure) hi = mid; else lo = mid;
  }
  return 0.5 * (lo + hi);
}
  
// Function to calculate sublimation rate for water ice using the modified Penman equation
function sublimationRateWater(T, solarFlux, atmPressure, e_a, r_a = 100) {
    return waterCycle.sublimationRate({ T, solarFlux, atmPressure, vaporPressure: e_a, r_a });
}

// Function to calculate evaporation rate for water using the modified Penman equation
function evaporationRateWater(T, solarFlux, atmPressure, e_a, r_a = 100) {
    return waterCycle.evaporationRate({ T, solarFlux, atmPressure, vaporPressure: e_a, r_a, albedo: 0.3 });
}

function calculateWaterEvaporationRate({
    zoneArea,
    liquidWaterCoverage,
    dayTemperature,
    nightTemperature,
    waterVaporPressure,
    avgAtmPressure,
    zonalSolarFlux,
}) {
    if (zoneArea <= 0 || liquidWaterCoverage <= 0) {
        return 0;
    }

    const liquidCoveredArea = zoneArea * liquidWaterCoverage;
    const daySolarFlux = 2 * zonalSolarFlux;
    const nightSolarFlux = 0;

    let dayEvaporationRate = 0;
    if (typeof dayTemperature === 'number') {
        const rate = evaporationRateWater(dayTemperature, daySolarFlux, avgAtmPressure, waterVaporPressure, 100);
        dayEvaporationRate = rate * liquidCoveredArea / 1000;
    }

    let nightEvaporationRate = 0;
    if (typeof nightTemperature === 'number') {
        const rate = evaporationRateWater(nightTemperature, nightSolarFlux, avgAtmPressure, waterVaporPressure, 100);
        nightEvaporationRate = rate * liquidCoveredArea / 1000;
    }

    return (dayEvaporationRate + nightEvaporationRate) / 2;
}

function calculateWaterSublimationRate({
    zoneArea,
    iceCoverage,
    dayTemperature,
    nightTemperature,
    waterVaporPressure,
    avgAtmPressure,
    zonalSolarFlux,
}) {
    if (zoneArea <= 0 || iceCoverage <= 0) {
        return 0;
    }

    const iceCoveredArea = zoneArea * iceCoverage;
    const daySolarFlux = 2 * zonalSolarFlux;
    const nightSolarFlux = 0;

    let daySublimationRate = 0;
    if (typeof dayTemperature === 'number') {
        const rate = sublimationRateWater(dayTemperature, daySolarFlux, avgAtmPressure, waterVaporPressure, 100);
        daySublimationRate = rate * iceCoveredArea / 1000; // tons/s
    }

    let nightSublimationRate = 0;
    if (typeof nightTemperature === 'number') {
        const rate = sublimationRateWater(nightTemperature, nightSolarFlux, avgAtmPressure, waterVaporPressure, 100);
        nightSublimationRate = rate * iceCoveredArea / 1000; // tons/s
    }

    return (daySublimationRate + nightSublimationRate) / 2;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        WaterCycle,
        waterCycle,
        saturationVaporPressureMK,
        derivativeSaturationVaporPressureMK,
        slopeSaturationVaporPressureWater,
        psychrometricConstantWater,
        psychrometricConstantWaterSublimation,
        sublimationRateWater,
        evaporationRateWater,
        calculateWaterEvaporationRate,
        calculateWaterSublimationRate,
        boilingPointWater
    };
} else {
    // Expose functions globally for browser usage
    globalThis.WaterCycle = WaterCycle;
    globalThis.waterCycle = waterCycle;
    globalThis.saturationVaporPressureMK = saturationVaporPressureMK;
    globalThis.derivativeSaturationVaporPressureMK = derivativeSaturationVaporPressureMK;
    globalThis.slopeSaturationVaporPressureWater = slopeSaturationVaporPressureWater;
    globalThis.psychrometricConstantWater = psychrometricConstantWater;
    globalThis.psychrometricConstantWaterSublimation = psychrometricConstantWaterSublimation;
    globalThis.sublimationRateWater = sublimationRateWater;
    globalThis.evaporationRateWater = evaporationRateWater;
    globalThis.calculateWaterEvaporationRate = calculateWaterEvaporationRate;
    globalThis.calculateWaterSublimationRate = calculateWaterSublimationRate;
    globalThis.boilingPointWater = boilingPointWater;
}
