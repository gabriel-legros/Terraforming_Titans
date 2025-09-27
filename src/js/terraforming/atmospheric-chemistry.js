const isNodeChem = typeof module !== 'undefined' && module.exports;

const METHANE_COMBUSTION_PARAMETER = 1e-15; // Rate coefficient for CH4/O2 combustion
const OXYGEN_COMBUSTION_THRESHOLD = 12000; // 12 kPa - minimum oxygen pressure for combustion
const METHANE_COMBUSTION_THRESHOLD = 100; // 0.1 kPa - minimum methane pressure for combustion
const CALCITE_HALF_LIFE_SECONDS = 240; // Calcite aerosol half-life
const CALCITE_DECAY_CONSTANT = Math.log(2) / CALCITE_HALF_LIFE_SECONDS;
const SULFURIC_ACID_RAIN_THRESHOLD_K = 570;
const SULFURIC_ACID_REFERENCE_TEMPERATURE_K = 300;
const SULFURIC_ACID_REFERENCE_DECAY_CONSTANT = Math.log(2) / 300;
const HYDROGEN_ESCAPE_GRAVITY_THRESHOLD = 20;
const HYDROGEN_HALF_LIFE_MIN_SECONDS = 300;
const HYDROGEN_HALF_LIFE_MAX_SECONDS = 3000;
const HYDROGEN_ATOMIC_HALF_LIFE_MULTIPLIER = 0.25;
const HYDROGEN_PHOTODISSOCIATION_REFERENCE_FLUX = 500;
const HYDROGEN_PHOTODISSOCIATION_MAX_FRACTION = 0.6;

