// Base class for resource cycle phase-change calculations
const isNodeResourceCycle = (typeof module !== 'undefined' && module.exports);
let penmanRateFn = isNodeResourceCycle ? null : window.penmanRate;
let condensationPressureStateFn = isNodeResourceCycle ? null : window.calculateCondensationPressureState;
let condensationRateFactorFn = isNodeResourceCycle ? null : window.condensationRateFactor;
let meltingFreezingRatesFn = isNodeResourceCycle ? null : window.meltingFreezingRates;
let resolvePhaseTransitionEnergyFn;
if (isNodeResourceCycle) {
  try {
    const phaseUtils = require('./phase-change-utils.js');
    const condensationUtils = require('./condensation-utils.js');
    penmanRateFn = phaseUtils.penmanRate;
    meltingFreezingRatesFn = phaseUtils.meltingFreezingRates;
    resolvePhaseTransitionEnergyFn = phaseUtils.resolvePhaseTransitionEnergy;
    condensationPressureStateFn = condensationUtils.calculateCondensationPressureState;
    condensationRateFactorFn = condensationUtils.condensationRateFactor;
  } catch (e) {
    // fall back to globals if require fails
  }
} else {
  resolvePhaseTransitionEnergyFn = resolvePhaseTransitionEnergy;
}

function getCycleLabelKey(label) {
  const keys = {
    'Evaporation': 'evaporation',
    'Sublimation': 'sublimation',
    'Rapid Sublimation': 'rapidSublimation',
    'Boiling': 'boiling',
    'Rainfall': 'rainfall',
    'Rain': 'rain',
    'Snowfall': 'snowfall',
    'Snow': 'snow',
    'Melt': 'melt',
    'Freeze': 'freeze',
    'Freeze Out': 'freezeOut',
    'Flow Melt': 'flowMelt',
    'CO2 Evaporation': 'co2Evaporation',
    'CO2 Sublimation': 'co2Sublimation',
    'CO2 Boiling': 'co2Boiling',
    'CO2 Rain': 'co2Rain',
    'CO2 Snow': 'co2Snow',
    'Methane Evaporation': 'methaneEvaporation',
    'Methane Sublimation': 'methaneSublimation',
    'Methane Boiling': 'methaneBoiling',
    'Methane Rain': 'methaneRain',
    'Methane Snow': 'methaneSnow',
    'Ammonia Evaporation': 'ammoniaEvaporation',
    'Ammonia Sublimation': 'ammoniaSublimation',
    'Ammonia Boiling': 'ammoniaBoiling',
    'Ammonia Rain': 'ammoniaRain',
    'Ammonia Snow': 'ammoniaSnow',
    'Oxygen Evaporation': 'oxygenEvaporation',
    'Oxygen Sublimation': 'oxygenSublimation',
    'Oxygen Boiling': 'oxygenBoiling',
    'Oxygen Condensation': 'oxygenCondensation',
    'Oxygen Deposition': 'oxygenDeposition',
    'Nitrogen Evaporation': 'nitrogenEvaporation',
    'Nitrogen Sublimation': 'nitrogenSublimation',
    'Nitrogen Boiling': 'nitrogenBoiling',
    'Nitrogen Condensation': 'nitrogenCondensation',
    'Nitrogen Deposition': 'nitrogenDeposition',
  };
  return keys[label] || '';
}

function localizeRateMappings(rateMappings) {
  for (const totalKey in rateMappings) {
    const mappings = rateMappings[totalKey];
    for (let i = 0; i < mappings.length; i += 1) {
      const mapping = mappings[i];
      const labelKey = getCycleLabelKey(mapping.label);
      if (labelKey) {
        mapping.label = t(`ui.terraforming.cycleLabels.${labelKey}`, {}, mapping.label);
      }
    }
  }
  return rateMappings;
}

class ResourceCycle {
  constructor({
    latentHeatVaporization,
    latentHeatSublimation,
    latentHeatFusion,
    solidSpecificHeat,
    liquidSpecificHeat,
    saturationVaporPressureFn,
    slopeSaturationVaporPressureFn,
    freezePoint,
    sublimationPoint,
    boilingRateMultiplier = terraformingParameters.phaseChange.resourceCycle.boilingRateMultiplier,
    evaporationAlbedo = terraformingParameters.phaseChange.resourceCycle.defaultEvaporationAlbedo,
    sublimationAlbedo = terraformingParameters.phaseChange.resourceCycle.defaultSublimationAlbedo,
    coverageKeys = {},
    precipitationKeys = {},
    surfaceFlowFn = null,
    rateMappings = {},
    finalizeProcesses = [],
    rateTotalsPrefix = '',
    tripleTemperature = null,
    triplePressure = null,
    disallowLiquidBelowTriple = false,
    criticalTemperature = Infinity,
    surfaceKeyMap = null,
  } = {}) {
    this.latentHeatVaporization = latentHeatVaporization;
    this.latentHeatSublimation = latentHeatSublimation;
    this.thermodynamics = {
      latentHeatVaporizationJPerKg: latentHeatVaporization,
      latentHeatSublimationJPerKg: latentHeatSublimation,
      latentHeatFusionJPerKg: latentHeatFusion,
      solidSpecificHeatJPerKgK: solidSpecificHeat,
      liquidSpecificHeatJPerKgK: liquidSpecificHeat,
      meltingPointK: freezePoint,
    };
    this.saturationVaporPressureFn = saturationVaporPressureFn;
    this.slopeSaturationVaporPressureFn = slopeSaturationVaporPressureFn;
    this.freezePoint = freezePoint;
    this.sublimationPoint = sublimationPoint;
    this.boilingRateMultiplier = boilingRateMultiplier;
    this.evaporationAlbedo = evaporationAlbedo;
    this.sublimationAlbedo = sublimationAlbedo;
    this.coverageKeys = coverageKeys;
    this.precipitationKeys = precipitationKeys;
    this.surfaceFlowFn = surfaceFlowFn;
    this.rateMappings = localizeRateMappings(rateMappings);
    this.finalizeProcesses = finalizeProcesses;
    this.rateTotalsPrefix = rateTotalsPrefix;
    this.tripleTemperature = tripleTemperature;
    this.triplePressure = triplePressure;
    this.disallowLiquidBelowTriple = disallowLiquidBelowTriple;
    this.criticalTemperature = criticalTemperature;
    this.surfaceKeyMap = surfaceKeyMap;
  }

