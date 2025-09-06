const L_S_WATER = 2.83e6; // Latent heat of sublimation for water (J/kg)
const L_V_WATER = 2.45e6; // Latent heat of vaporization for water (J/kg)

const isNodeWaterCycle = (typeof module !== 'undefined' && module.exports);
var psychrometricConstant = globalThis.psychrometricConstant;
var ResourceCycleClass = globalThis.ResourceCycle;
if (isNodeWaterCycle) {
  try {
    ({ psychrometricConstant } = require('./phase-change-utils.js'));
    ResourceCycleClass = require('./resource-cycle.js');
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
  constructor() {
    super({
      latentHeatVaporization: L_V_WATER,
      latentHeatSublimation: L_S_WATER,
      saturationVaporPressureFn: saturationVaporPressureBuck,
      slopeSaturationVaporPressureFn: derivativeSaturationVaporPressureBuck,
      freezePoint: 273.15,
      sublimationPoint: 273.15,
    });
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

  /**
   * Calculate zonal resource changes for water using base phase-change helpers.
   * Returns an object shaped like the entries in terraforming.updateResources's
   * `zonalChanges` map so results can be merged directly.
   */
  processZone({
    zoneArea,
    liquidWaterCoverage = 0,
    iceCoverage = 0,
    dayTemperature,
    nightTemperature,
    zoneTemperature,
    atmPressure,
    vaporPressure,
    availableLiquid = 0,
    availableIce = 0,
    availableBuriedIce = 0,
    zonalSolarFlux = 0,
    durationSeconds = 1,
    gravity = 1,
    precipitationMultiplier = 1,
  }) {
    const changes = {
      atmosphere: { water: 0 },
      water: { liquid: 0, ice: 0, buriedIce: 0 },
      precipitation: { potentialRain: 0, potentialSnow: 0 },
    };

    const daySolarFlux = 2 * zonalSolarFlux;
    const nightSolarFlux = 0;

    const liquidArea = zoneArea * liquidWaterCoverage;
    const iceArea = zoneArea * iceCoverage;

    // --- Evaporation/Sublimation ---
    let dayEvapRate = 0;
    let nightEvapRate = 0;
    let daySubRate = 0;
    let nightSubRate = 0;
    if (liquidArea > 0) {
      if (typeof dayTemperature === 'number') {
        dayEvapRate = this.evaporationRate({
          T: dayTemperature,
          solarFlux: daySolarFlux,
          atmPressure,
          vaporPressure,
          r_a: 100,
          albedo: 0.3,
        }) * liquidArea / 1000;
      }
      if (typeof nightTemperature === 'number') {
        nightEvapRate = this.evaporationRate({
          T: nightTemperature,
          solarFlux: nightSolarFlux,
          atmPressure,
          vaporPressure,
          r_a: 100,
          albedo: 0.3,
        }) * liquidArea / 1000;
      }
    }
    if (iceArea > 0) {
      if (typeof dayTemperature === 'number') {
        daySubRate = this.sublimationRate({
          T: dayTemperature,
          solarFlux: daySolarFlux,
          atmPressure,
          vaporPressure,
          r_a: 100,
        }) * iceArea / 1000;
      }
      if (typeof nightTemperature === 'number') {
        nightSubRate = this.sublimationRate({
          T: nightTemperature,
          solarFlux: nightSolarFlux,
          atmPressure,
          vaporPressure,
          r_a: 100,
        }) * iceArea / 1000;
      }
    }

    const evaporationRate = (dayEvapRate + nightEvapRate) / 2;
    const sublimationRate = (daySubRate + nightSubRate) / 2;
    const evaporationAmount = Math.min(evaporationRate * durationSeconds, availableLiquid);
    const sublimationAmount = Math.min(sublimationRate * durationSeconds, availableIce);
    changes.atmosphere.water += evaporationAmount + sublimationAmount;
    changes.water.liquid -= evaporationAmount;
    changes.water.ice -= sublimationAmount;

    // --- Condensation (potential precipitation) ---
    const { liquidRate, iceRate } = this.condensationRateFactor({
      zoneArea,
      vaporPressure,
      gravity,
      dayTemp: dayTemperature,
      nightTemp: nightTemperature,
    });
    const potentialRain = liquidRate * precipitationMultiplier * durationSeconds;
    const potentialSnow = iceRate * precipitationMultiplier * durationSeconds;
    changes.precipitation.potentialRain = potentialRain;
    changes.precipitation.potentialSnow = potentialSnow;
    changes.atmosphere.water -= potentialRain + potentialSnow;

    // --- Melting/Freezing ---
    const meltFreezeRates = this.meltingFreezingRates({
      temperature: zoneTemperature,
      availableIce,
      availableLiquid,
      availableBuriedIce,
      zoneArea,
      iceCoverage,
      liquidCoverage: liquidWaterCoverage,
    });
    const currentLiquid = availableLiquid + changes.water.liquid;
    const currentIce = availableIce + changes.water.ice;
    const currentBuried = availableBuriedIce + changes.water.buriedIce;
    const availableForMelt = currentIce + currentBuried;
    const meltAmount = Math.min(meltFreezeRates.meltingRate * durationSeconds, availableForMelt);
    const freezeAmount = Math.min(meltFreezeRates.freezingRate * durationSeconds, currentLiquid);

    let meltFromIce = Math.min(meltAmount, currentIce);
    let meltFromBuried = Math.min(meltAmount - meltFromIce, currentBuried);

    changes.water.liquid += meltAmount - freezeAmount;
    changes.water.ice += freezeAmount - meltFromIce;
    changes.water.buriedIce -= meltFromBuried;

    // --- Rapid Sublimation ---
    const remainingIce = currentIce - meltFromIce;
    const rapidRate = this.rapidSublimationRate(zoneTemperature, remainingIce);
    const rapidAmount = Math.min(rapidRate * durationSeconds, remainingIce);
    if (rapidAmount > 0) {
      changes.water.ice -= rapidAmount;
      changes.atmosphere.water += rapidAmount;
    }

    return {
      ...changes,
      evaporationAmount,
      sublimationAmount: sublimationAmount + rapidAmount,
      meltAmount,
      freezeAmount,
    };
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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        WaterCycle,
        waterCycle,
        saturationVaporPressureBuck,
        derivativeSaturationVaporPressureBuck,
        slopeSaturationVaporPressureWater,
        psychrometricConstantWater,
        sublimationRateWater,
        evaporationRateWater,
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
    globalThis.sublimationRateWater = sublimationRateWater;
    globalThis.evaporationRateWater = evaporationRateWater;
    globalThis.boilingPointWater = boilingPointWater;
}
