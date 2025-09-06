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
    const cycleTotals = { evaporation: 0, sublimation: 0, melt: 0, freeze: 0 };
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
      if (result.potentialCO2Condensation !== undefined) {
        change.potentialCO2Condensation =
          (change.potentialCO2Condensation || 0) + result.potentialCO2Condensation;
      }
      if (result.evaporationAmount) cycleTotals.evaporation += result.evaporationAmount;
      if (result.sublimationAmount) cycleTotals.sublimation += result.sublimationAmount;
      if (result.meltAmount) cycleTotals.melt += result.meltAmount;
      if (result.freezeAmount) cycleTotals.freeze += result.freezeAmount;
    }

    const finalizeResult = this.finalizeAtmosphere({
      available,
      zonalChanges,
      atmosphereKey,
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
    const data = this.calculateZonalChanges(terraforming, zones, options);
    this.applyZonalChanges(terraforming, data.zonalChanges, options.zonalKey, options.surfaceBucket);
    return data.totals;
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

