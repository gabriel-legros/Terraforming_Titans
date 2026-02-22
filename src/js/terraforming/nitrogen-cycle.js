// nitrogen-cycle.js — N₂ (nitrogen, tracked as inertGas) phase-change cycle
(function () {
  const L_V_NITROGEN = 1.99e5; // J/kg latent heat of vaporization
  const L_S_NITROGEN = 2.60e5; // J/kg latent heat of sublimation
  const EVAP_ALBEDO_NITROGEN = 0.12;
  const SUBLIMATION_ALBEDO_NITROGEN_ICE = 0.80;

  const NITROGEN_T_TRIPLE = 63.151;  // K
  const NITROGEN_P_TRIPLE = 1.253e4; // Pa
  const NITROGEN_T_CRIT = 126.192;   // K
  const NITROGEN_P_CRIT = 3.396e6;   // Pa
  const NITROGEN_BOILING_T = 77.355; // K (1 atm)
  const NITROGEN_BOILING_P = 101325; // Pa

  const NITROGEN_MOLAR_MASS = 0.0280134; // kg/mol
  const NITROGEN_GAS_CONSTANT = 8.314462618; // J/mol/K
  var DEFAULT_EQUILIBRIUM_NITROGEN_CONDENSATION_PARAMETER = 0.002;

  var resourcePhaseGroups;
  var psychrometricConstant;
  var redistributePrecipitationFn;
  var ResourceCycleClass;

  try {
    resourcePhaseGroups = window.resourcePhaseGroups;
    psychrometricConstant = window.psychrometricConstant;
    redistributePrecipitationFn = window.redistributePrecipitation;
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
    redistributePrecipitationFn = redistributePrecipitationFn || phaseUtils.redistributePrecipitation;
    ResourceCycleClass = ResourceCycleClass || require('./resource-cycle.js');
  } catch (error) {
    // fall back to globals if require fails
  }

  redistributePrecipitationFn = redistributePrecipitationFn || (() => {});

  const NITROGEN_LIQ_B = (Math.log(NITROGEN_BOILING_P) - Math.log(NITROGEN_P_TRIPLE))
    / ((1 / NITROGEN_T_TRIPLE) - (1 / NITROGEN_BOILING_T));
  const NITROGEN_LIQ_A = Math.log(NITROGEN_P_TRIPLE) + NITROGEN_LIQ_B / NITROGEN_T_TRIPLE;

  const NITROGEN_SOLID_B = (L_S_NITROGEN * NITROGEN_MOLAR_MASS) / NITROGEN_GAS_CONSTANT;
  const NITROGEN_SOLID_A = Math.log(NITROGEN_P_TRIPLE) + NITROGEN_SOLID_B / NITROGEN_T_TRIPLE;

  function psatNitrogenSolid(T) {
    return Math.exp(NITROGEN_SOLID_A - NITROGEN_SOLID_B / T);
  }

  function psatNitrogenLiquid(T) {
    return Math.exp(NITROGEN_LIQ_A - NITROGEN_LIQ_B / T);
  }

  function calculateSaturationPressureNitrogen(T) {
    if (T >= NITROGEN_T_CRIT) return NITROGEN_P_CRIT;
    if (T < NITROGEN_T_TRIPLE) return psatNitrogenSolid(T);
    return psatNitrogenLiquid(T);
  }

  const CRITICAL_SVP_SLOPE_NITROGEN = (() => {
    const h = 0.01;
    const p1 = psatNitrogenLiquid(NITROGEN_T_CRIT - h);
    const p2 = psatNitrogenLiquid(NITROGEN_T_CRIT);
    return Math.max(0, (p2 - p1) / h);
  })();

  function slopeSVPNitrogen(T) {
    const h = 0.01;
    if (T >= NITROGEN_T_CRIT) return CRITICAL_SVP_SLOPE_NITROGEN;
    const T1 = Math.max(1, T - h);
    const T2 = T + h;
    const p1 = calculateSaturationPressureNitrogen(T1);
    const p2 = calculateSaturationPressureNitrogen(T2);
    return Math.max((p2 - p1) / (T2 - T1), 0);
  }

  class NitrogenCycle extends ResourceCycleClass {
  constructor({
    key = 'nitrogen',
    atmKey = 'inertGas',
    totalKeys = ['evaporation', 'sublimation', 'rapidSublimation', 'boiling', 'melt', 'freeze'],
    processTotalKeys = { rain: 'nitrogenRain', snow: 'nitrogenSnow' },
    transitionRange = 2,
    maxDiff = 10,
    boilingPointFn = boilingPointNitrogen,
    boilTransitionRange = 5,
    zonalKey = 'zonalSurface',
    surfaceBucket = 'nitrogen',
    atmosphereKey = 'inertGas',
    availableKeys = ['liquid', 'ice', 'buriedIce'],
    gravity = 1,
    condensationParameter = DEFAULT_EQUILIBRIUM_NITROGEN_CONDENSATION_PARAMETER,
  } = {}) {
    const coverageKeys = resourcePhaseGroups.nitrogen.coverageKeys;
    const precipitationKeys = {
      liquid: 'potentialNitrogenRain',
      solid: 'potentialNitrogenSnow',
    };
    const finalizeProcesses = [
      {
        container: 'precipitation',
        potentialKey: 'potentialNitrogenRain',
        precipitationKey: 'nitrogenRain',
        surfaceBucket: 'nitrogen',
        surfaceKey: 'liquid',
        totalKey: 'nitrogenRain',
      },
      {
        container: 'precipitation',
        potentialKey: 'potentialNitrogenSnow',
        precipitationKey: 'nitrogenSnow',
        surfaceBucket: 'nitrogen',
        surfaceKey: 'ice',
        totalKey: 'nitrogenSnow',
      },
    ];
    const rateMappings = {
      evaporation: [
        { path: 'atmospheric.inertGas', label: 'Evaporation', sign: +1 },
        { path: 'surface.liquidNitrogen', label: 'Nitrogen Evaporation', sign: -1 },
      ],
      sublimation: [
        { path: 'atmospheric.inertGas', label: 'Sublimation', sign: +1 },
        { path: 'surface.nitrogenIce', label: 'Nitrogen Sublimation', sign: -1 },
      ],
      rapidSublimation: [
        { path: 'atmospheric.inertGas', label: 'Rapid Sublimation', sign: +1 },
        { path: 'surface.nitrogenIce', label: 'Rapid Sublimation', sign: -1 },
      ],
      boiling: [
        { path: 'atmospheric.inertGas', label: 'Boiling', sign: +1 },
        { path: 'surface.liquidNitrogen', label: 'Nitrogen Boiling', sign: -1 },
      ],
      nitrogenRain: [
        { path: 'atmospheric.inertGas', label: 'Condensation', sign: -1 },
        { path: 'surface.liquidNitrogen', label: 'Nitrogen Condensation', sign: +1 },
      ],
      nitrogenSnow: [
        { path: 'atmospheric.inertGas', label: 'Deposition', sign: -1 },
        { path: 'surface.nitrogenIce', label: 'Nitrogen Deposition', sign: +1 },
      ],
      rain: [
        { path: 'atmospheric.inertGas', label: 'Condensation', sign: -1 },
        { path: 'surface.liquidNitrogen', label: 'Nitrogen Condensation', sign: +1 },
      ],
      snow: [
        { path: 'atmospheric.inertGas', label: 'Deposition', sign: -1 },
        { path: 'surface.nitrogenIce', label: 'Nitrogen Deposition', sign: +1 },
      ],
      melt: [
        { path: 'surface.liquidNitrogen', label: 'Melt', sign: +1 },
        { path: 'surface.nitrogenIce', label: 'Melt', sign: -1 },
      ],
      freeze: [
        { path: 'surface.liquidNitrogen', label: 'Freeze', sign: -1 },
        { path: 'surface.nitrogenIce', label: 'Freeze', sign: +1 },
      ],
      freezeOut: [
        { path: 'surface.liquidNitrogen', label: 'Freeze Out', sign: -1 },
        { path: 'surface.nitrogenIce', label: 'Freeze Out', sign: +1 },
      ],
    };
    const surfaceKeyMap = resourcePhaseGroups.nitrogen.surfaceKeys;

    super({
      latentHeatVaporization: L_V_NITROGEN,
      latentHeatSublimation: L_S_NITROGEN,
      saturationVaporPressureFn: calculateSaturationPressureNitrogen,
      slopeSaturationVaporPressureFn: slopeSVPNitrogen,
      freezePoint: NITROGEN_T_TRIPLE,
      sublimationPoint: NITROGEN_T_TRIPLE,
      evaporationAlbedo: EVAP_ALBEDO_NITROGEN,
      sublimationAlbedo: SUBLIMATION_ALBEDO_NITROGEN_ICE,
      tripleTemperature: NITROGEN_T_TRIPLE,
      triplePressure: NITROGEN_P_TRIPLE,
      disallowLiquidBelowTriple: true,
      criticalTemperature: NITROGEN_T_CRIT,
      coverageKeys,
      precipitationKeys,
      rateMappings,
      finalizeProcesses,
      surfaceKeyMap,
      rateTotalsPrefix: 'Nitrogen',
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
      liquidNitrogenCoverage: data.liquidNitrogen ?? 0,
      nitrogenIceCoverage: data.nitrogenIce ?? 0,
    };
  }

  redistributePrecipitation(terraforming, zonalChanges, zonalTemperatures) {
    redistributePrecipitationFn(terraforming, 'nitrogen', zonalChanges, zonalTemperatures);
  }

  updateResourceRates(terraforming, totals = {}, durationSeconds = 1) {
    super.updateResourceRates(terraforming, totals, durationSeconds);
    const rapid = terraforming.totalNitrogenRapidSublimationRate || 0;
    terraforming.totalNitrogenSublimationRate = (terraforming.totalNitrogenSublimationRate || 0) + rapid;
  }
}

  const nitrogenCycle = new NitrogenCycle();

  function psychrometricConstantNitrogen(atmPressure) {
    return psychrometricConstant(atmPressure, L_V_NITROGEN);
  }

  function boilingPointNitrogen(atmPressure) {
    if (!(atmPressure > 0)) return undefined;
    if (atmPressure <= NITROGEN_P_TRIPLE) return undefined;
    if (atmPressure >= NITROGEN_P_CRIT) return NITROGEN_T_CRIT;

    let lo = NITROGEN_T_TRIPLE + 1e-6;
    let hi = NITROGEN_T_CRIT - 1e-6;
    for (let i = 0; i < 60; i++) {
      const mid = 0.5 * (lo + hi);
      const p = calculateSaturationPressureNitrogen(mid);
      if (p > atmPressure) hi = mid; else lo = mid;
    }
    return 0.5 * (lo + hi);
  }

  function evaporationRateNitrogen(T, solarFlux, atmPressure, e_a, r_a = 100) {
    return nitrogenCycle.evaporationRate({ T, solarFlux, atmPressure, vaporPressure: e_a, r_a });
  }

  function sublimationRateNitrogen(T, solarFlux, atmPressure, e_a, r_a = 100) {
    return nitrogenCycle.sublimationRate({ T, solarFlux, atmPressure, vaporPressure: e_a, r_a });
  }

  try {
    module.exports = {
      NitrogenCycle,
      nitrogenCycle,
      calculateSaturationPressureNitrogen,
      slopeSVPNitrogen,
      psychrometricConstantNitrogen,
      evaporationRateNitrogen,
      sublimationRateNitrogen,
      boilingPointNitrogen,
    };
  } catch (error) {
    // Browser-only export.
  }

  try {
    globalThis.NitrogenCycle = NitrogenCycle;
    globalThis.nitrogenCycle = nitrogenCycle;
  } catch (error) {
    // Global not available.
  }
})();
