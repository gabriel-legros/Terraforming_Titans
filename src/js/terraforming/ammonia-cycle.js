// Constants for Ammonia
const L_V_AMMONIA = 1.37e6; // Latent heat of vaporization for ammonia (J/kg)
const L_S_AMMONIA = 1.65e6; // Latent heat of sublimation for ammonia (J/kg)
const EVAP_ALBEDO_AMMONIA = 0.12; // Albedo of liquid ammonia for evaporation calculations
const SUBLIMATION_ALBEDO_AMMONIA_ICE = 0.70; // Albedo of ammonia ice for sublimation calculations

const AMMONIA_T_TRIPLE = 195.40;   // K
const AMMONIA_P_TRIPLE = 6.06e3;   // Pa
const AMMONIA_T_CRIT = 405.40;     // K
const AMMONIA_P_CRIT = 11.33e6;    // Pa
const AMMONIA_BOILING_T = 239.81;  // K (1 atm)
const AMMONIA_BOILING_P = 101325;  // Pa
const AMMONIA_MOLAR_MASS = 0.017031; // kg/mol
const GAS_CONSTANT = 8.314462618; // J/mol/K
var DEFAULT_EQUILIBRIUM_AMMONIA_CONDENSATION_PARAMETER = 0.002;

let isNodeAmmoniaCycle = false;
try {
  isNodeAmmoniaCycle = !!module.exports;
} catch (error) {
  isNodeAmmoniaCycle = false;
}

var resourcePhaseGroups;
var psychrometricConstant;
var redistributePrecipitationFn;
var ResourceCycleClass;
var simulateSurfaceAmmoniaFlow;

try {
  resourcePhaseGroups = window.resourcePhaseGroups;
  psychrometricConstant = window.psychrometricConstant;
  redistributePrecipitationFn = window.redistributePrecipitation;
  ResourceCycleClass = window.ResourceCycle;
  simulateSurfaceAmmoniaFlow = window.simulateSurfaceAmmoniaFlow;
} catch (error) {
  // Browser globals not available.
}

try {
  require('../planet-resource-parameters.js');
  resourcePhaseGroups = resourcePhaseGroups || global.resourcePhaseGroups;
} catch (error) {
  // Globals will be used if available.
}

try {
  const phaseUtils = require('./phase-change-utils.js');
  psychrometricConstant = psychrometricConstant || phaseUtils.psychrometricConstant;
  redistributePrecipitationFn = redistributePrecipitationFn || phaseUtils.redistributePrecipitation;
  ResourceCycleClass = ResourceCycleClass || require('./resource-cycle.js');
} catch (error) {
  // fall back to globals if require fails
}

try {
  const hydro = require('./hydrology.js');
  simulateSurfaceAmmoniaFlow = simulateSurfaceAmmoniaFlow || hydro.simulateSurfaceAmmoniaFlow;
} catch (error) {
  // fall back to globals if require fails
}

redistributePrecipitationFn = redistributePrecipitationFn || (() => {});
simulateSurfaceAmmoniaFlow = simulateSurfaceAmmoniaFlow || (() => ({
  changes: {},
  totalMelt: 0,
  totalFreezeOut: 0,
  totalGasMelt: 0,
}));

const AMMONIA_LIQ_B = (Math.log(AMMONIA_BOILING_P) - Math.log(AMMONIA_P_TRIPLE))
  / ((1 / AMMONIA_T_TRIPLE) - (1 / AMMONIA_BOILING_T));
const AMMONIA_LIQ_A = Math.log(AMMONIA_P_TRIPLE) + AMMONIA_LIQ_B / AMMONIA_T_TRIPLE;

const AMMONIA_SOLID_B = (L_S_AMMONIA * AMMONIA_MOLAR_MASS) / GAS_CONSTANT;
const AMMONIA_SOLID_A = Math.log(AMMONIA_P_TRIPLE) + AMMONIA_SOLID_B / AMMONIA_T_TRIPLE;

function psatAmmoniaSolid(T) {
  return Math.exp(AMMONIA_SOLID_A - AMMONIA_SOLID_B / T);
}

function psatAmmoniaLiquid(T) {
  return Math.exp(AMMONIA_LIQ_A - AMMONIA_LIQ_B / T);
}

function calculateSaturationPressureAmmonia(T) {
  if (T >= AMMONIA_T_CRIT) return AMMONIA_P_CRIT;
  if (T < AMMONIA_T_TRIPLE) return psatAmmoniaSolid(T);
  return psatAmmoniaLiquid(T);
}

