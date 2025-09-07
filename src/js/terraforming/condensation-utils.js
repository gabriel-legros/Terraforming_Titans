// Utility for calculating condensation or precipitation rates
const isNodeCondensation = (typeof module !== 'undefined' && module.exports);
let saturationFnFallback;

if (isNodeCondensation) {
  // no dependencies other than custom saturation function which will be passed in
} else {
  // for browser usage nothing to setup
}


function condensationRateFactor({ zoneArea, vaporPressure, gravity, dayTemp, nightTemp, saturationFn, freezePoint, transitionRange = 2, maxDiff = 10, boilingPoint = Infinity, boilTransitionRange = 2, criticalTemperature = Infinity }) {
  if (typeof saturationFn !== 'function') {
    throw new Error('condensationRateFactor requires saturationFn');
  }

  const calc = (temp) => {
    let liquid = 0, ice = 0;
    if (zoneArea > 0 && typeof temp === 'number') {
      // Above the critical temperature, no condensation (liquid or solid) can occur.
      if (Number.isFinite(criticalTemperature) && temp >= criticalTemperature) {
        return { liquid: 0, ice: 0 };
      }
      // When there is no defined liquid region (boilingPoint not finite, e.g., below triple pressure),
      // use the over-ice saturation branch regardless of temperature by evaluating at or below freezePoint.
      // This ensures condensation still occurs as ice even when T > freezePoint but liquid is not permitted.
      const useIceBranch = !Number.isFinite(boilingPoint);
      const effectiveTemp = useIceBranch ? Math.min(temp, freezePoint) : temp;
      const saturationPressure = saturationFn(effectiveTemp);
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

  const night = calc(nightTemp);
  const day = calc(dayTemp);

  return {
    liquidRate: (night.liquid + day.liquid) / 2,
    iceRate: (night.ice + day.ice) / 2
  };
}

if (isNodeCondensation) {
  module.exports = { condensationRateFactor };
} else {
  globalThis.condensationRateFactor = condensationRateFactor;
}