  resolveSurfaceKey(key) {
    const map = this.surfaceKeyMap || {};
    return map[key] || key;
  }

  evaporationRate({
    T,
    solarFlux,
    atmPressure,
    vaporPressure: e_a,
    r_a = terraformingParameters.phaseChange.penman.aerodynamicResistanceSecondsPerMeter,
    albedo = this.evaporationAlbedo
  }) {
    const Delta_s = this.slopeSaturationVaporPressureFn(T);
    const e_s = this.saturationVaporPressureFn(T);
    return penmanRateFn({
      T,
      solarFlux,
      atmPressure,
      e_a,
      latentHeat: this.latentHeatVaporization,
      albedo,
      r_a,
      Delta_s,
      e_s,
      criticalTemperature: this.criticalTemperature,
    });
  }

  condensationRateFactor({
    zoneArea,
    gravity,
    dayTemp,
    nightTemp,
    transitionRange,
    statisticalHumidityMean,
    dayPressureState,
    nightPressureState
  }) {
    return condensationRateFactorFn({
      zoneArea,
      gravity,
      dayTemp,
      nightTemp,
      freezePoint: this.freezePoint,
      transitionRange,
      statisticalHumidityMean,
      dayPressureState,
      nightPressureState,
    });
  }

  buildStatisticalHumidityState(terraforming, zones, atmPressure, vaporPressure) {
    const condensationParameters = terraformingParameters.phaseChange.condensation;
    const boilingPoint = this.boilingPointFn ? this.boilingPointFn(atmPressure) : Infinity;
    const byZone = {};
    let totalArea = 0;
    let weightedHumidityScale = 0;

    for (const zone of zones) {
      const temperatures = terraforming.temperature.zones[zone];
      const zoneArea = terraforming.zonalCoverageCache[zone].zoneArea;
      const sharedState = {
        atmPressure,
        saturationFn: this.saturationVaporPressureFn,
        freezePoint: this.freezePoint,
        boilingPoint,
        criticalTemperature: this.criticalTemperature,
        liftPressureFraction: condensationParameters.liftPressureFraction,
        kappa: condensationParameters.adiabaticExponent,
      };
      const dayPressureState = condensationPressureStateFn({
        ...sharedState,
        temp: temperatures.day,
      });
      const nightPressureState = condensationPressureStateFn({
        ...sharedState,
        temp: temperatures.night,
      });
      const humidityScale =
        (dayPressureState.humidityScale + nightPressureState.humidityScale) / 2;

      byZone[zone] = {
        dayPressureState,
        nightPressureState,
        humidityScale,
      };
      totalArea += zoneArea;
      weightedHumidityScale += humidityScale * zoneArea;
    }

    const meanHumidityScale = totalArea > 0 ? weightedHumidityScale / totalArea : 0;
    const meanHumidity = meanHumidityScale > 0 ? vaporPressure / meanHumidityScale : 0;
    for (const zone of zones) {
      byZone[zone].vaporPressure = byZone[zone].humidityScale * meanHumidity;
    }

    return { meanHumidity, boilingPoint, byZone };
  }

  meltingFreezingRates(args) {
    return meltingFreezingRatesFn({ ...args, freezingPoint: this.freezePoint });
  }

  sublimationRate({
    T,
    solarFlux,
    atmPressure,
    vaporPressure: e_a,
    r_a = terraformingParameters.phaseChange.penman.aerodynamicResistanceSecondsPerMeter,
    albedo = this.sublimationAlbedo
  }) {
    const Delta_s = this.slopeSaturationVaporPressureFn(T);
    const e_s = this.saturationVaporPressureFn(T);
    return penmanRateFn({
      T,
      solarFlux,
      atmPressure,
      e_a,
      latentHeat: this.latentHeatSublimation,
      albedo,
      r_a,
      Delta_s,
      e_s,
      criticalTemperature: this.criticalTemperature,
    });
  }

