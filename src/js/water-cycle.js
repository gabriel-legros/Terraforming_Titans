const L_S_WATER = 2.83e6; // Latent heat of sublimation for water (J/kg)
const L_V_WATER = 2.45e6; // Latent heat of vaporization for water (J/kg)

const isNodeWaterCycle = (typeof module !== 'undefined' && module.exports);
var penmanRate = globalThis.penmanRate;
var psychrometricConstant = globalThis.psychrometricConstant;
var condensationRateFactorUtil = globalThis.condensationRateFactor;
if (isNodeWaterCycle) {
  try {
    ({ penmanRate, psychrometricConstant } = require('./phase-change-utils.js'));
    condensationRateFactorUtil = require('./condensation-utils.js').condensationRateFactor;
  } catch (e) {
    // fall back to globals if require fails
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
  
// Function to calculate the slope of the saturation vapor pressure curve (Delta_s)
function slopeSaturationVaporPressureWater(T) {
    // T: Temperature in Kelvin (K)
    return derivativeSaturationVaporPressureBuck(T); // Pa/K
}
  
// Function to calculate psychrometric constant (gamma_s) for water evaporation
function psychrometricConstantWater(atmPressure) {
    return psychrometricConstant(atmPressure, L_V_WATER); // Pa/K
}
  
// Function to calculate sublimation rate for water ice using the modified Penman equation
function sublimationRateWater(T, solarFlux, atmPressure, e_a, r_a = 100) {
    // T: Temperature in Kelvin (K)
    // solarFlux: Incoming solar radiation (W/m²)
    // atmPressure: Atmospheric pressure (Pa)
    // e_a: Actual vapor pressure of water in the atmosphere (Pa)
    // r_a: Aerodynamic resistance (s/m), default is 100 s/m
  
    const Delta_s = slopeSaturationVaporPressureWater(T); // Pa/K
    const e_s = saturationVaporPressureBuck(T); // Pa
    return penmanRate({
        T,
        solarFlux,
        atmPressure,
        e_a,
        latentHeat: L_S_WATER,
        albedo: 0.6,
        r_a,
        Delta_s,
        e_s,
    });
}

// Function to calculate evaporation rate for water using the modified Penman equation
function evaporationRateWater(T, solarFlux, atmPressure, e_a, r_a = 100) {
    // T: Temperature in Kelvin (K)
    // solarFlux: Incoming solar radiation (W/m²)
    // atmPressure: Atmospheric pressure (Pa)
    // e_a: Actual vapor pressure of water in the atmosphere (Pa)
    // r_a: Aerodynamic resistance (s/m), default is 100 s/m
  
    const Delta_s = slopeSaturationVaporPressureWater(T); // Pa/K
    const e_s = saturationVaporPressureBuck(T); // Pa
    return penmanRate({
        T,
        solarFlux,
        atmPressure,
        e_a,
        latentHeat: L_V_WATER,
        albedo: 0.3,
        r_a,
        Delta_s,
        e_s,
    });
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
    nightTemperature
}) {
    const res = condensationRateFactorUtil({
        zoneArea,
        vaporPressure: waterVaporPressure,
        gravity,
        dayTemp: dayTemperature,
        nightTemp: nightTemperature,
        saturationFn: saturationVaporPressureBuck,
        freezePoint: 273.15,
        transitionRange: 2,
        maxDiff: 10
    });
    return { rainfallRateFactor: res.liquidRate, snowfallRateFactor: res.iceRate };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        saturationVaporPressureBuck,
        derivativeSaturationVaporPressureBuck,
        slopeSaturationVaporPressureWater,
        psychrometricConstantWater,
        sublimationRateWater,
        evaporationRateWater,
        calculateEvaporationSublimationRates,
        calculatePrecipitationRateFactor
    };
} else {
    // Expose functions globally for browser usage
    globalThis.saturationVaporPressureBuck = saturationVaporPressureBuck;
    globalThis.derivativeSaturationVaporPressureBuck = derivativeSaturationVaporPressureBuck;
    globalThis.slopeSaturationVaporPressureWater = slopeSaturationVaporPressureWater;
    globalThis.psychrometricConstantWater = psychrometricConstantWater;
    globalThis.sublimationRateWater = sublimationRateWater;
    globalThis.evaporationRateWater = evaporationRateWater;
    globalThis.calculateEvaporationSublimationRates = calculateEvaporationSublimationRates;
    globalThis.calculatePrecipitationRateFactor = calculatePrecipitationRateFactor;
}
