 // Utility functions for phase change calculations
 
 const isNodePCU = (typeof module !== 'undefined' && module.exports);
 var airDensityFn;
 if (isNodePCU) {
   airDensityFn = require('./physics.js').airDensity;
 } else {
   airDensityFn = globalThis.airDensity;
 }
 
function psychrometricConstant(atmPressure, latentHeat) {
   return (terraformingParameters.physical.dryAirSpecificHeatJPerKgK * atmPressure)
    / (terraformingParameters.physical.waterToDryAirMolecularWeightRatio * latentHeat);
 }
 
function penmanRate({
  T,
  solarFlux,
  atmPressure,
  e_a,
  latentHeat,
  albedo = terraformingParameters.phaseChange.penman.defaultAlbedo,
  r_a = terraformingParameters.phaseChange.penman.aerodynamicResistanceSecondsPerMeter,
  Delta_s,
  e_s,
  criticalTemperature = Infinity,
}) {
  if (typeof Delta_s !== 'number' || typeof e_s !== 'number') {
    throw new Error('penmanRate requires Delta_s and e_s');
  }
  const R_n = (1 - albedo)
    * solarFlux
    * terraformingParameters.phaseChange.penman.netRadiationFraction;
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
    Delta_s * R_n
    + (rho_a_val * terraformingParameters.physical.dryAirSpecificHeatJPerKgK * humidityDeficit) / r_a;
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
   const phaseRateParameters = terraformingParameters.phaseChange.meltingAndFreezing;
   const meltingRateMultiplier = phaseRateParameters.meltingRatePerKSecond;
   const freezingRateMultiplier = phaseRateParameters.freezingRatePerKSecond;
 
   let meltingRate = 0;
   let freezingRate = 0;
 
   if (temperature > freezingPoint) {
     const diff = temperature - freezingPoint;

    const surfaceIceCoverage = iceCoverage;
    const surfaceMeltCap = zoneArea * surfaceIceCoverage;
     const cappedSurfaceIce = surfaceMeltCap;
     const surfaceMeltRate = cappedSurfaceIce * meltingRateMultiplier * diff;
 
     const buriedIceCoverage = 1;
     const buriedMeltCap = zoneArea * buriedIceCoverage * phaseRateParameters.buriedMeltCoverage;
     const cappedBuriedIce = buriedMeltCap;
     const potentialBuriedMeltRate = cappedBuriedIce
      * meltingRateMultiplier
      * diff
      * phaseRateParameters.buriedMeltRateFraction;
 
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

function calculatePhaseTransitionEnergyPerKg(fromPhase, toPhase, temperatureK, thermodynamics) {
  if (fromPhase === toPhase) {
    return 0;
  }

  const meltingPointK = thermodynamics.meltingPointK;
  const latentHeatFusion = thermodynamics.latentHeatFusionJPerKg;
  const latentHeatVaporization = thermodynamics.latentHeatVaporizationJPerKg;
  const latentHeatSublimation = thermodynamics.latentHeatSublimationJPerKg;
  const solidSpecificHeat = thermodynamics.solidSpecificHeatJPerKgK;
  const liquidSpecificHeat = thermodynamics.liquidSpecificHeatJPerKgK;
  const solidToLiquid =
    latentHeatFusion +
    solidSpecificHeat * Math.max(0, meltingPointK - temperatureK) +
    liquidSpecificHeat * Math.max(0, temperatureK - meltingPointK);

  if (fromPhase === 'solid' && toPhase === 'liquid') {
    return solidToLiquid;
  }
  if (fromPhase === 'liquid' && toPhase === 'solid') {
    return -solidToLiquid;
  }
  if (fromPhase === 'liquid' && toPhase === 'gas') {
    return latentHeatVaporization;
  }
  if (fromPhase === 'gas' && toPhase === 'liquid') {
    return -latentHeatVaporization;
  }
  if (fromPhase === 'solid' && toPhase === 'gas') {
    return latentHeatSublimation;
  }
  if (fromPhase === 'gas' && toPhase === 'solid') {
    return -latentHeatSublimation;
  }
  return 0;
}

function resolvePhaseTransitionEnergy(temperatureK, capacityJPerK, transitions) {
  const energy = [];
  let endothermicEnergy = 0;
  let exothermicEnergy = 0;
  let endothermicFloorK = 0;
  let exothermicCeilingK = Infinity;

  for (let index = 0; index < transitions.length; index += 1) {
    const transition = transitions[index];
    const energyPerKg = calculatePhaseTransitionEnergyPerKg(
      transition.fromPhase,
      transition.toPhase,
      temperatureK,
      transition.thermodynamics
    );
    const transitionEnergy = energyPerKg * transition.amount * terraformingParameters.physical.kgPerTon;
    energy.push(transitionEnergy);
    if (transitionEnergy > 0) {
      endothermicEnergy += transitionEnergy;
      endothermicFloorK = Math.max(endothermicFloorK, transition.floorTemperatureK || 0);
    } else if (transitionEnergy < 0) {
      exothermicEnergy += -transitionEnergy;
      exothermicCeilingK = Math.min(
        exothermicCeilingK,
        transition.ceilingTemperatureK || Infinity
      );
    }
  }

  const availableEndothermicEnergy =
    exothermicEnergy +
    capacityJPerK * Math.max(0, temperatureK - endothermicFloorK);
  const endothermicScale = endothermicEnergy > availableEndothermicEnergy
    ? availableEndothermicEnergy / endothermicEnergy
    : 1;
  const acceptedEndothermicEnergy = endothermicEnergy * endothermicScale;

  const maximumExothermicEnergy = exothermicCeilingK < Infinity
    ? acceptedEndothermicEnergy + capacityJPerK * Math.max(0, exothermicCeilingK - temperatureK)
    : exothermicEnergy;
  const exothermicScale = exothermicEnergy > maximumExothermicEnergy
    ? maximumExothermicEnergy / exothermicEnergy
    : 1;
  const acceptedExothermicEnergy = exothermicEnergy * exothermicScale;

  const acceptedAmounts = [];
  for (let index = 0; index < transitions.length; index += 1) {
    const scale = energy[index] > 0
      ? endothermicScale
      : (energy[index] < 0 ? exothermicScale : 1);
    acceptedAmounts.push(transitions[index].amount * scale);
  }

  const netAbsorbedEnergy = acceptedEndothermicEnergy - acceptedExothermicEnergy;
  return {
    acceptedAmounts,
    netHeatEnergyJ: -netAbsorbedEnergy,
    finalTemperatureK: capacityJPerK > 0
      ? Math.max(0, temperatureK - netAbsorbedEnergy / capacityJPerK)
      : temperatureK,
  };
}

 if (isNodePCU) {
   module.exports = {
     psychrometricConstant,
     penmanRate,
     meltingFreezingRates,
     calculatePhaseTransitionEnergyPerKg,
     resolvePhaseTransitionEnergy,
   };
 } else {
   globalThis.psychrometricConstant = psychrometricConstant;
   globalThis.penmanRate = penmanRate;
   globalThis.meltingFreezingRates = meltingFreezingRates;
 }