  processZone(params) {
    const {
      zoneArea = 0,
      dayTemperature,
      nightTemperature,
      zoneTemperature,
      atmPressure,
      boilingPoint,
      vaporPressure,
      zonalSolarFlux = 0,
      durationSeconds = 1,
      gravity = 1,
      condensationParameter = 1,
      statisticalHumidityMean,
      dayPressureState,
      nightPressureState,
      availableLiquid = 0,
      availableIce = 0,
      availableBuriedIce = 0,
      phaseChangeHeatEnabled = false,
    } = params;
    const liquidForbidden =
    !!this.disallowLiquidBelowTriple &&
    (typeof this.triplePressure === 'number') &&
    (atmPressure <= this.triplePressure);
    const atmosphereKey = this.atmosphereKey;
    const surfaceBucket = this.surfaceBucket;
    const liquidKey = this.resolveSurfaceKey('liquid');
    const iceKey = this.resolveSurfaceKey('ice');
    const buriedIceKey = this.resolveSurfaceKey('buriedIce');
    const liquidCoverage = this.coverageKeys.liquid
      ? (params[this.coverageKeys.liquid] || 0)
      : 0;
    const iceCoverage = this.coverageKeys.ice
      ? (params[this.coverageKeys.ice] || 0)
      : 0;

    const changes = {
      atmosphere: { [atmosphereKey]: 0 },
      [surfaceBucket]: {},
      precipitation: {},
      phaseTransitions: [],
    };
    const addTransition = (fromPhase, toPhase, amount, totalKey, adjustments, floorTemperatureK, ceilingTemperatureK) => {
      if (!phaseChangeHeatEnabled || !(amount > 0)) {
        return;
      }
      changes.phaseTransitions.push({
        fromPhase,
        toPhase,
        amount,
        totalKey,
        adjustments,
        floorTemperatureK,
        ceilingTemperatureK,
        thermodynamics: this.thermodynamics,
      });
    };

    const daySolarFlux = terraformingParameters.phaseChange.resourceCycle.daytimeSolarFluxMultiplier * zonalSolarFlux;
    const nightSolarFlux = 0;

    const liquidArea = zoneArea * liquidCoverage;
    const iceArea = zoneArea * iceCoverage;

    let evaporationAmount = 0;
    if (liquidArea > 0 && availableLiquid > 0 && typeof this.evaporationRate === 'function') {
      let dayEvap = 0;
      let nightEvap = 0;
      if (typeof dayTemperature === 'number') {
        dayEvap = this.evaporationRate({
          T: dayTemperature,
          solarFlux: daySolarFlux,
          atmPressure,
          vaporPressure,
          r_a: terraformingParameters.phaseChange.penman.aerodynamicResistanceSecondsPerMeter,
        }) * liquidArea / 1000;
      }
      if (typeof nightTemperature === 'number') {
        nightEvap = this.evaporationRate({
          T: nightTemperature,
          solarFlux: nightSolarFlux,
          atmPressure,
          vaporPressure,
          r_a: terraformingParameters.phaseChange.penman.aerodynamicResistanceSecondsPerMeter,
        }) * liquidArea / 1000;
      }
      const evapRate = (dayEvap + nightEvap) / 2;
      evaporationAmount = Math.min(evapRate * durationSeconds, availableLiquid);
      changes.atmosphere[atmosphereKey] += evaporationAmount;
      changes[surfaceBucket][liquidKey] = (changes[surfaceBucket][liquidKey] || 0) - evaporationAmount;
      addTransition(
        'liquid',
        'gas',
        evaporationAmount,
        'evaporation',
        [
          { bucket: surfaceBucket, key: liquidKey, perTon: -1 },
          { bucket: 'atmosphere', key: atmosphereKey, perTon: 1 },
        ],
        this.freezePoint,
        Infinity
      );
    }

    let potentialLiquid = 0;
    let potentialSolid = 0;
    if (typeof this.condensationRateFactor === 'function') {
      const { liquidRate = 0, iceRate = 0 } = this.condensationRateFactor({
        zoneArea,
        gravity,
        dayTemp: dayTemperature,
        nightTemp: nightTemperature,
        transitionRange: this.transitionRange,
        statisticalHumidityMean,
        dayPressureState,
        nightPressureState,
      });
      const safeLiquidRate = liquidForbidden ? 0 : liquidRate;
      const safeIceRate = liquidForbidden ? liquidRate + iceRate : iceRate;

      // If the zone's mean temperature is above the freezing point and liquid is allowed,
      // treat snowfall as rain (falls as snow aloft but melts before reaching the surface).
      let adjustedLiquidRate = safeLiquidRate;
      let adjustedIceRate = safeIceRate;
      if (!liquidForbidden && typeof zoneTemperature === 'number' && zoneTemperature >= this.freezePoint) {
        adjustedLiquidRate += adjustedIceRate;
        adjustedIceRate = 0;
      }

      const potentialLiquid = adjustedLiquidRate * condensationParameter * durationSeconds;
      const potentialSolid  = adjustedIceRate   * condensationParameter * durationSeconds;

      if (this.precipitationKeys.liquid) {
        changes.precipitation[this.precipitationKeys.liquid] = potentialLiquid;
      }
      if (this.precipitationKeys.solid) {
        changes.precipitation[this.precipitationKeys.solid] = potentialSolid;
      }
      changes.atmosphere[atmosphereKey] -= (potentialLiquid + potentialSolid);
    }

    let meltAmount = 0;
    let freezeAmount = 0;
    let sublimationAmount = 0;
    let rapidSublimationAmount = 0;
    let boilingAmount = 0;
    let meltFromIce = 0;
    let meltFromBuried = 0;
    if (typeof this.meltingFreezingRates === 'function') {
      const rates = this.meltingFreezingRates({
        temperature: zoneTemperature,
        availableIce,
        availableLiquid,
        availableBuriedIce,
        zoneArea,
        iceCoverage,
        liquidCoverage,
      });
      const currentLiquid = availableLiquid + (changes[surfaceBucket][liquidKey] || 0);
      const currentIce = availableIce + (changes[surfaceBucket][iceKey] || 0);
      const currentBuried = availableBuriedIce + (changes[surfaceBucket][buriedIceKey] || 0);
      const availableForMelt = currentIce + currentBuried;
      const meltingRate  = rates.meltingRate || 0;
      const freezingRate = rates.freezingRate || 0;

      meltAmount  = Math.min(meltingRate  * durationSeconds, availableForMelt);
      freezeAmount= Math.min(freezingRate * durationSeconds, currentLiquid);

      meltFromIce = Math.min(meltAmount, currentIce);
      meltFromBuried = Math.min(meltAmount - meltFromIce, currentBuried);

      if (liquidForbidden) {
        const rapidBlend = meltAmount > 0
          ? Math.max(0, Math.min(1, this.triplePressure - atmPressure))
          : 0;
        const meltToRapid = meltAmount * rapidBlend;
        const meltToLiquid = meltAmount - meltToRapid;

        changes[surfaceBucket][liquidKey] = (changes[surfaceBucket][liquidKey] || 0) + meltToLiquid - freezeAmount;
        if (availableIce !== undefined) {
          changes[surfaceBucket][iceKey] = (changes[surfaceBucket][iceKey] || 0) + freezeAmount - meltFromIce;
        }
        if (availableBuriedIce !== undefined) {
          changes[surfaceBucket][buriedIceKey] = (changes[surfaceBucket][buriedIceKey] || 0) - meltFromBuried;
        }
        changes.atmosphere[atmosphereKey] += meltToRapid;
        rapidSublimationAmount = meltToRapid;
        meltAmount = meltToLiquid;
      } else {
        changes[surfaceBucket][liquidKey] = (changes[surfaceBucket][liquidKey] || 0) + meltAmount - freezeAmount;
        if (availableIce !== undefined) {
          changes[surfaceBucket][iceKey] = (changes[surfaceBucket][iceKey] || 0) + freezeAmount - meltFromIce;
        }
        if (availableBuriedIce !== undefined) {
          changes[surfaceBucket][buriedIceKey] = (changes[surfaceBucket][buriedIceKey] || 0) - meltFromBuried;
        }
      }

      const totalMeltSource = meltFromIce + meltFromBuried;
      const iceFraction = totalMeltSource > 0 ? meltFromIce / totalMeltSource : 0;
      const buriedFraction = totalMeltSource > 0 ? meltFromBuried / totalMeltSource : 0;
      addTransition(
        'solid',
        'liquid',
        meltAmount,
        'melt',
        [
          { bucket: surfaceBucket, key: iceKey, perTon: -iceFraction },
          { bucket: surfaceBucket, key: buriedIceKey, perTon: -buriedFraction },
          { bucket: surfaceBucket, key: liquidKey, perTon: 1 },
        ],
        this.freezePoint,
        Infinity
      );
      addTransition(
        'solid',
        'gas',
        rapidSublimationAmount,
        'rapidSublimation',
        [
          { bucket: surfaceBucket, key: iceKey, perTon: -iceFraction },
          { bucket: surfaceBucket, key: buriedIceKey, perTon: -buriedFraction },
          { bucket: 'atmosphere', key: atmosphereKey, perTon: 1 },
        ],
        0,
        Infinity
      );
      addTransition(
        'liquid',
        'solid',
        freezeAmount,
        'freeze',
        [
          { bucket: surfaceBucket, key: liquidKey, perTon: -1 },
          { bucket: surfaceBucket, key: iceKey, perTon: 1 },
        ],
        0,
        this.freezePoint
      );
    }

    if (iceArea > 0 && (availableIce + (changes[surfaceBucket][iceKey] || 0)) > 0
      && typeof this.sublimationRate === 'function') {
      let daySub = 0;
      let nightSub = 0;
      if (typeof dayTemperature === 'number') {
        daySub = this.sublimationRate({
          T: dayTemperature,
          solarFlux: daySolarFlux,
          atmPressure,
          vaporPressure,
          r_a: terraformingParameters.phaseChange.penman.aerodynamicResistanceSecondsPerMeter,
        }) * iceArea / 1000;
      }
      if (typeof nightTemperature === 'number') {
        nightSub = this.sublimationRate({
          T: nightTemperature,
          solarFlux: nightSolarFlux,
          atmPressure,
          vaporPressure,
          r_a: terraformingParameters.phaseChange.penman.aerodynamicResistanceSecondsPerMeter,
        }) * iceArea / 1000;
      }
      const subRate = (daySub + nightSub) / 2;
      const availableForSub = availableIce + (changes[surfaceBucket][iceKey] || 0);
      const subAmount = Math.min(subRate * durationSeconds, availableForSub);
      sublimationAmount += subAmount;
      changes.atmosphere[atmosphereKey] += subAmount;
      changes[surfaceBucket][iceKey] = (changes[surfaceBucket][iceKey] || 0) - subAmount;
      addTransition(
        'solid',
        'gas',
        subAmount,
        'sublimation',
        [
          { bucket: surfaceBucket, key: iceKey, perTon: -1 },
          { bucket: 'atmosphere', key: atmosphereKey, perTon: 1 },
        ],
        0,
        Infinity
      );
    }

    const currentLiquid = availableLiquid + (changes[surfaceBucket][liquidKey] || 0);
    if (currentLiquid > 0
      && typeof zoneTemperature === 'number'
      && Number.isFinite(boilingPoint)
      && zoneTemperature > boilingPoint) {
      const diff = zoneTemperature - boilingPoint;
      let activation = 1;
      const transitionRange = this.boilTransitionRange || 0;
      if (transitionRange > 0) {
        // Smoothly ramp boiling on near the threshold while preserving
        // the original rate once superheat exceeds transitionRange.
        const t = Math.max(0, Math.min(1, diff / transitionRange));
        activation = t * t * (3 - 2 * t);
      }
      const boilingRate = currentLiquid * this.boilingRateMultiplier * diff * activation;
      boilingAmount = Math.min(boilingRate * durationSeconds, currentLiquid);
      changes.atmosphere[atmosphereKey] += boilingAmount;
      changes[surfaceBucket][liquidKey] = (changes[surfaceBucket][liquidKey] || 0) - boilingAmount;
      addTransition(
        'liquid',
        'gas',
        boilingAmount,
        'boiling',
        [
          { bucket: surfaceBucket, key: liquidKey, perTon: -1 },
          { bucket: 'atmosphere', key: atmosphereKey, perTon: 1 },
        ],
        boilingPoint,
        Infinity
      );
    }

    return {
      ...changes,
      evaporationAmount,
      sublimationAmount,
      rapidSublimationAmount,
      boilingAmount,
      meltAmount,
      freezeAmount,
    };
  }

