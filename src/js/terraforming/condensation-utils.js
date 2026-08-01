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

function condensationRateFactor({
  zoneArea,
  gravity,
  dayTemp,
  nightTemp,
  freezePoint,
  transitionRange = terraformingParameters.phaseChange.condensation.phaseTransitionRangeK,
  vaporPressure,
  dayPressureState,
  nightPressureState,
  homogeneousHumidity = false
}) {
  const calc = (temp, pressureState) => {
    if (zoneArea <= 0 || vaporPressure <= 0) {
      return { liquid: 0, ice: 0 };
    }

    const saturationPressure = pressureState.saturationPressure;
    let excessPressure = Math.max(0, vaporPressure - saturationPressure);
    if (!homogeneousHumidity) {
      const shape = terraformingParameters.phaseChange.statisticalHumidity.drySkewShape;
      const upperBoundPressure = (shape + 1) * vaporPressure;
      excessPressure = saturationPressure >= upperBoundPressure
        ? 0
        : vaporPressure * Math.pow(
            1 - saturationPressure / upperBoundPressure,
            shape + 1
          );
    }
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
    condensationRateFactor
  };
} else {
  window.calculateCondensationPressureState = calculateCondensationPressureState;
  window.condensationRateFactor = condensationRateFactor;
}