function runAtmosphericChemistry(resources, params = {}) {
  const {
    globalOxygenPressurePa = 0,
    globalMethanePressurePa = 0,
    availableGlobalMethaneGas = 0,
    availableGlobalOxygenGas = 0,
    realSeconds = 0,
    durationSeconds = 0,
    surfaceArea = 1,
    surfaceTemperatureK = SULFURIC_ACID_RAIN_THRESHOLD_K,
    gravity = 0,
    solarFlux = 0,
  } = params;

  let combustionMethaneAmount = 0;
  let combustionOxygenAmount = 0;
  let combustionWaterAmount = 0;
  let combustionCO2Amount = 0;

  if (
    globalOxygenPressurePa > OXYGEN_COMBUSTION_THRESHOLD &&
    globalMethanePressurePa > METHANE_COMBUSTION_THRESHOLD
  ) {
    const rate =
      METHANE_COMBUSTION_PARAMETER *
      (globalOxygenPressurePa - OXYGEN_COMBUSTION_THRESHOLD) *
      (globalMethanePressurePa - METHANE_COMBUSTION_THRESHOLD) *
      surfaceArea;

    combustionMethaneAmount = Math.min(
      rate * durationSeconds,
      availableGlobalMethaneGas,
      availableGlobalOxygenGas / 4
    );
    combustionOxygenAmount = combustionMethaneAmount * 4;
    combustionWaterAmount = combustionMethaneAmount * 2.25;
    combustionCO2Amount = combustionMethaneAmount * 2.75;
  }

  let calciteDecayAmount = 0;
  const currentCalcite = resources?.atmospheric?.calciteAerosol?.value || 0;
  if (realSeconds > 0 && currentCalcite > 0) {
    calciteDecayAmount =
      currentCalcite * (1 - Math.exp(-CALCITE_DECAY_CONSTANT * realSeconds));
  }

  let sulfuricAcidDecayAmount = 0;
  const currentSulfuricAcid = resources?.atmospheric?.sulfuricAcid?.value || 0;
  if (realSeconds > 0 && currentSulfuricAcid > 0 && surfaceTemperatureK < SULFURIC_ACID_RAIN_THRESHOLD_K) {
    const clampedTemperature = Math.max(
      SULFURIC_ACID_REFERENCE_TEMPERATURE_K,
      surfaceTemperatureK
    );
    const temperatureFraction =
      (SULFURIC_ACID_RAIN_THRESHOLD_K - clampedTemperature) /
      (SULFURIC_ACID_RAIN_THRESHOLD_K - SULFURIC_ACID_REFERENCE_TEMPERATURE_K);
    const decayConstant = SULFURIC_ACID_REFERENCE_DECAY_CONSTANT * temperatureFraction;
    if (decayConstant > 0) {
      sulfuricAcidDecayAmount =
        currentSulfuricAcid * (1 - Math.exp(-decayConstant * realSeconds));
    }
  }

  let hydrogenDecayAmount = 0;
  const currentHydrogen = resources?.atmospheric?.hydrogen?.value || 0;
  if (realSeconds > 0 && currentHydrogen > 0) {
    if (gravity < HYDROGEN_ESCAPE_GRAVITY_THRESHOLD) {
      const clampedGravity = Math.max(gravity, 0);
      const gravityRatio = clampedGravity / HYDROGEN_ESCAPE_GRAVITY_THRESHOLD;
      const hydrogenHalfLifeSeconds =
        HYDROGEN_HALF_LIFE_MIN_SECONDS +
        (HYDROGEN_HALF_LIFE_MAX_SECONDS - HYDROGEN_HALF_LIFE_MIN_SECONDS) * gravityRatio;
      const molecularDecayConstant = Math.log(2) / hydrogenHalfLifeSeconds;
      const solarFluxRatio = solarFlux > 0 ? solarFlux / (solarFlux + HYDROGEN_PHOTODISSOCIATION_REFERENCE_FLUX) : 0;
      const atomicFraction = Math.min(1, solarFluxRatio * HYDROGEN_PHOTODISSOCIATION_MAX_FRACTION);
      const molecularFraction = Math.max(0, 1 - atomicFraction);
      const molecularAmount = currentHydrogen * molecularFraction;
      const atomicAmount = currentHydrogen - molecularAmount;
      const molecularLoss =
        molecularAmount * (1 - Math.exp(-molecularDecayConstant * realSeconds));
      const atomicHalfLifeSeconds = hydrogenHalfLifeSeconds * HYDROGEN_ATOMIC_HALF_LIFE_MULTIPLIER;
      const atomicDecayConstant = Math.log(2) / atomicHalfLifeSeconds;
      const atomicLoss =
        atomicAmount * (1 - Math.exp(-atomicDecayConstant * realSeconds));
      hydrogenDecayAmount = Math.min(currentHydrogen, molecularLoss + atomicLoss);
    }
  }

  const methaneRate = durationSeconds > 0 ? (combustionMethaneAmount / durationSeconds) * 86400 : 0;
  const oxygenRate = durationSeconds > 0 ? (combustionOxygenAmount / durationSeconds) * 86400 : 0;
  const waterRate = durationSeconds > 0 ? (combustionWaterAmount / durationSeconds) * 86400 : 0;
  const co2Rate = durationSeconds > 0 ? (combustionCO2Amount / durationSeconds) * 86400 : 0;
  const calciteRate = realSeconds > 0 ? calciteDecayAmount / realSeconds : 0;
  const acidRainRate = realSeconds > 0 ? sulfuricAcidDecayAmount / realSeconds : 0;
  const hydrogenRate = realSeconds > 0 ? hydrogenDecayAmount / realSeconds : 0;

  const rateType = 'terraforming';
  resources?.atmospheric?.atmosphericWater?.modifyRate?.(
    waterRate,
    'Methane Combustion',
    rateType
  );
  resources?.atmospheric?.carbonDioxide?.modifyRate?.(
    co2Rate,
    'Methane Combustion',
    rateType
  );
  resources?.atmospheric?.atmosphericMethane?.modifyRate?.(
    -methaneRate,
    'Methane Combustion',
    rateType
  );
  resources?.atmospheric?.oxygen?.modifyRate?.(
    -oxygenRate,
    'Methane Combustion',
    rateType
  );
  resources?.atmospheric?.calciteAerosol?.modifyRate?.(
    -calciteRate,
    'Calcite Decay',
    rateType
  );
  resources?.atmospheric?.sulfuricAcid?.modifyRate?.(
    -acidRainRate,
    'Acid rain',
    rateType
  );
  resources?.atmospheric?.hydrogen?.modifyRate?.(
    -hydrogenRate,
    'Hydrogen Escape',
    rateType
  );

  return {
    changes: {
      atmosphericMethane: -combustionMethaneAmount,
      oxygen: -combustionOxygenAmount,
      atmosphericWater: combustionWaterAmount,
      carbonDioxide: combustionCO2Amount,
      calciteAerosol: -calciteDecayAmount,
      sulfuricAcid: -sulfuricAcidDecayAmount,
      hydrogen: -hydrogenDecayAmount,
    },
    rates: {
      methane: methaneRate,
      oxygen: oxygenRate,
      water: waterRate,
      co2: co2Rate,
      calcite: calciteRate,
      acidRain: acidRainRate,
      hydrogen: hydrogenRate,
    },
  };
}