  finalizeAtmosphere({ available = 0, zonalChanges = {}, atmosphereKey, processes = [] }) {
    const totalsByProcess = {};
    const zonePotentialLoss = {};
    let totalPotentialLoss = 0;
    let totalPositiveAtmosphericGain = 0;

    for (const zone in zonalChanges) {
      const change = zonalChanges[zone];
      const atmRaw = change.atmosphere?.[atmosphereKey] || 0;
      let potentialLoss = 0;

      for (const proc of processes) {
        let potential;
        if (proc.container === 'precipitation') {
          potential = change.precipitation?.[proc.potentialKey];
        } else {
          potential = change[proc.potentialKey];
        }
        if (typeof potential !== 'number' || potential <= 0) continue;
        potentialLoss += potential;
      }

      zonePotentialLoss[zone] = potentialLoss;
      totalPotentialLoss += potentialLoss;
      totalPositiveAtmosphericGain += (atmRaw + potentialLoss);
    }

    const availableForLoss = Math.max(0, available + totalPositiveAtmosphericGain);
    const scale = (totalPotentialLoss > 0 && totalPotentialLoss > availableForLoss)
      ? (availableForLoss / totalPotentialLoss)
      : 1;

    let totalAtmosphericChange = 0;
    for (const zone in zonalChanges) {
      const change = zonalChanges[zone];
      const atmRaw = change.atmosphere?.[atmosphereKey] || 0;
      const potentialLoss = zonePotentialLoss[zone] || 0;
      const preventedLoss = potentialLoss * (1 - scale);
      const adjustedAtmosphericChange = atmRaw + preventedLoss;
      change.atmosphere[atmosphereKey] = adjustedAtmosphericChange;
      totalAtmosphericChange += adjustedAtmosphericChange;

      for (const proc of processes) {
        let potential;
        if (proc.container === 'precipitation') {
          potential = change.precipitation?.[proc.potentialKey];
        } else {
          potential = change[proc.potentialKey];
        }
        if (typeof potential !== 'number') continue;
        const actual = potential * scale;
        if (proc.container === 'precipitation') {
          if (!change.precipitation) change.precipitation = {};
          change.precipitation[proc.precipitationKey] = actual;
        }
        if (proc.surfaceBucket && proc.surfaceKey) {
          if (!change[proc.surfaceBucket]) change[proc.surfaceBucket] = {};
          const surfaceKey = this.resolveSurfaceKey(proc.surfaceKey);
          change[proc.surfaceBucket][surfaceKey] =
            (change[proc.surfaceBucket][surfaceKey] || 0) + actual;
        }
        totalsByProcess[proc.totalKey] = (totalsByProcess[proc.totalKey] || 0) + actual;
      }
    }

    return { totalAtmosphericChange, totalsByProcess };
  }

