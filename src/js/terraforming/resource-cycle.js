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