if (isNodeChem) {
  module.exports = {
    runAtmosphericChemistry,
    METHANE_COMBUSTION_PARAMETER,
    OXYGEN_COMBUSTION_THRESHOLD,
    METHANE_COMBUSTION_THRESHOLD,
    CALCITE_HALF_LIFE_SECONDS,
    SULFURIC_ACID_RAIN_THRESHOLD_K,
    SULFURIC_ACID_REFERENCE_TEMPERATURE_K,
    SULFURIC_ACID_REFERENCE_DECAY_CONSTANT,
    HYDROGEN_ESCAPE_GRAVITY_THRESHOLD,
    HYDROGEN_HALF_LIFE_MIN_SECONDS,
    HYDROGEN_HALF_LIFE_MAX_SECONDS,
    HYDROGEN_ATOMIC_HALF_LIFE_MULTIPLIER,
    HYDROGEN_PHOTODISSOCIATION_REFERENCE_FLUX,
    HYDROGEN_PHOTODISSOCIATION_MAX_FRACTION,
  };
} else {
  globalThis.runAtmosphericChemistry = runAtmosphericChemistry;
  globalThis.METHANE_COMBUSTION_PARAMETER = METHANE_COMBUSTION_PARAMETER;
  globalThis.OXYGEN_COMBUSTION_THRESHOLD = OXYGEN_COMBUSTION_THRESHOLD;
  globalThis.METHANE_COMBUSTION_THRESHOLD = METHANE_COMBUSTION_THRESHOLD;
  globalThis.CALCITE_HALF_LIFE_SECONDS = CALCITE_HALF_LIFE_SECONDS;
  globalThis.SULFURIC_ACID_RAIN_THRESHOLD_K = SULFURIC_ACID_RAIN_THRESHOLD_K;
  globalThis.SULFURIC_ACID_REFERENCE_TEMPERATURE_K = SULFURIC_ACID_REFERENCE_TEMPERATURE_K;
  globalThis.SULFURIC_ACID_REFERENCE_DECAY_CONSTANT = SULFURIC_ACID_REFERENCE_DECAY_CONSTANT;
  globalThis.HYDROGEN_ESCAPE_GRAVITY_THRESHOLD = HYDROGEN_ESCAPE_GRAVITY_THRESHOLD;
  globalThis.HYDROGEN_HALF_LIFE_MIN_SECONDS = HYDROGEN_HALF_LIFE_MIN_SECONDS;
  globalThis.HYDROGEN_HALF_LIFE_MAX_SECONDS = HYDROGEN_HALF_LIFE_MAX_SECONDS;
  globalThis.HYDROGEN_ATOMIC_HALF_LIFE_MULTIPLIER = HYDROGEN_ATOMIC_HALF_LIFE_MULTIPLIER;
  globalThis.HYDROGEN_PHOTODISSOCIATION_REFERENCE_FLUX = HYDROGEN_PHOTODISSOCIATION_REFERENCE_FLUX;
  globalThis.HYDROGEN_PHOTODISSOCIATION_MAX_FRACTION = HYDROGEN_PHOTODISSOCIATION_MAX_FRACTION;
}