  calculateZonalChanges(terraforming, zones, {
    zonalKey = this.zonalKey,
    surfaceBucket = this.surfaceBucket,
    atmosphereKey = this.atmosphereKey,
    vaporPressure = 0,
    available = 0,
    atmPressure = 0,
    durationSeconds = 1,
    availableKeys = this.availableKeys || [],
    phaseChangeHeatEnabled = false,
    extraParams = {},
  } = {}) {
    const zonalChanges = {};
    const cycleTotals = { evaporation: 0, sublimation: 0, rapidSublimation: 0, boiling: 0, melt: 0, freeze: 0 };
    const mergedExtra = { ...(this.defaultExtraParams || {}), ...extraParams };
    const zonalFluxDivisor = isAldersonDiskWorld() || isRingWorld() ? 1 : 4;
    const statisticalHumidity = this.buildStatisticalHumidityState(
      terraforming,
      zones,
      atmPressure,
      vaporPressure
    );

    for (const zone of zones) {
      const temps = terraforming.temperature.zones[zone] || {};
      const zoneArea = terraforming.zonalCoverageCache?.[zone]?.zoneArea
        ?? terraforming.celestialParameters.surfaceArea * getZonePercentage(zone);
      const coverage = (typeof this.getCoverage === 'function')
        ? this.getCoverage(zone, terraforming.zonalCoverageCache)
        : {};
      const zonalSource = terraforming[zonalKey]?.[zone] || {};
      const params = {
        zoneArea,
        dayTemperature: temps.day,
        nightTemperature: temps.night,
        zoneTemperature: temps.value,
        atmPressure,
        boilingPoint: statisticalHumidity.boilingPoint,
        vaporPressure: statisticalHumidity.byZone[zone].vaporPressure,
        statisticalHumidityMean: statisticalHumidity.meanHumidity,
        dayPressureState: statisticalHumidity.byZone[zone].dayPressureState,
        nightPressureState: statisticalHumidity.byZone[zone].nightPressureState,
        zonalSolarFlux: terraforming.calculateZoneSolarFlux(zone) / zonalFluxDivisor,
        durationSeconds,
        phaseChangeHeatEnabled,
        ...coverage,
        ...mergedExtra,
      };
      for (const key of availableKeys) {
        const paramKey = 'available' + key.charAt(0).toUpperCase() + key.slice(1);
        const zonalKey = this.resolveSurfaceKey(key);
        params[paramKey] = zonalSource[zonalKey] || 0;
      }
      const result = this.processZone(params);
      zonalChanges[zone] = zonalChanges[zone] || {};
      const change = zonalChanges[zone];
      if (!change.atmosphere) change.atmosphere = {};
      change.atmosphere[atmosphereKey] = (change.atmosphere[atmosphereKey] || 0)
        + (result.atmosphere?.[atmosphereKey] || 0);
      if (!change[surfaceBucket]) change[surfaceBucket] = {};
      const surfaceChanges = result[surfaceBucket] || {};
      for (const [k, v] of Object.entries(surfaceChanges)) {
        change[surfaceBucket][k] = (change[surfaceBucket][k] || 0) + v;
      }
      if (result.precipitation) {
        if (!change.precipitation) change.precipitation = {};
        for (const [k, v] of Object.entries(result.precipitation)) {
          change.precipitation[k] = (change.precipitation[k] || 0) + v;
        }
      }
      change.phaseTransitions = result.phaseTransitions || [];
      if (result.evaporationAmount) cycleTotals.evaporation += result.evaporationAmount;
      if (result.sublimationAmount) cycleTotals.sublimation += result.sublimationAmount;
      if (result.rapidSublimationAmount) cycleTotals.rapidSublimation += result.rapidSublimationAmount;
      if (result.boilingAmount) cycleTotals.boiling += result.boilingAmount;
      if (result.meltAmount) cycleTotals.melt += result.meltAmount;
      if (result.freezeAmount) cycleTotals.freeze += result.freezeAmount;
    }

    const finalizeResult = this.finalizeAtmosphere({
      available,
      zonalChanges,
      atmosphereKey,
      processes: this.finalizeProcesses || [],
    });

    if (phaseChangeHeatEnabled) {
      for (const zone of zones) {
        const change = zonalChanges[zone];
        for (const process of this.finalizeProcesses) {
          const amount = change.precipitation?.[process.precipitationKey] || 0;
          if (!(amount > 0)) continue;
          const toPhase = process.surfaceKey === 'liquid' ? 'liquid' : 'solid';
          change.phaseTransitions.push({
            fromPhase: 'gas',
            toPhase,
            amount,
            totalKey: process.precipitationKey,
            adjustments: [
              { bucket: 'atmosphere', key: atmosphereKey, perTon: -1 },
              {
                bucket: process.surfaceBucket,
                key: this.resolveSurfaceKey(process.surfaceKey),
                perTon: 1,
              },
              {
                bucket: 'precipitation',
                key: process.precipitationKey,
                perTon: 1,
              },
            ],
            floorTemperatureK: 0,
            ceilingTemperatureK: toPhase === 'solid' ? this.freezePoint : this.criticalTemperature,
            thermodynamics: this.thermodynamics,
          });
        }
      }
    }

    const processTotals = {};
    for (const zone of zones) {
      const precip = zonalChanges[zone]?.precipitation;
      if (!precip) continue;
      for (const [k, v] of Object.entries(precip)) {
        processTotals[k] = (processTotals[k] || 0) + v;
      }
    }
    if (Object.keys(processTotals).length === 0) {
      Object.assign(processTotals, finalizeResult.totalsByProcess);
    }

    return {
      zonalChanges,
      totals: {
        ...cycleTotals,
        ...processTotals,
        totalAtmosphericChange: finalizeResult.totalAtmosphericChange,
      },
    };
  }

