// Base class for resource cycle phase-change calculations
const isNodeResourceCycle = (typeof module !== 'undefined' && module.exports);
let penmanRateFn = globalThis.penmanRate;
let condensationRateFactorFn = globalThis.condensationRateFactor;
let meltingFreezingRatesFn = globalThis.meltingFreezingRates;
if (isNodeResourceCycle) {
  try {
    const phaseUtils = require('./phase-change-utils.js');
    penmanRateFn = phaseUtils.penmanRate;
    meltingFreezingRatesFn = phaseUtils.meltingFreezingRates;
    condensationRateFactorFn = require('./condensation-utils.js').condensationRateFactor;
  } catch (e) {
    // fall back to globals if require fails
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
    coverageKeys = {},
    precipitationKeys = {},
    surfaceFlowFn = null,
    rateMappings = {},
    finalizeProcesses = [],
    rateTotalsPrefix = '',
    tripleTemperature = null,
    triplePressure = null,
    disallowLiquidBelowTriple = false,
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
    this.coverageKeys = coverageKeys;
    this.precipitationKeys = precipitationKeys;
    this.surfaceFlowFn = surfaceFlowFn;
    this.rateMappings = rateMappings;
    this.finalizeProcesses = finalizeProcesses;
    this.rateTotalsPrefix = rateTotalsPrefix;
    this.tripleTemperature = tripleTemperature;
    this.triplePressure = triplePressure;
    this.disallowLiquidBelowTriple = disallowLiquidBelowTriple;
  }

  evaporationRate({ T, solarFlux, atmPressure, vaporPressure: e_a, r_a = 100, albedo = this.evaporationAlbedo }) {
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
    });
  }

  condensationRateFactor({ zoneArea, vaporPressure, gravity, dayTemp, nightTemp, transitionRange, maxDiff, boilingPoint, boilTransitionRange }) {
    return condensationRateFactorFn({
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
    return meltingFreezingRatesFn({ ...args, freezingPoint: this.freezePoint });
  }

  sublimationRate({ T, solarFlux, atmPressure, vaporPressure: e_a, r_a = 100, albedo = this.sublimationAlbedo }) {
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
    });
  }

  processZone(params) {
    const {
      zoneArea = 0,
      dayTemperature,
      nightTemperature,
      zoneTemperature,
      atmPressure,
      vaporPressure,
      zonalSolarFlux = 0,
      durationSeconds = 1,
      gravity = 1,
      condensationParameter = 1,
      availableLiquid = 0,
      availableIce = 0,
      availableBuriedIce = 0,
    } = params;
    const liquidForbidden =
    !!this.disallowLiquidBelowTriple &&
    (typeof this.triplePressure === 'number') &&
    (atmPressure <= this.triplePressure);

    const atmosphereKey = this.atmosphereKey;
    const surfaceBucket = this.surfaceBucket;
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
    };

    const daySolarFlux = 2 * zonalSolarFlux;
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
          r_a: 100,
        }) * liquidArea / 1000;
      }
      if (typeof nightTemperature === 'number') {
        nightEvap = this.evaporationRate({
          T: nightTemperature,
          solarFlux: nightSolarFlux,
          atmPressure,
          vaporPressure,
          r_a: 100,
        }) * liquidArea / 1000;
      }
      const evapRate = (dayEvap + nightEvap) / 2;
      evaporationAmount = Math.min(evapRate * durationSeconds, availableLiquid);
      changes.atmosphere[atmosphereKey] += evaporationAmount;
      changes[surfaceBucket].liquid = (changes[surfaceBucket].liquid || 0) - evaporationAmount;
    }

    let potentialLiquid = 0;
    let potentialSolid = 0;
    if (typeof this.condensationRateFactor === 'function') {
      const { liquidRate = 0, iceRate = 0 } = this.condensationRateFactor({
        zoneArea,
        vaporPressure,
        gravity,
        dayTemp: dayTemperature,
        nightTemp: nightTemperature,
        transitionRange: this.transitionRange,
        maxDiff: this.maxDiff,
        boilingPoint: typeof this.boilingPointFn === 'function'
          ? this.boilingPointFn(atmPressure)
          : undefined,
        boilTransitionRange: this.boilTransitionRange,
      });
      const safeLiquidRate = liquidForbidden ? 0 : liquidRate;
      const safeIceRate = liquidForbidden ? liquidRate + iceRate : iceRate;

      const potentialLiquid = safeLiquidRate * condensationParameter * durationSeconds;
      const potentialSolid  = safeIceRate   * condensationParameter * durationSeconds;

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
      const currentLiquid = availableLiquid + (changes[surfaceBucket].liquid || 0);
      const currentIce = availableIce + (changes[surfaceBucket].ice || 0);
      const currentBuried = availableBuriedIce + (changes[surfaceBucket].buriedIce || 0);
      const availableForMelt = currentIce + currentBuried;
      const meltingRate  = rates.meltingRate || 0;
      const freezingRate = rates.freezingRate || 0;

      meltAmount  = Math.min(meltingRate  * durationSeconds, availableForMelt);
      freezeAmount= Math.min(freezingRate * durationSeconds, currentLiquid);

      let meltFromIce = Math.min(meltAmount, currentIce);
      let meltFromBuried = Math.min(meltAmount - meltFromIce, currentBuried);

      if (liquidForbidden) {
        changes[surfaceBucket].liquid = (changes[surfaceBucket].liquid || 0) - freezeAmount;
        if (availableIce !== undefined) {
          changes[surfaceBucket].ice = (changes[surfaceBucket].ice || 0) + freezeAmount - meltFromIce;
        }
        if (availableBuriedIce !== undefined) {
          changes[surfaceBucket].buriedIce = (changes[surfaceBucket].buriedIce || 0) - meltFromBuried;
        }
        changes.atmosphere[atmosphereKey] += meltAmount;
        rapidSublimationAmount = meltAmount;
        meltAmount = 0;
      } else {
        changes[surfaceBucket].liquid = (changes[surfaceBucket].liquid || 0) + meltAmount - freezeAmount;
        if (availableIce !== undefined) {
          changes[surfaceBucket].ice = (changes[surfaceBucket].ice || 0) + freezeAmount - meltFromIce;
        }
        if (availableBuriedIce !== undefined) {
          changes[surfaceBucket].buriedIce = (changes[surfaceBucket].buriedIce || 0) - meltFromBuried;
        }
      }
    }

    if (iceArea > 0 && (availableIce + (changes[surfaceBucket].ice || 0)) > 0
      && typeof this.sublimationRate === 'function') {
      let daySub = 0;
      let nightSub = 0;
      if (typeof dayTemperature === 'number') {
        daySub = this.sublimationRate({
          T: dayTemperature,
          solarFlux: daySolarFlux,
          atmPressure,
          vaporPressure,
          r_a: 100,
        }) * iceArea / 1000;
      }
      if (typeof nightTemperature === 'number') {
        nightSub = this.sublimationRate({
          T: nightTemperature,
          solarFlux: nightSolarFlux,
          atmPressure,
          vaporPressure,
          r_a: 100,
        }) * iceArea / 1000;
      }
      const subRate = (daySub + nightSub) / 2;
      const availableForSub = availableIce + (changes[surfaceBucket].ice || 0);
      const subAmount = Math.min(subRate * durationSeconds, availableForSub);
      sublimationAmount += subAmount;
      changes.atmosphere[atmosphereKey] += subAmount;
      changes[surfaceBucket].ice = (changes[surfaceBucket].ice || 0) - subAmount;
    }

    return {
      ...changes,
      evaporationAmount,
      sublimationAmount,
      rapidSublimationAmount,
      meltAmount,
      freezeAmount,
    };
  }

  // Optional hook for subclasses to redistribute precipitation across zones
  // eslint-disable-next-line no-unused-vars
  redistributePrecipitation(terraforming, zonalChanges, zonalTemperatures) {}

  finalizeAtmosphere({ available = 0, zonalChanges = {}, atmosphereKey, processes = [] }) {
    let totalAtmosphericChange = 0;
    let totalPotentialLoss = 0;

    for (const zone in zonalChanges) {
      const change = zonalChanges[zone];
      const atm = change.atmosphere?.[atmosphereKey] || 0;
      if (atm < 0) {
        totalPotentialLoss -= atm;
      } else {
        totalAtmosphericChange += atm;
      }
    }

    const scale = (available > 0 && totalPotentialLoss > available)
      ? available / totalPotentialLoss
      : 1;

    const totalsByProcess = {};

    for (const zone in zonalChanges) {
      const change = zonalChanges[zone];
      const atm = change.atmosphere?.[atmosphereKey] || 0;
      const zoneScale = atm < 0 ? scale : 1;
      if (atm < 0) {
        const scaled = atm * scale;
        change.atmosphere[atmosphereKey] = scaled;
        totalAtmosphericChange += scaled;
      }

      for (const proc of processes) {
        let potential;
        if (proc.container === 'precipitation') {
          potential = change.precipitation?.[proc.potentialKey];
        } else {
          potential = change[proc.potentialKey];
        }
        if (typeof potential !== 'number') continue;
        const actual = potential * zoneScale;
        if (proc.container === 'precipitation') {
          if (!change.precipitation) change.precipitation = {};
          change.precipitation[proc.precipitationKey] = actual;
        }
        if (proc.surfaceBucket && proc.surfaceKey) {
          if (!change[proc.surfaceBucket]) change[proc.surfaceBucket] = {};
          change[proc.surfaceBucket][proc.surfaceKey] =
            (change[proc.surfaceBucket][proc.surfaceKey] || 0) + actual;
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
    extraParams = {},
  } = {}) {
    const zonalChanges = {};
    const cycleTotals = { evaporation: 0, sublimation: 0, rapidSublimation: 0, melt: 0, freeze: 0 };
    const mergedExtra = { ...(this.defaultExtraParams || {}), ...extraParams };

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
        vaporPressure,
        zonalSolarFlux: terraforming.calculateZoneSolarFlux(zone, true),
        durationSeconds,
        ...coverage,
        ...mergedExtra,
      };
      for (const key of availableKeys) {
        const paramKey = 'available' + key.charAt(0).toUpperCase() + key.slice(1);
        params[paramKey] = zonalSource[key] || 0;
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
      if (result.evaporationAmount) cycleTotals.evaporation += result.evaporationAmount;
      if (result.sublimationAmount) cycleTotals.sublimation += result.sublimationAmount;
      if (result.rapidSublimationAmount) cycleTotals.rapidSublimation += result.rapidSublimationAmount;
      if (result.meltAmount) cycleTotals.melt += result.meltAmount;
      if (result.freezeAmount) cycleTotals.freeze += result.freezeAmount;
    }

    const finalizeResult = this.finalizeAtmosphere({
      available,
      zonalChanges,
      atmosphereKey,
      processes: this.finalizeProcesses || [],
    });

    if (typeof this.redistributePrecipitation === 'function') {
      this.redistributePrecipitation(terraforming, zonalChanges, terraforming.temperature.zones);
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

  applyZonalChanges(terraforming, zonalChanges, zonalKey = this.zonalKey, surfaceBucket = this.surfaceBucket) {
    const totals = {};
    const container = terraforming[zonalKey] || {};
    for (const zone in zonalChanges) {
      const change = zonalChanges[zone];
      if (!change || !change[surfaceBucket]) continue;
      const zoneStore = container[zone] || (container[zone] = {});
      for (const [state, amount] of Object.entries(change[surfaceBucket])) {
        zoneStore[state] = (zoneStore[state] || 0) + amount;
        if (zoneStore[state] < 0) zoneStore[state] = 0;
        totals[state] = (totals[state] || 0) + amount;
      }
    }
    return totals;
  }

  runCycle(terraforming, zones, options = {}) {
    const duration = options.durationSeconds || 1;
    const data = this.calculateZonalChanges(terraforming, zones, options);

    if (typeof this.surfaceFlowFn === 'function') {
      const tempMap = {};
      for (const z of zones) {
        tempMap[z] = terraforming.temperature.zones[z]?.value;
      }
      const flow = this.surfaceFlowFn(terraforming, duration, tempMap) || {};
      const flowChanges = flow.changes || {};
      const bucket = options.surfaceBucket || this.surfaceBucket;
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
    }

    this.applyZonalChanges(terraforming, data.zonalChanges, options.zonalKey, options.surfaceBucket);
    return data.totals;
  }

  updateResourceRates(terraforming, totals = {}, durationSeconds = 1) {
    const rateType = 'terraforming';
    for (const [totalKey, mappings] of Object.entries(this.rateMappings || {})) {
      const total = totals[totalKey] || 0;
      const rate = durationSeconds > 0 ? total / durationSeconds * 86400 : 0;
      const capKey = totalKey.charAt(0).toUpperCase() + totalKey.slice(1);
      const prefix = this.rateTotalsPrefix || '';
      const totalField = 'total' + (prefix ? prefix : '') + capKey + 'Rate';
      terraforming[totalField] = rate;
      for (const map of mappings) {
        const resource = map.path.split('.').reduce((obj, k) => (obj ? obj[k] : undefined), terraforming.resources);
        if (resource && typeof resource.modifyRate === 'function') {
          resource.modifyRate(rate * (map.sign ?? 1), map.label || capKey, rateType);
        }
      }
    }
  }

  rapidSublimationRate(temperature, availableIce) {
    if (temperature > this.sublimationPoint && availableIce > 0) {
      const diff = temperature - this.sublimationPoint;
      return availableIce * this.rapidSublimationMultiplier * diff;
    }
    return 0;
  }
}

if (isNodeResourceCycle) {
  module.exports = ResourceCycle;
} else {
  globalThis.ResourceCycle = ResourceCycle;
}

