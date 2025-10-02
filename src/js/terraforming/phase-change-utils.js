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
 
function penmanRate({
  T,
  solarFlux,
  atmPressure,
  e_a,
  latentHeat,
  albedo = 0.6,
  r_a = 100,
  Delta_s,
  e_s,
  criticalTemperature = Infinity,
}) {
  if (typeof Delta_s !== 'number' || typeof e_s !== 'number') {
    throw new Error('penmanRate requires Delta_s and e_s');
  }
  const R_n = (1 - albedo) * solarFlux;
  const gamma_s = psychrometricConstant(atmPressure, latentHeat);
  const rho_a_val = airDensityFn(atmPressure, T);

  let humidityDeficit = e_s - e_a;
  if (
    Number.isFinite(criticalTemperature) &&
    T >= criticalTemperature &&
    humidityDeficit < 0
  ) {
    humidityDeficit = 0;
  }

  const numerator =
    Delta_s * R_n + (rho_a_val * C_P_AIR * humidityDeficit) / r_a;
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
  iceCoverage = 1,
  liquidCoverage = 1
}) {
   const meltingRateMultiplier = 0.0000001; // per K per second
   const freezingRateMultiplier = 0.0000001; // per K per second
 
   let meltingRate = 0;
   let freezingRate = 0;
 
   if (temperature > freezingPoint) {
     const diff = temperature - freezingPoint;

    const surfaceIceCoverage = iceCoverage;
    const surfaceMeltCap = zoneArea * surfaceIceCoverage;
     const cappedSurfaceIce = surfaceMeltCap;
     const surfaceMeltRate = cappedSurfaceIce * meltingRateMultiplier * diff;
 
     const buriedIceCoverage = 1;
     const buriedMeltCap = zoneArea * buriedIceCoverage * 0.1;
     const cappedBuriedIce = buriedMeltCap;
     const potentialBuriedMeltRate = cappedBuriedIce * meltingRateMultiplier * diff * 0.5;
 
     let actualBuriedMeltRate = 0;
     if (potentialBuriedMeltRate > surfaceMeltRate) {
       actualBuriedMeltRate = potentialBuriedMeltRate - surfaceMeltRate;
     }
 
     meltingRate = surfaceMeltRate + actualBuriedMeltRate;
   } else if (temperature < freezingPoint && availableLiquid > 0) {
     const diff = freezingPoint - temperature;

    const surfaceLiquidCoverage = liquidCoverage;
    const baseFreezeRate = freezingRateMultiplier * diff;
    const surfaceFreezeCap = zoneArea * surfaceLiquidCoverage;

    const cappedLiquid = surfaceFreezeCap;

    freezingRate = baseFreezeRate * cappedLiquid;
  }
 
   return { meltingRate, freezingRate };
 }

