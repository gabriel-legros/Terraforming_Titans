const L_S_WATER = 2.83e6; // Latent heat of sublimation for water (J/kg)
const L_V_WATER = 2.45e6; // Latent heat of vaporization for water (J/kg)
const EVAP_ALBEDO_WATER = 0.06; // Representative albedo for liquid water
const SUBLIMATION_ALBEDO_ICE = 0.6; // Representative albedo for ice

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


// Function to calculate saturation vapor pressure using the Buck Equation for water
function saturationVaporPressureBuck(T) {
    // T: Temperature in Kelvin (K)
    
    if (T < 273.15) {
        // Buck equation for ice (solid water)
        const A = 0.61115; // kPa
        const C1 = 23.036;
        const C2 = 333.7;
        const C3 = 279.82;
    
        function f_ice(T_K) {
            return (C1 - (T_K - 273.15) / C2) * ((T_K - 273.15) / (C3 + (T_K - 273.15)));
        }
    
        const es_ice = A * Math.exp(f_ice(T)); // kPa
        return es_ice * 1000; // Convert kPa to Pa
    } else {
        // Buck equation for water (liquid)
        const A = 0.61121; // kPa
        const C1 = 18.678;
        const C2 = 234.5;
        const C3 = 257.14;
    
        function f_water(T_K) {
            return (C1 - (T_K - 273.15) / C2) * ((T_K - 273.15) / (C3 + (T_K - 273.15)));
        }
    
        const es_water = A * Math.exp(f_water(T)); // kPa
        return es_water * 1000; // Convert kPa to Pa
    }
}
  
  
// Function to calculate the derivative of saturation vapor pressure with respect to temperature
function derivativeSaturationVaporPressureBuck(T) {
    // T: Temperature in Kelvin (K)
    
    if (T < 273.15) {
        // Buck equation derivative for ice
        const A = 0.61115; // kPa
        const C1 = 23.036;
        const C2 = 333.7;
        const C3 = 279.82;
    
        function f_ice(T_K) {
            return (C1 - (T_K - 273.15) / C2) * ((T_K - 273.15) / (C3 + (T_K - 273.15)));
        }
    
        function df_ice(T_K) {
            const T_C = T_K - 273.15; // Convert to Celsius
            const term1 = (C1 - T_C / C2) * (C3 / Math.pow(C3 + T_C, 2));
            const term2 = (-1 / C2) * (T_C / (C3 + T_C));
            return term1 + term2;
        }
    
        const es_ice = A * Math.exp(f_ice(T)); // kPa
        const des_dT = es_ice * df_ice(T) * 1000; // Convert kPa/K to Pa/K
        return des_dT;
    } else {
        // Buck equation derivative for water
        const A = 0.61121; // kPa
        const C1 = 18.678;
        const C2 = 234.5;
        const C3 = 257.14;
    
        function f_water(T_K) {
            return (C1 - (T_K - 273.15) / C2) * ((T_K - 273.15) / (C3 + (T_K - 273.15)));
        }
    
        function df_water(T_K) {
            const T_C = T_K - 273.15; // Convert to Celsius
            const term1 = (C1 - T_C / C2) * (C3 / Math.pow(C3 + T_C, 2));
            const term2 = (-1 / C2) * (T_C / (C3 + T_C));
            return term1 + term2;
        }
    
        const es_water = A * Math.exp(f_water(T)); // kPa
        const des_dT = es_water * df_water(T) * 1000; // Convert kPa/K to Pa/K
        return des_dT;
    }
}

class WaterCycle extends ResourceCycleClass {
  constructor({
    key = 'water',
    atmKey = 'atmosphericWater',
    totalKeys = ['evaporation', 'sublimation', 'melt', 'freeze'],
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
      saturationVaporPressureFn: saturationVaporPressureBuck,
      slopeSaturationVaporPressureFn: derivativeSaturationVaporPressureBuck,
      freezePoint: 273.15,
      sublimationPoint: 273.15,
      evaporationAlbedo: 0.3,
      sublimationAlbedo: SUBLIMATION_ALBEDO_ICE,
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
    terraforming.totalWaterSublimationRate = terraforming.totalSublimationRate || 0;
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
    return derivativeSaturationVaporPressureBuck(T); // Pa/K
}
  
// Function to calculate psychrometric constant (gamma_s) for water evaporation
function psychrometricConstantWater(atmPressure) {
    return psychrometricConstant(atmPressure, L_V_WATER); // Pa/K
}

// Function to calculate psychrometric constant for water sublimation
function psychrometricConstantWaterSublimation(atmPressure) {
    return psychrometricConstant(atmPressure, L_S_WATER); // Pa/K
}

// Estimate the boiling point of water (K) from pressure (Pa) using the
// Antoine equation. The constants cover a wide range around standard
// atmospheric conditions, avoiding iterative solves.
function boilingPointWater(atmPressure) {
    if (atmPressure <= 0) return 0;
    const A = 8.07131; // Antoine coefficients for water
    const B = 1730.63;
    const C = 233.426;
    const PmmHg = atmPressure * 0.00750062; // Pa → mmHg
    const T_C = B / (A - Math.log10(PmmHg)) - C; // Celsius
    return T_C + 273.15;
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
        saturationVaporPressureBuck,
        derivativeSaturationVaporPressureBuck,
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
    globalThis.saturationVaporPressureBuck = saturationVaporPressureBuck;
    globalThis.derivativeSaturationVaporPressureBuck = derivativeSaturationVaporPressureBuck;
    globalThis.slopeSaturationVaporPressureWater = slopeSaturationVaporPressureWater;
    globalThis.psychrometricConstantWater = psychrometricConstantWater;
    globalThis.psychrometricConstantWaterSublimation = psychrometricConstantWaterSublimation;
    globalThis.sublimationRateWater = sublimationRateWater;
    globalThis.evaporationRateWater = evaporationRateWater;
    globalThis.calculateWaterEvaporationRate = calculateWaterEvaporationRate;
    globalThis.calculateWaterSublimationRate = calculateWaterSublimationRate;
    globalThis.boilingPointWater = boilingPointWater;
}
