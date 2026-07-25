// Utility for calculating condensation or precipitation rates
const isNodeCondensation = (typeof module !== 'undefined' && module.exports);

function calculateCondensationPressureState({
  temp,
  atmPressure,
  saturationFn,
  freezePoint,
  boilingPoint,
  criticalTemperature,
  liftPressureFraction,
  kappa
}) {
  const useIceBranch = !Number.isFinite(boilingPoint);
  const effectiveTemp = useIceBranch ? Math.min(temp, freezePoint) : temp;
  const surfaceCap = Number.isFinite(criticalTemperature) && effectiveTemp >= criticalTemperature
    ? Infinity
    : saturationFn(effectiveTemp);
  const humidityScale = Math.min(surfaceCap, atmPressure);

  let upliftCap = Infinity;
  if (atmPressure > 0
    && liftPressureFraction > 0 && liftPressureFraction < 1
    && kappa > 0) {
    const liftedTemp = temp * Math.pow(liftPressureFraction, kappa);
    const effectiveLiftedTemp = useIceBranch ? Math.min(liftedTemp, freezePoint) : liftedTemp;
    if (!(Number.isFinite(criticalTemperature) && effectiveLiftedTemp >= criticalTemperature)) {
      upliftCap = saturationFn(effectiveLiftedTemp) / liftPressureFraction;
    }
  }

  return {
    humidityScale,
    saturationPressure: Math.min(surfaceCap, upliftCap)
  };
}

function calculateExpectedHumidityExcess(meanHumidity, normalizedThreshold) {
  if (meanHumidity <= 0) {
    return 0;
  }
  const shape = terraformingParameters.phaseChange.statisticalHumidity.drySkewShape;
  const upperBound = (shape + 1) * meanHumidity;
  if (normalizedThreshold >= upperBound) {
    return 0;
  }
  return meanHumidity * Math.pow(1 - normalizedThreshold / upperBound, shape + 1);
}

function condensationRateFactor({
  zoneArea,
  gravity,
  dayTemp,
  nightTemp,
  freezePoint,
  transitionRange = terraformingParameters.phaseChange.condensation.phaseTransitionRangeK,
  statisticalHumidityMean,
  dayPressureState,
  nightPressureState
}) {
  const calc = (temp, pressureState) => {
    const humidityScale = pressureState.humidityScale;
    if (zoneArea <= 0 || humidityScale <= 0) {
      return { liquid: 0, ice: 0 };
    }

    const normalizedThreshold = pressureState.saturationPressure / humidityScale;
    const excessPressure = humidityScale
      * calculateExpectedHumidityExcess(statisticalHumidityMean, normalizedThreshold);
    const excessMassKg = (excessPressure * zoneArea) / gravity;
    const rate = (excessMassKg / terraformingParameters.physical.kgPerTon)
      / terraformingParameters.phaseChange.condensation.secondsPerDay;
    if (!(rate > 0)) {
      return { liquid: 0, ice: 0 };
    }

    const mix = Math.min(Math.max((temp - (freezePoint - transitionRange)) / (2 * transitionRange), 0), 1);
    return {
      liquid: rate * mix,
      ice: rate * (1 - mix)
    };
  };

  const day = calc(dayTemp, dayPressureState);
  const night = calc(nightTemp, nightPressureState);
  return {
    liquidRate: (day.liquid + night.liquid) / 2,
    iceRate: (day.ice + night.ice) / 2
  };
}

if (isNodeCondensation) {
  module.exports = {
    calculateCondensationPressureState,
    calculateExpectedHumidityExcess,
    condensationRateFactor
  };
} else {
  window.calculateCondensationPressureState = calculateCondensationPressureState;
  window.condensationRateFactor = condensationRateFactor;
}