function redistributePrecipitation(terraforming, substance, zonalChanges, zonalTemperatures) {
    const zones = ['tropical', 'temperate', 'polar'];
    const WIND_WEIGHT = 0.05;
    const LIQUID_BIAS_WEIGHT = 0.60;
    const REMAIN_WEIGHT = 0.35; // 1.0 - WIND_WEIGHT - LIQUID_BIAS_WEIGHT

    let liquidKey, iceKey, resourceKey, liquidCoverageType;

    if (substance === 'water') {
        liquidKey = 'rain';
        iceKey = 'snow';
        resourceKey = 'water';
        liquidCoverageType = 'liquidWater';
    } else if (substance === 'methane') {
        liquidKey = 'methaneRain';
        iceKey = 'methaneSnow';
        resourceKey = 'methane';
        liquidCoverageType = 'liquidMethane';
    } else {
        return; // Unknown substance
    }

    const totalPrecip = zones.reduce((sum, z) => sum + (zonalChanges[z].precipitation[liquidKey] || 0) + (zonalChanges[z].precipitation[iceKey] || 0), 0);

    if (totalPrecip <= 1e-9 || zones.length === 0) {
        return; // No precipitation to redistribute
    }

    // Calculate liquid coverage weights
    const liquidCoverage = {};
    const totalLiquidCoverage = zones.reduce((sum, z) => {
        const coverage = terraforming.zonalCoverageCache[z]?.[liquidCoverageType] ?? 0;
        liquidCoverage[z] = coverage;
        return sum + coverage;
    }, 0);

    const adjustments = {};
    let totalPositiveDiff = 0;
    let totalNegativeDiff = 0;

    zones.forEach(z => {
        const currentPrecip = (zonalChanges[z].precipitation[liquidKey] || 0) + (zonalChanges[z].precipitation[iceKey] || 0);

        // 1. The portion that remains in the zone
        const remainAmount = currentPrecip * REMAIN_WEIGHT;

        // 2. The portion distributed by wind
        const windAmount = totalPrecip * WIND_WEIGHT * (1 / zones.length);

        // 3. The portion biased by liquid coverage
        let liquidBiasAmount = 0;
        if (totalLiquidCoverage > 1e-9) {
            const zoneLiquidFraction = liquidCoverage[z] / totalLiquidCoverage;
            liquidBiasAmount = totalPrecip * LIQUID_BIAS_WEIGHT * zoneLiquidFraction;
        } else {
            // If no liquid, this portion also remains in the zone
            liquidBiasAmount = currentPrecip * LIQUID_BIAS_WEIGHT;
        }

        const desired = remainAmount + windAmount + liquidBiasAmount;
        const diff = desired - currentPrecip;

        adjustments[z] = { diff };
        if (diff > 0) {
            totalPositiveDiff += diff;
        } else {
            totalNegativeDiff += diff;
        }
    });

    const totalDiff = totalPositiveDiff + totalNegativeDiff;
    const scalingFactor = (totalPositiveDiff > 0 && totalDiff !== 0) ? -totalNegativeDiff / totalPositiveDiff : 1;

    zones.forEach(z => {
        const diff = adjustments[z].diff;
        if (Math.abs(diff) < 1e-9) return;

        let liquidAdj = 0;
        let iceAdj = 0;

        if (diff > 0) { // Deficit zone
            const scaledDiff = diff * scalingFactor;
            const zoneTemp = zonalTemperatures[z].value;
            const METHANE_FREEZING_POINT = 90.7; // K
            const isLiquid = (substance === 'water' && zoneTemp > 273.15) || (substance === 'methane' && zoneTemp > METHANE_FREEZING_POINT);
            liquidAdj = isLiquid ? scaledDiff : 0;
            iceAdj = isLiquid ? 0 : scaledDiff;
        } else { // Surplus zone
            const precipInZone = (zonalChanges[z].precipitation[liquidKey] || 0) + (zonalChanges[z].precipitation[iceKey] || 0);
            if (precipInZone > 1e-9) {
                const liquidFraction = (zonalChanges[z].precipitation[liquidKey] || 0) / precipInZone;
                const iceFraction = (zonalChanges[z].precipitation[iceKey] || 0) / precipInZone;
                liquidAdj = diff * liquidFraction;
                iceAdj = diff * iceFraction;
            }
        }

        const resource = zonalChanges[z][resourceKey];
        resource.liquid += liquidAdj;
        resource.ice += iceAdj;
        zonalChanges[z].precipitation[liquidKey] += liquidAdj;
        zonalChanges[z].precipitation[iceKey] += iceAdj;
    });
}

 
 if (isNodePCU) {
   module.exports = { psychrometricConstant, penmanRate, meltingFreezingRates, redistributePrecipitation };
 } else {
   globalThis.psychrometricConstant = psychrometricConstant;
   globalThis.penmanRate = penmanRate;
   globalThis.meltingFreezingRates = meltingFreezingRates;
   globalThis.redistributePrecipitation = redistributePrecipitation;
 }