  resolveZonalPhaseChanges(
    terraforming,
    data,
    zones,
    atmosphereKey = this.atmosphereKey,
    startingTemperatures = null
  ) {
    const phaseHeat = { netHeatEnergyJ: 0, byZone: {} };
    const heatCapacity = terraforming.getHeatCapacity();

    for (const zone of zones) {
      const change = data.zonalChanges[zone];
      const transitions = change.phaseTransitions || [];
      if (transitions.length === 0) continue;

      const zoneCapacity = heatCapacity.zones[zone];
      const capacityJPerK = zoneCapacity.capacityPerArea * zoneCapacity.zoneArea;
      const startingTemperature = startingTemperatures?.[zone]
        ?? terraforming.temperature.zones[zone].value;
      const result = resolvePhaseTransitionEnergyFn(
        startingTemperature,
        capacityJPerK,
        transitions
      );

      for (let index = 0; index < transitions.length; index += 1) {
        const transition = transitions[index];
        const acceptedAmount = result.acceptedAmounts[index];
        const rejectedAmount = acceptedAmount - transition.amount;
        if (rejectedAmount) {
          for (const adjustment of transition.adjustments) {
            const adjustmentChange = adjustment.zone
              ? data.zonalChanges[adjustment.zone]
              : change;
            const bucket = adjustmentChange[adjustment.bucket]
              || (adjustmentChange[adjustment.bucket] = {});
            bucket[adjustment.key] =
              (bucket[adjustment.key] || 0) + rejectedAmount * adjustment.perTon;
          }
          data.totals[transition.totalKey] =
            (data.totals[transition.totalKey] || 0) + rejectedAmount;
        }
        transition.amount = acceptedAmount;
      }

      phaseHeat.netHeatEnergyJ += result.netHeatEnergyJ;
      phaseHeat.byZone[zone] = {
        netHeatEnergyJ: result.netHeatEnergyJ,
        finalTemperatureK: result.finalTemperatureK,
        transitions,
      };
    }

    data.totals.totalAtmosphericChange = 0;
    for (const zone of zones) {
      data.totals.totalAtmosphericChange +=
        data.zonalChanges[zone].atmosphere?.[atmosphereKey] || 0;
    }
    return phaseHeat;
  }

