// Utility for calculating condensation or precipitation rates
const isNodeCondensation = (typeof module !== 'undefined' && module.exports);
let saturationFnFallback;

if (isNodeCondensation) {
  // no dependencies other than custom saturation function which will be passed in
} else {
  // for browser usage nothing to setup
}


function condensationRateFactor({
  zoneArea,
  vaporPressure,
  gravity,
  atmPressure,
  dayTemp,
  nightTemp,
  saturationFn,
  freezePoint,
  transitionRange = 2,
  maxDiff = 10,
  boilingPoint = Infinity,
  boilTransitionRange = 2,
  criticalTemperature = Infinity,
  liftPressureFraction = 0.65,
  kappa = 0.286
}) {
  if (typeof saturationFn !== 'function') {
    throw new Error('condensationRateFactor requires saturationFn');
  }

  const hasDayTemp = typeof dayTemp === 'number';
  const hasNightTemp = typeof nightTemp === 'number';

  const calc = (temp) => {
    let liquid = 0, ice = 0;
    if (zoneArea > 0 && typeof temp === 'number') {
      // When there is no defined liquid region (boilingPoint not finite, e.g., below triple pressure),
      // use the over-ice saturation branch regardless of temperature by evaluating at or below freezePoint.
      // This ensures condensation still occurs as ice even when T > freezePoint but liquid is not permitted.
      const useIceBranch = !Number.isFinite(boilingPoint);
      const effectiveTemp = useIceBranch ? Math.min(temp, freezePoint) : temp;

      // Surface saturation cap (optional if temp is above critical).
      const surfaceCap = (Number.isFinite(criticalTemperature) && effectiveTemp >= criticalTemperature)
        ? Infinity
        : saturationFn(effectiveTemp);

      // Simple uplift/cold-level cap: compare vapor at a lifted pressure to saturation at the cooled parcel.
      // If enabled, this typically produces condensation even when the surface is unsaturated.
      let upliftCap = Infinity;
      if (Number.isFinite(atmPressure) && atmPressure > 0
        && Number.isFinite(liftPressureFraction) && liftPressureFraction > 0 && liftPressureFraction < 1
        && Number.isFinite(kappa) && kappa > 0) {
        const ratio = liftPressureFraction;
        const pLift = atmPressure * ratio;
        if (pLift > 0) {
          const liftedTemp = temp * Math.pow(ratio, kappa);
          const effectiveLiftedTemp = useIceBranch ? Math.min(liftedTemp, freezePoint) : liftedTemp;
          if (!(Number.isFinite(criticalTemperature) && effectiveLiftedTemp >= criticalTemperature)) {
            const eSatLift = saturationFn(effectiveLiftedTemp);
            upliftCap = eSatLift / ratio; // convert back to an equivalent surface partial-pressure cap
          }
        }
      }

      const saturationPressure = Math.min(surfaceCap, upliftCap);
      if (vaporPressure > saturationPressure) {
        const excessPressure = vaporPressure - saturationPressure;
        const excessMassKg = (excessPressure * zoneArea) / gravity;
        const baseRate = (excessMassKg / 1000) / 86400; // tons per second
        if (!isNaN(baseRate) && baseRate > 0) {
          let rate = baseRate;
          const mix = Math.min(Math.max((temp - (freezePoint - transitionRange)) / (2 * transitionRange), 0), 1);
          liquid = rate * mix;
          ice = rate - liquid;
        }
      }
    }
    return { liquid, ice };
  };

  const day = hasDayTemp ? calc(dayTemp) : null;
  const night = hasNightTemp ? calc(nightTemp) : null;
  const average = (day && night)
    ? { liquid: (day.liquid + night.liquid) / 2, ice: (day.ice + night.ice) / 2 }
    : (day || night || { liquid: 0, ice: 0 });

  return {
    liquidRate: average.liquid,
    iceRate: average.ice
  };
}

if (isNodeCondensation) {
  module.exports = { condensationRateFactor };
} else {
  globalThis.condensationRateFactor = condensationRateFactor;
}
