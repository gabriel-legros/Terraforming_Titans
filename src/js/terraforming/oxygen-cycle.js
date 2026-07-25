// oxygen-cycle.js — O₂ (oxygen) phase-change cycle (gas ↔ liquid ↔ ice)
(function () {
  // Thermodynamic constants (approximate, used for gameplay-phase transitions)
  const OXYGEN_PHASE_CHANGE_PARAMETERS = terraformingParameters.phaseChange.oxygen;
  const L_V_OXYGEN = OXYGEN_PHASE_CHANGE_PARAMETERS.latentHeatVaporizationJPerKg;
  const L_S_OXYGEN = OXYGEN_PHASE_CHANGE_PARAMETERS.latentHeatSublimationJPerKg;
  const EVAP_ALBEDO_OXYGEN = OXYGEN_PHASE_CHANGE_PARAMETERS.liquidAlbedo;
  const SUBLIMATION_ALBEDO_OXYGEN_ICE = OXYGEN_PHASE_CHANGE_PARAMETERS.solidAlbedo;

  const OXYGEN_T_TRIPLE = OXYGEN_PHASE_CHANGE_PARAMETERS.triplePointTemperatureK;
  const OXYGEN_P_TRIPLE = OXYGEN_PHASE_CHANGE_PARAMETERS.triplePointPressurePa;
  const OXYGEN_T_CRIT = OXYGEN_PHASE_CHANGE_PARAMETERS.criticalPointTemperatureK;
  const OXYGEN_P_CRIT = OXYGEN_PHASE_CHANGE_PARAMETERS.criticalPointPressurePa;
  const OXYGEN_BOILING_T = OXYGEN_PHASE_CHANGE_PARAMETERS.boilingPointTemperatureK;
  const OXYGEN_BOILING_P = OXYGEN_PHASE_CHANGE_PARAMETERS.boilingPointPressurePa;

  const OXYGEN_MOLAR_MASS = OXYGEN_PHASE_CHANGE_PARAMETERS.molarMassKgPerMol;
  const OXYGEN_GAS_CONSTANT = terraformingParameters.physical.universalGasConstant;
  var DEFAULT_EQUILIBRIUM_OXYGEN_CONDENSATION_PARAMETER = OXYGEN_PHASE_CHANGE_PARAMETERS.equilibriumCondensationParameter;

  var resourcePhaseGroups;
  var psychrometricConstant;
  var ResourceCycleClass;

  try {
    resourcePhaseGroups = window.resourcePhaseGroups;
    psychrometricConstant = window.psychrometricConstant;
    ResourceCycleClass = window.ResourceCycle;
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
    ResourceCycleClass = ResourceCycleClass || require('./resource-cycle.js');
  } catch (error) {
    // fall back to globals if require fails
  }

  const OXYGEN_LIQ_B = (Math.log(OXYGEN_BOILING_P) - Math.log(OXYGEN_P_TRIPLE))
    / ((1 / OXYGEN_T_TRIPLE) - (1 / OXYGEN_BOILING_T));
  const OXYGEN_LIQ_A = Math.log(OXYGEN_P_TRIPLE) + OXYGEN_LIQ_B / OXYGEN_T_TRIPLE;

  const OXYGEN_SOLID_B = (L_S_OXYGEN * OXYGEN_MOLAR_MASS) / OXYGEN_GAS_CONSTANT;
  const OXYGEN_SOLID_A = Math.log(OXYGEN_P_TRIPLE) + OXYGEN_SOLID_B / OXYGEN_T_TRIPLE;

  function psatOxygenSolid(T) {
    return Math.exp(OXYGEN_SOLID_A - OXYGEN_SOLID_B / T);
  }

  function psatOxygenLiquid(T) {
    return Math.exp(OXYGEN_LIQ_A - OXYGEN_LIQ_B / T);
  }

  function calculateSaturationPressureOxygen(T) {
    if (T >= OXYGEN_T_CRIT) return OXYGEN_P_CRIT;
    if (T < OXYGEN_T_TRIPLE) return psatOxygenSolid(T);
    return psatOxygenLiquid(T);
  }

  const CRITICAL_SVP_SLOPE_OXYGEN = (() => {
    const h = 0.01;
    const p1 = psatOxygenLiquid(OXYGEN_T_CRIT - h);
    const p2 = psatOxygenLiquid(OXYGEN_T_CRIT);
    return Math.max(0, (p2 - p1) / h);
  })();

  function slopeSVPOxygen(T) {
    const h = 0.01;
    if (T >= OXYGEN_T_CRIT) return CRITICAL_SVP_SLOPE_OXYGEN;
    const T1 = Math.max(1, T - h);
    const T2 = T + h;
    const p1 = calculateSaturationPressureOxygen(T1);
    const p2 = calculateSaturationPressureOxygen(T2);
    return Math.max((p2 - p1) / (T2 - T1), 0);
  }

  class OxygenCycle extends ResourceCycleClass {
  constructor({
    key = 'oxygen',
    atmKey = 'oxygen',
    totalKeys = ['evaporation', 'sublimation', 'rapidSublimation', 'boiling', 'melt', 'freeze'],
    processTotalKeys = { rain: 'oxygenRain', snow: 'oxygenSnow' },
    transitionRange = 2,
    maxDiff = 10,
    boilingPointFn = boilingPointOxygen,
    boilTransitionRange = 5,
    zonalKey = 'zonalSurface',
    surfaceBucket = 'oxygen',
    atmosphereKey = 'oxygen',
    availableKeys = ['liquid', 'ice', 'buriedIce'],
    gravity = 1,
    condensationParameter = DEFAULT_EQUILIBRIUM_OXYGEN_CONDENSATION_PARAMETER,
  } = {}) {
    const coverageKeys = resourcePhaseGroups.oxygen.coverageKeys;
    const precipitationKeys = {
      liquid: 'potentialOxygenRain',
      solid: 'potentialOxygenSnow',
    };
    const finalizeProcesses = [
      {
        container: 'precipitation',
        potentialKey: 'potentialOxygenRain',
        precipitationKey: 'oxygenRain',
        surfaceBucket: 'oxygen',
        surfaceKey: 'liquid',
        totalKey: 'oxygenRain',
      },
      {
        container: 'precipitation',
        potentialKey: 'potentialOxygenSnow',
        precipitationKey: 'oxygenSnow',
        surfaceBucket: 'oxygen',
        surfaceKey: 'ice',
        totalKey: 'oxygenSnow',
      },
    ];
    const rateMappings = {
      evaporation: [
        { path: 'atmospheric.oxygen', label: 'Evaporation', sign: +1 },
        { path: 'surface.liquidOxygen', label: 'Oxygen Evaporation', sign: -1 },
      ],
      sublimation: [
        { path: 'atmospheric.oxygen', label: 'Sublimation', sign: +1 },
        { path: 'surface.oxygenIce', label: 'Oxygen Sublimation', sign: -1 },
      ],
      rapidSublimation: [
        { path: 'atmospheric.oxygen', label: 'Rapid Sublimation', sign: +1 },
        { path: 'surface.oxygenIce', label: 'Rapid Sublimation', sign: -1 },
      ],
      boiling: [
        { path: 'atmospheric.oxygen', label: 'Boiling', sign: +1 },
        { path: 'surface.liquidOxygen', label: 'Oxygen Boiling', sign: -1 },
      ],
      oxygenRain: [
        { path: 'atmospheric.oxygen', label: 'Condensation', sign: -1 },
        { path: 'surface.liquidOxygen', label: 'Oxygen Condensation', sign: +1 },
      ],
      oxygenSnow: [
        { path: 'atmospheric.oxygen', label: 'Deposition', sign: -1 },
        { path: 'surface.oxygenIce', label: 'Oxygen Deposition', sign: +1 },
      ],
      rain: [
        { path: 'atmospheric.oxygen', label: 'Condensation', sign: -1 },
        { path: 'surface.liquidOxygen', label: 'Oxygen Condensation', sign: +1 },
      ],
      snow: [
        { path: 'atmospheric.oxygen', label: 'Deposition', sign: -1 },
        { path: 'surface.oxygenIce', label: 'Oxygen Deposition', sign: +1 },
      ],
      melt: [
        { path: 'surface.liquidOxygen', label: 'Melt', sign: +1 },
        { path: 'surface.oxygenIce', label: 'Melt', sign: -1 },
      ],
      freeze: [
        { path: 'surface.liquidOxygen', label: 'Freeze', sign: -1 },
        { path: 'surface.oxygenIce', label: 'Freeze', sign: +1 },
      ],
      freezeOut: [
        { path: 'surface.liquidOxygen', label: 'Freeze Out', sign: -1 },
        { path: 'surface.oxygenIce', label: 'Freeze Out', sign: +1 },
      ],
    };
    const surfaceKeyMap = resourcePhaseGroups.oxygen.surfaceKeys;

    super({
      latentHeatVaporization: L_V_OXYGEN,
      latentHeatSublimation: L_S_OXYGEN,
      latentHeatFusion: OXYGEN_PHASE_CHANGE_PARAMETERS.latentHeatFusionJPerKg,
      solidSpecificHeat: OXYGEN_PHASE_CHANGE_PARAMETERS.solidSpecificHeatJPerKgK,
      liquidSpecificHeat: OXYGEN_PHASE_CHANGE_PARAMETERS.liquidSpecificHeatJPerKgK,
      saturationVaporPressureFn: calculateSaturationPressureOxygen,
      slopeSaturationVaporPressureFn: slopeSVPOxygen,
      freezePoint: OXYGEN_T_TRIPLE,
      sublimationPoint: OXYGEN_T_TRIPLE,
      evaporationAlbedo: EVAP_ALBEDO_OXYGEN,
      sublimationAlbedo: SUBLIMATION_ALBEDO_OXYGEN_ICE,
      tripleTemperature: OXYGEN_T_TRIPLE,
      triplePressure: OXYGEN_P_TRIPLE,
      disallowLiquidBelowTriple: true,
      criticalTemperature: OXYGEN_T_CRIT,
      coverageKeys,
      precipitationKeys,
      rateMappings,
      finalizeProcesses,
      surfaceKeyMap,
      rateTotalsPrefix: 'Oxygen',
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
      liquidOxygenCoverage: data.liquidOxygen ?? 0,
      oxygenIceCoverage: data.oxygenIce ?? 0,
    };
  }

  updateResourceRates(terraforming, totals = {}, durationSeconds = 1) {
    super.updateResourceRates(terraforming, totals, durationSeconds);
    const rapid = terraforming.totalOxygenRapidSublimationRate || 0;
    terraforming.totalOxygenSublimationRate = (terraforming.totalOxygenSublimationRate || 0) + rapid;
  }
}

  const oxygenCycle = new OxygenCycle();

  function psychrometricConstantOxygen(atmPressure) {
    return psychrometricConstant(atmPressure, L_V_OXYGEN);
  }

  function boilingPointOxygen(atmPressure) {
    if (!(atmPressure > 0)) return undefined;
    if (atmPressure <= OXYGEN_P_TRIPLE) return undefined;
    if (atmPressure >= OXYGEN_P_CRIT) return OXYGEN_T_CRIT;

    let lo = OXYGEN_T_TRIPLE + 1e-6;
    let hi = OXYGEN_T_CRIT - 1e-6;
    for (let i = 0; i < 60; i++) {
      const mid = 0.5 * (lo + hi);
      const p = calculateSaturationPressureOxygen(mid);
      if (p > atmPressure) hi = mid; else lo = mid;
    }
    return 0.5 * (lo + hi);
  }

  function evaporationRateOxygen(T, solarFlux, atmPressure, e_a, r_a = 100) {
    return oxygenCycle.evaporationRate({ T, solarFlux, atmPressure, vaporPressure: e_a, r_a });
  }

  function sublimationRateOxygen(T, solarFlux, atmPressure, e_a, r_a = 100) {
    return oxygenCycle.sublimationRate({ T, solarFlux, atmPressure, vaporPressure: e_a, r_a });
  }

  try {
    module.exports = {
      OxygenCycle,
      oxygenCycle,
      calculateSaturationPressureOxygen,
      slopeSVPOxygen,
      psychrometricConstantOxygen,
      evaporationRateOxygen,
      sublimationRateOxygen,
      boilingPointOxygen,
    };
  } catch (error) {
    // Browser-only export.
  }

  try {
    globalThis.OxygenCycle = OxygenCycle;
    globalThis.oxygenCycle = oxygenCycle;
  } catch (error) {
    // Global not available.
  }
})();