  applyZonalChanges(terraforming, zonalChanges, zonalKey = this.zonalKey, surfaceBucket = this.surfaceBucket) {
    const totals = {};
    const container = terraforming[zonalKey] || {};
    for (const zone in zonalChanges) {
      const change = zonalChanges[zone];
      if (!change || !change[surfaceBucket]) continue;
      const zoneStore = container[zone] || (container[zone] = {});
      for (const [state, amount] of Object.entries(change[surfaceBucket])) {
        const before = zoneStore[state] || 0;
        let after = before + amount;
        if (after < 0) after = 0;
        zoneStore[state] = after;
        totals[state] = (totals[state] || 0) + (after - before);
      }
    }
    return totals;
  }

  runCycle(terraforming, zones, options = {}) {
    const duration = options.durationSeconds || 1;
    const data = this.calculateZonalChanges(terraforming, zones, options);
    let phaseHeat = options.phaseChangeHeatEnabled
      ? this.resolveZonalPhaseChanges(
          terraforming,
          data,
          zones,
          options.atmosphereKey,
          options.phaseStartingTemperatures
        )
      : null;
    if (phaseHeat) {
      for (const zone of zones) {
        data.zonalChanges[zone].phaseTransitions = [];
      }
    }

    if (typeof this.surfaceFlowFn === 'function') {
      const zonalKey = options.zonalKey || this.zonalKey;
      const bucket = options.surfaceBucket || this.surfaceBucket;
      const baseContainer = terraforming[zonalKey] || {};
      const projectedContainer = {};
      for (const zone of zones) {
        const baseZone = baseContainer[zone] || {};
        const projectedZone = { ...baseZone };
        const phaseChange = data.zonalChanges[zone]?.[bucket] || {};
        for (const [state, amount] of Object.entries(phaseChange)) {
          projectedZone[state] = Math.max(0, (projectedZone[state] || 0) + amount);
        }
        projectedContainer[zone] = projectedZone;
      }
      const flowTerraforming = Object.create(terraforming);
      flowTerraforming[zonalKey] = projectedContainer;

      const tempMap = {};
      for (const z of zones) {
        tempMap[z] = terraforming.temperature.zones[z]?.value;
      }
      const flow = this.surfaceFlowFn(flowTerraforming, duration, tempMap) || {};
      const flowChanges = flow.changes || {};
      for (const [zone, change] of Object.entries(flowChanges)) {
        const dest = data.zonalChanges[zone] || (data.zonalChanges[zone] = {});
        const bucketDest = dest[bucket] || (dest[bucket] = {});
        for (const [state, amount] of Object.entries(change)) {
          bucketDest[state] = (bucketDest[state] || 0) + amount;
        }
      }
      const flowTotals = flow.totals || {};
      for (const [k, v] of Object.entries(flowTotals)) {
        data.totals[k] = (data.totals[k] || 0) + v;
      }

      if (options.phaseChangeHeatEnabled) {
        const atmosphereKey = options.atmosphereKey || this.atmosphereKey;
        for (const transition of flow.phaseTransitions || []) {
          const sourceKey = transition.fromPhase === 'liquid'
            ? this.resolveSurfaceKey('liquid')
            : this.resolveSurfaceKey('ice');
          const targetKey = transition.toPhase === 'liquid'
            ? this.resolveSurfaceKey('liquid')
            : this.resolveSurfaceKey('ice');
          const adjustments = [
            {
              zone: transition.source,
              bucket,
              key: sourceKey,
              perTon: -1,
            },
          ];
          if (transition.toPhase === 'gas') {
            const targetChange = data.zonalChanges[transition.target];
            targetChange.atmosphere[atmosphereKey] =
              (targetChange.atmosphere[atmosphereKey] || 0) + transition.amount;
            adjustments.push({
              zone: transition.target,
              bucket: 'atmosphere',
              key: atmosphereKey,
              perTon: 1,
            });
          } else {
            adjustments.push({
              zone: transition.target,
              bucket,
              key: targetKey,
              perTon: 1,
            });
          }
          data.zonalChanges[transition.zone].phaseTransitions.push({
            ...transition,
            adjustments,
            floorTemperatureK: transition.toPhase === 'solid' ? 0 : this.freezePoint,
            ceilingTemperatureK: transition.toPhase === 'solid' ? this.freezePoint : Infinity,
            thermodynamics: this.thermodynamics,
          });
        }
      }

      let freezeOut = flowTotals.freezeOut || flow.totalFreezeOut || 0;
      if (!freezeOut) {
        for (const change of Object.values(flowChanges)) {
          freezeOut += Math.max(0, change.ice || 0);
        }
      }
      if (freezeOut) {
        data.totals.freezeOut = (data.totals.freezeOut || 0) + freezeOut;
      }
    }

    if (options.phaseChangeHeatEnabled && this.surfaceFlowFn) {
      const startingTemperatures = {};
      for (const zone of zones) {
        startingTemperatures[zone] =
          phaseHeat.byZone[zone]?.finalTemperatureK
          ?? terraforming.temperature.zones[zone].value;
      }
      const flowPhaseHeat = this.resolveZonalPhaseChanges(
        terraforming,
        data,
        zones,
        options.atmosphereKey,
        startingTemperatures
      );
      phaseHeat.netHeatEnergyJ += flowPhaseHeat.netHeatEnergyJ;
      for (const zone of zones) {
        const baseZone = phaseHeat.byZone[zone];
        const flowZone = flowPhaseHeat.byZone[zone];
        if (!flowZone) continue;
        phaseHeat.byZone[zone] = {
          netHeatEnergyJ: (baseZone?.netHeatEnergyJ || 0) + flowZone.netHeatEnergyJ,
          finalTemperatureK: flowZone.finalTemperatureK,
          transitions: (baseZone?.transitions || []).concat(flowZone.transitions),
        };
      }
    }
    this.applyZonalChanges(terraforming, data.zonalChanges, options.zonalKey, options.surfaceBucket);
    Object.defineProperty(data.totals, 'phaseHeat', {
      value: phaseHeat,
      enumerable: false,
    });
    return data.totals;
  }

