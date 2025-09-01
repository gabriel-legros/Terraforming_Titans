const L_S_WATER = 2.83e6; // Latent heat of sublimation for water (J/kg)
const L_V_WATER = 2.45e6; // Latent heat of vaporization for water (J/kg)

const isNodeWaterCycle = (typeof module !== 'undefined' && module.exports);
var psychrometricConstant = globalThis.psychrometricConstant;
var ResourceCycleClass = globalThis.ResourceCycle;
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
if (isNodeWaterCycle) {
  try {
    psychrometricConstant = require('./phase-change-utils.js').psychrometricConstant;
  } catch (e) {
    // fall back to globals if require fails
  }
}

if (!ResourceCycleClass) {
  let penmanRate = globalThis.penmanRate;
  let condensationRateFactor = globalThis.condensationRateFactor;
  let meltingFreezingRates = globalThis.meltingFreezingRates;
  if (typeof require === 'function') {
    try {
      const phaseUtils = require('./phase-change-utils.js');
      penmanRate = phaseUtils.penmanRate;
      meltingFreezingRates = phaseUtils.meltingFreezingRates;
      condensationRateFactor = require('./condensation-utils.js').condensationRateFactor;
    } catch (e) {
      // ignore
    }
  }
  class ResourceCycle {
    constructor({
      latentHeatVaporization,
      latentHeatSublimation,
      saturationVaporPressureFn,
      slopeSaturationVaporPressureFn,
      freezePoint,
      sublimationPoint,
      rapidSublimationMultiplier = 0,
      evaporationAlbedo = 0.6,
      sublimationAlbedo = 0.6,
    } = {}) {
      this.latentHeatVaporization = latentHeatVaporization;
      this.latentHeatSublimation = latentHeatSublimation;
      this.saturationVaporPressureFn = saturationVaporPressureFn;
      this.slopeSaturationVaporPressureFn = slopeSaturationVaporPressureFn;
      this.freezePoint = freezePoint;
      this.sublimationPoint = sublimationPoint;
      this.rapidSublimationMultiplier = rapidSublimationMultiplier;
      this.evaporationAlbedo = evaporationAlbedo;
      this.sublimationAlbedo = sublimationAlbedo;
    }

    evaporationRate({ T, solarFlux, atmPressure, vaporPressure: e_a, r_a = 100, albedo = this.evaporationAlbedo }) {
      const Delta_s = this.slopeSaturationVaporPressureFn(T);
      const e_s = this.saturationVaporPressureFn(T);
      return penmanRate({
        T,
        solarFlux,
        atmPressure,
        e_a,
        latentHeat: this.latentHeatVaporization,
        albedo,
        r_a,
        Delta_s,
        e_s,
      });
    }

    condensationRateFactor({ zoneArea, vaporPressure, gravity, dayTemp, nightTemp, transitionRange, maxDiff, boilingPoint, boilTransitionRange }) {
      return condensationRateFactor({
        zoneArea,
        vaporPressure,
        gravity,
        dayTemp,
        nightTemp,
        saturationFn: this.saturationVaporPressureFn,
        freezePoint: this.freezePoint,
        transitionRange,
        maxDiff,
        boilingPoint,
        boilTransitionRange,
      });
    }

    meltingFreezingRates(args) {
      return meltingFreezingRates({ ...args, freezingPoint: this.freezePoint });
    }

    sublimationRate({ T, solarFlux, atmPressure, vaporPressure: e_a, r_a = 100, albedo = this.sublimationAlbedo }) {
      const Delta_s = this.slopeSaturationVaporPressureFn(T);
      const e_s = this.saturationVaporPressureFn(T);
      return penmanRate({
        T,
        solarFlux,
        atmPressure,
        e_a,
        latentHeat: this.latentHeatSublimation,
        albedo,
        r_a,
        Delta_s,
        e_s,
      });
    }

    rapidSublimationRate(temperature, availableIce) {
      if (temperature > this.sublimationPoint && availableIce > 0) {
        const diff = temperature - this.sublimationPoint;
        return availableIce * this.rapidSublimationMultiplier * diff;
      }
      return 0;
    }
  }
  ResourceCycleClass = ResourceCycle;
  globalThis.ResourceCycle = ResourceCycle;
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

// Calculate average evaporation and sublimation rates for a surface zone
function calculateEvaporationSublimationRates({
    zoneArea,
    liquidWaterCoverage,
    iceCoverage,
    dryIceCoverage,
    dayTemperature,
    nightTemperature,
    waterVaporPressure,
    co2VaporPressure,
    avgAtmPressure,
    zonalSolarFlux
}) {
    if (zoneArea <= 0) {
        return { evaporationRate: 0, waterSublimationRate: 0, co2SublimationRate: 0 };
    }

    let dayEvaporationRate = 0, nightEvaporationRate = 0;
    let dayWaterSublimationRate = 0, nightWaterSublimationRate = 0;
    let dayCo2SublimationRate = 0, nightCo2SublimationRate = 0;

    const liquidWaterCoveredArea = zoneArea * liquidWaterCoverage;
    const iceCoveredArea = zoneArea * iceCoverage;
    const dryIceCoveredArea = zoneArea * dryIceCoverage;

    const daySolarFlux = 2 * zonalSolarFlux;
    const nightSolarFlux = 0;

    if (liquidWaterCoveredArea > 0 && typeof dayTemperature === 'number') {
        const rate = evaporationRateWater(dayTemperature, daySolarFlux, avgAtmPressure, waterVaporPressure, 100);
        dayEvaporationRate = rate * liquidWaterCoveredArea / 1000;
    }
    if (iceCoveredArea > 0 && typeof dayTemperature === 'number') {
        const rate = sublimationRateWater(dayTemperature, daySolarFlux, avgAtmPressure, waterVaporPressure, 100);
        dayWaterSublimationRate = rate * iceCoveredArea / 1000;
    }
    if (dryIceCoveredArea > 0 && typeof dayTemperature === 'number') {
        const rate = sublimationRateCO2(dayTemperature, daySolarFlux, avgAtmPressure, co2VaporPressure, 100);
        dayCo2SublimationRate = rate * dryIceCoveredArea / 1000;
    }

    if (liquidWaterCoveredArea > 0 && typeof nightTemperature === 'number') {
        const rate = evaporationRateWater(nightTemperature, nightSolarFlux, avgAtmPressure, waterVaporPressure, 100);
        nightEvaporationRate = rate * liquidWaterCoveredArea / 1000;
    }
    if (iceCoveredArea > 0 && typeof nightTemperature === 'number') {
        const rate = sublimationRateWater(nightTemperature, nightSolarFlux, avgAtmPressure, waterVaporPressure, 100);
        nightWaterSublimationRate = rate * iceCoveredArea / 1000;
    }
    if (dryIceCoveredArea > 0 && typeof nightTemperature === 'number') {
        const rate = sublimationRateCO2(nightTemperature, nightSolarFlux, avgAtmPressure, co2VaporPressure, 100);
        nightCo2SublimationRate = rate * dryIceCoveredArea / 1000;
    }

    const avgEvap = (dayEvaporationRate + nightEvaporationRate) / 2;
    const avgWaterSubl = (dayWaterSublimationRate + nightWaterSublimationRate) / 2;
    const avgCo2Subl = (dayCo2SublimationRate + nightCo2SublimationRate) / 2;

    return {
        evaporationRate: avgEvap,
        waterSublimationRate: avgWaterSubl,
        co2SublimationRate: avgCo2Subl
    };
}

// Calculate potential precipitation rate factors for a zone
function calculatePrecipitationRateFactor({
    zoneArea,
    waterVaporPressure,
    gravity,
    dayTemperature,
    nightTemperature,
    atmPressure
}) {
    const boilingPoint = boilingPointWater(atmPressure);
    const res = waterCycle.condensationRateFactor({
        zoneArea,
        vaporPressure: waterVaporPressure,
        gravity,
        dayTemp: dayTemperature,
        nightTemp: nightTemperature,
        transitionRange: 2,
        maxDiff: 10,
        boilingPoint,
        boilTransitionRange: 5
    });
    return { rainfallRateFactor: res.liquidRate, snowfallRateFactor: res.iceRate };
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
        calculateEvaporationSublimationRates,
        calculatePrecipitationRateFactor,
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
    globalThis.calculateEvaporationSublimationRates = calculateEvaporationSublimationRates;
    globalThis.calculatePrecipitationRateFactor = calculatePrecipitationRateFactor;
    globalThis.boilingPointWater = boilingPointWater;
}