const CRITICAL_SVP_SLOPE_AMMONIA = (() => {
  const h = 0.01;
  const p1 = psatAmmoniaLiquid(AMMONIA_T_CRIT - h);
  const p2 = psatAmmoniaLiquid(AMMONIA_T_CRIT);
  const slope = (p2 - p1) / h;
  return Math.max(0, slope);
})();

function slopeSVPAmmonia(T) {
  const h = 0.01;
  if (T >= AMMONIA_T_CRIT) return CRITICAL_SVP_SLOPE_AMMONIA;
  const T1 = Math.max(1, T - h);
  const T2 = T + h;
  const p1 = calculateSaturationPressureAmmonia(T1);
  const p2 = calculateSaturationPressureAmmonia(T2);
  const dPdT = (p2 - p1) / (T2 - T1);
  return Math.max(dPdT, 0);
}

class AmmoniaCycle extends ResourceCycleClass {
  constructor({
    key = 'ammonia',
    atmKey = 'atmosphericAmmonia',
    totalKeys = ['evaporation', 'sublimation', 'rapidSublimation', 'melt', 'freeze'],
    processTotalKeys = { rain: 'ammoniaRain', snow: 'ammoniaSnow' },
    transitionRange = 2,
    maxDiff = 10,
    boilingPointFn = boilingPointAmmonia,
    boilTransitionRange = 5,
    zonalKey = 'zonalSurface',
    surfaceBucket = 'ammonia',
    atmosphereKey = 'ammonia',
    availableKeys = ['liquid', 'ice', 'buriedIce'],
    gravity = 1,
    condensationParameter = DEFAULT_EQUILIBRIUM_AMMONIA_CONDENSATION_PARAMETER,
  } = {}) {
    const coverageKeys = resourcePhaseGroups.ammonia.coverageKeys;
    const precipitationKeys = {
      liquid: 'potentialAmmoniaRain',
      solid: 'potentialAmmoniaSnow',
    };
    const finalizeProcesses = [
      {
        container: 'precipitation',
        potentialKey: 'potentialAmmoniaRain',
        precipitationKey: 'ammoniaRain',
        surfaceBucket: 'ammonia',
        surfaceKey: 'liquid',
        totalKey: 'ammoniaRain',
      },
      {
        container: 'precipitation',
        potentialKey: 'potentialAmmoniaSnow',
        precipitationKey: 'ammoniaSnow',
        surfaceBucket: 'ammonia',
        surfaceKey: 'ice',
        totalKey: 'ammoniaSnow',
      },
    ];
    const rateMappings = {
      evaporation: [
        { path: 'atmospheric.atmosphericAmmonia', label: 'Evaporation', sign: +1 },
        { path: 'surface.liquidAmmonia', label: 'Ammonia Evaporation', sign: -1 },
      ],
      sublimation: [
        { path: 'atmospheric.atmosphericAmmonia', label: 'Sublimation', sign: +1 },
        { path: 'surface.ammoniaIce', label: 'Ammonia Sublimation', sign: -1 },
      ],
      rapidSublimation: [
        { path: 'atmospheric.atmosphericAmmonia', label: 'Rapid Sublimation', sign: +1 },
        { path: 'surface.ammoniaIce', label: 'Rapid Sublimation', sign: -1 },
      ],
      ammoniaRain: [
        { path: 'atmospheric.atmosphericAmmonia', label: 'Rain', sign: -1 },
        { path: 'surface.liquidAmmonia', label: 'Ammonia Rain', sign: +1 },
      ],
      ammoniaSnow: [
        { path: 'atmospheric.atmosphericAmmonia', label: 'Snow', sign: -1 },
        { path: 'surface.ammoniaIce', label: 'Ammonia Snow', sign: +1 },
      ],
      rain: [
        { path: 'atmospheric.atmosphericAmmonia', label: 'Rain', sign: -1 },
        { path: 'surface.liquidAmmonia', label: 'Ammonia Rain', sign: +1 },
      ],
      snow: [
        { path: 'atmospheric.atmosphericAmmonia', label: 'Snow', sign: -1 },
        { path: 'surface.ammoniaIce', label: 'Ammonia Snow', sign: +1 },
      ],
      melt: [
        { path: 'surface.liquidAmmonia', label: 'Melt', sign: +1 },
        { path: 'surface.ammoniaIce', label: 'Melt', sign: -1 },
      ],
      freeze: [
        { path: 'surface.liquidAmmonia', label: 'Freeze', sign: -1 },
        { path: 'surface.ammoniaIce', label: 'Freeze', sign: +1 },
      ],
      freezeOut: [
        { path: 'surface.liquidAmmonia', label: 'Freeze Out', sign: -1 },
        { path: 'surface.ammoniaIce', label: 'Freeze Out', sign: +1 },
      ],
      flowMelt: [
        { path: 'surface.liquidAmmonia', label: 'Flow Melt', sign: +1 },
        { path: 'surface.ammoniaIce', label: 'Flow Melt', sign: -1 },
      ],
    };
    const surfaceKeyMap = resourcePhaseGroups.ammonia.surfaceKeys;
    const surfaceFlowFn = (terraforming, durationSeconds, tempMap) => {
      const flow = simulateSurfaceAmmoniaFlow(terraforming, durationSeconds, tempMap, undefined, {
        triplePressure: AMMONIA_P_TRIPLE,
        disallowLiquidBelowTriple: true,
        boilingPointFn: boilingPointAmmonia,
      }) || { changes: {}, totalMelt: 0 };
      const totalMelt = flow.totalMelt || 0;
      const freezeOut = flow.totalFreezeOut || 0;
      const totalGasMelt = flow.totalGasMelt || 0;
      const rateScale = 86400 / Math.max(durationSeconds, 1e-9);
      terraforming.flowAmmoniaMeltAmount = totalMelt;
      terraforming.flowAmmoniaMeltRate = totalMelt * rateScale;
      terraforming.flowAmmoniaFreezeOutAmount = freezeOut;
      terraforming.flowAmmoniaFreezeOutRate = freezeOut * rateScale;
      return {
        changes: flow.changes || {},
        totals: {
          flowMelt: totalMelt,
          freezeOut,
          rapidSublimation: totalGasMelt,
          totalAtmosphericChange: totalGasMelt,
        },
      };
    };

    super({
      latentHeatVaporization: L_V_AMMONIA,
      latentHeatSublimation: L_S_AMMONIA,
      saturationVaporPressureFn: calculateSaturationPressureAmmonia,
      slopeSaturationVaporPressureFn: slopeSVPAmmonia,
      freezePoint: AMMONIA_T_TRIPLE,
      sublimationPoint: AMMONIA_T_TRIPLE,
      evaporationAlbedo: EVAP_ALBEDO_AMMONIA,
      sublimationAlbedo: SUBLIMATION_ALBEDO_AMMONIA_ICE,
      tripleTemperature: AMMONIA_T_TRIPLE,
      triplePressure: AMMONIA_P_TRIPLE,
      disallowLiquidBelowTriple: true,
      criticalTemperature: AMMONIA_T_CRIT,
      coverageKeys,
      precipitationKeys,
      surfaceFlowFn,
      rateMappings,
      finalizeProcesses,
      surfaceKeyMap,
      rateTotalsPrefix: 'Ammonia',
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
    this.defaultExtraParams = { gravity };
    this.equilibriumCondensationParameter = condensationParameter;
  }

  getExtraParams(terraforming) {
    return {
      gravity: terraforming.celestialParameters.gravity,
      condensationParameter: this.equilibriumCondensationParameter,
    };
  }

  getCoverage(zone, cache = {}) {
    const data = cache[zone] || {};
    return {
      liquidAmmoniaCoverage: data.liquidAmmonia ?? 0,
      ammoniaIceCoverage: data.ammoniaIce ?? 0,
    };
  }

  redistributePrecipitation(terraforming, zonalChanges, zonalTemperatures) {
    redistributePrecipitationFn(terraforming, 'ammonia', zonalChanges, zonalTemperatures);
  }

  updateResourceRates(terraforming, totals = {}, durationSeconds = 1) {
    super.updateResourceRates(terraforming, totals, durationSeconds);
    const rapid = terraforming.totalAmmoniaRapidSublimationRate || 0;
    terraforming.totalAmmoniaSublimationRate = (terraforming.totalAmmoniaSublimationRate || 0) + rapid;
  }
}

const ammoniaCycle = new AmmoniaCycle();

function psychrometricConstantAmmonia(atmPressure) {
  return psychrometricConstant(atmPressure, L_V_AMMONIA);
}

function boilingPointAmmonia(atmPressure) {
  if (atmPressure <= AMMONIA_P_TRIPLE) return 0;
  if (atmPressure >= AMMONIA_P_CRIT) return AMMONIA_T_CRIT;

  let lo = AMMONIA_T_TRIPLE + 1e-6;
  let hi = AMMONIA_T_CRIT - 1e-6;
  for (let i = 0; i < 60; i++) {
    const mid = 0.5 * (lo + hi);
    const p = calculateSaturationPressureAmmonia(mid);
    if (p > atmPressure) hi = mid; else lo = mid;
  }
  return 0.5 * (lo + hi);
}

function evaporationRateAmmonia(T, solarFlux, atmPressure, e_a, r_a = 100) {
  return ammoniaCycle.evaporationRate({ T, solarFlux, atmPressure, vaporPressure: e_a, r_a });
}

function sublimationRateAmmonia(T, solarFlux, atmPressure, e_a, r_a = 100) {
  return ammoniaCycle.sublimationRate({ T, solarFlux, atmPressure, vaporPressure: e_a, r_a });
}

function calculateAmmoniaEvaporationRate({
  zoneArea,
  liquidAmmoniaCoverage,
  dayTemperature,
  nightTemperature,
  ammoniaVaporPressure,
  avgAtmPressure,
  zonalSolarFlux
}) {
  if (zoneArea <= 0 || liquidAmmoniaCoverage <= 0) {
    return 0;
  }

  const liquidCoveredArea = zoneArea * liquidAmmoniaCoverage;
  const daySolarFlux = 2 * zonalSolarFlux;
  const nightSolarFlux = 0;

  const dayEvaporationRate =
    evaporationRateAmmonia(dayTemperature, daySolarFlux, avgAtmPressure, ammoniaVaporPressure, 100)
      * liquidCoveredArea / 1000;

  const nightEvaporationRate =
    evaporationRateAmmonia(nightTemperature, nightSolarFlux, avgAtmPressure, ammoniaVaporPressure, 100)
      * liquidCoveredArea / 1000;

  return (dayEvaporationRate + nightEvaporationRate) / 2;
}

function calculateAmmoniaSublimationRate({
  zoneArea,
  ammoniaIceCoverage,
  dayTemperature,
  nightTemperature,
  ammoniaVaporPressure,
  avgAtmPressure,
  zonalSolarFlux
}) {
  if (zoneArea <= 0 || ammoniaIceCoverage <= 0) {
    return 0;
  }

  const iceCoveredArea = zoneArea * ammoniaIceCoverage;
  const daySolarFlux = 2 * zonalSolarFlux;
  const nightSolarFlux = 0;

  const daySublimationRate =
    sublimationRateAmmonia(dayTemperature, daySolarFlux, avgAtmPressure, ammoniaVaporPressure, 100)
      * iceCoveredArea / 1000;

  const nightSublimationRate =
    sublimationRateAmmonia(nightTemperature, nightSolarFlux, avgAtmPressure, ammoniaVaporPressure, 100)
      * iceCoveredArea / 1000;

  return (daySublimationRate + nightSublimationRate) / 2;
}

if (isNodeAmmoniaCycle) {
  module.exports = {
    AmmoniaCycle,
    ammoniaCycle,
    calculateSaturationPressureAmmonia,
    slopeSVPAmmonia,
    psychrometricConstantAmmonia,
    evaporationRateAmmonia,
    calculateAmmoniaEvaporationRate,
    sublimationRateAmmonia,
    calculateAmmoniaSublimationRate,
    boilingPointAmmonia,
    EVAP_ALBEDO_AMMONIA,
    SUBLIMATION_ALBEDO_AMMONIA_ICE
  };
} else {
  try {
    window.AmmoniaCycle = AmmoniaCycle;
    window.ammoniaCycle = ammoniaCycle;
    window.calculateSaturationPressureAmmonia = calculateSaturationPressureAmmonia;
    window.slopeSVPAmmonia = slopeSVPAmmonia;
    window.psychrometricConstantAmmonia = psychrometricConstantAmmonia;
    window.evaporationRateAmmonia = evaporationRateAmmonia;
    window.calculateAmmoniaEvaporationRate = calculateAmmoniaEvaporationRate;
    window.sublimationRateAmmonia = sublimationRateAmmonia;
    window.calculateAmmoniaSublimationRate = calculateAmmoniaSublimationRate;
    window.boilingPointAmmonia = boilingPointAmmonia;
    window.EVAP_ALBEDO_AMMONIA = EVAP_ALBEDO_AMMONIA;
    window.SUBLIMATION_ALBEDO_AMMONIA_ICE = SUBLIMATION_ALBEDO_AMMONIA_ICE;
  } catch (error) {
    // Browser globals unavailable.
  }
}