  updateResourceRates(terraforming, totals = {}, durationSeconds = 1) {
    const rateType = 'terraforming';
    const freezeOutTotal = totals.freezeOut || 0;
    for (const [totalKey, mappings] of Object.entries(this.rateMappings || {})) {
      const total = totals[totalKey] || 0;
      const totalForMapping = (totalKey === 'freeze' && freezeOutTotal)
        ? Math.max(0, total - freezeOutTotal)
        : total;
      const rate = durationSeconds > 0 ? totalForMapping / durationSeconds * 86400 : 0;
      const capKey = totalKey.charAt(0).toUpperCase() + totalKey.slice(1);
      const prefix = this.rateTotalsPrefix || '';
      const totalField = 'total' + (prefix ? prefix : '') + capKey + 'Rate';
      terraforming[totalField] = durationSeconds > 0 ? total / durationSeconds * 86400 : 0;
      for (const map of mappings) {
        const resource = map.path.split('.').reduce((obj, k) => (obj ? obj[k] : undefined), terraforming.resources);
        if (resource && typeof resource.modifyRate === 'function') {
          resource.modifyRate(rate * (map.sign ?? 1), map.label || capKey, rateType);
        }
      }
    }
  }

}

if (isNodeResourceCycle) {
  module.exports = ResourceCycle;
} else {
  globalThis.ResourceCycle = ResourceCycle;
}

