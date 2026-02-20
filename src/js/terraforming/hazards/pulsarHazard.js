let pulsarRadiationPenaltyFromDose = null;
try {
  ({ radiationPenalty: pulsarRadiationPenaltyFromDose } = require('../radiation-utils.js'));
} catch (error) {
  try {
    pulsarRadiationPenaltyFromDose = radiationPenalty;
  } catch (innerError) {
    pulsarRadiationPenaltyFromDose = null;
  }
}
if (!pulsarRadiationPenaltyFromDose) {
  pulsarRadiationPenaltyFromDose = function fallbackRadiationPenalty(dose_mSvDay) {
    const D0 = 1.07;
    const a = 1.12;
    const D = Math.max(dose_mSvDay, 1e-12);
    return 1 / (1 + Math.pow(D0 / D, a));
  };
}

const PULSAR_STORM_PERIOD_SECONDS = 100;
const PULSAR_STORM_DEFAULT_DURATION_SECONDS = 5;
const PULSAR_STORM_ANDROID_ATTRITION_RATE = 0.03;
const PULSAR_STORM_ELECTRONICS_ATTRITION_RATE = 0.03;
const PULSAR_STORM_NANOBOT_ATTRITION_RATE = 0.03;
const PULSAR_STORM_EFFECT_LABEL = 'Electromagnetic Storm';

function normalizePulsarParameters(parameters = {}) {
  const severity = Number.isFinite(parameters.severity) ? Math.max(0, parameters.severity) : 1;
  const orbitalDoseBoost = Number.isFinite(parameters.orbitalDoseBoost_mSvPerDay)
    ? Math.max(0, parameters.orbitalDoseBoost_mSvPerDay)
    : (Number.isFinite(parameters.surfaceDoseBoost_mSvPerDay)
      ? Math.max(0, parameters.surfaceDoseBoost_mSvPerDay)
      : 4900 * severity);
  return {
    pulsePeriodSeconds: Number.isFinite(parameters.pulsePeriodSeconds) ? Math.max(1, parameters.pulsePeriodSeconds) : 1.337,
    stormDurationSeconds: Number.isFinite(parameters.stormDurationSeconds)
      ? Math.max(0, parameters.stormDurationSeconds)
      : PULSAR_STORM_DEFAULT_DURATION_SECONDS,
    severity: severity,
    orbitalDoseBoost_mSvPerDay: orbitalDoseBoost,
    description: parameters.description || 'Pulsar hazard detected. Extreme radiation floods the planet.'
  };
}

function consumePulsarArgs() {}
function getArtificialSkyProject() {
  try {
    return projectManager && projectManager.projects ? projectManager.projects.artificialSky : null;
  } catch (error) {
    return null;
  }
}

function clampRatio(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }
  return value;
}

function getArtificialSkyCompletionRatio() {
  const artificialSky = getArtificialSkyProject();
  if (!artificialSky) {
    return 0;
  }
  if (artificialSky.isCompleted) {
    return 1;
  }
  if (artificialSky.getCompletionFraction) {
    return clampRatio(artificialSky.getCompletionFraction());
  }
  const maxSegments = Math.max(artificialSky.maxRepeatCount || 1, 1);
  const builtSegments = Math.max(artificialSky.repeatCount || 0, 0);
  return clampRatio(builtSegments / maxSegments);
}

function isRogueWorld(terraforming) {
  return terraforming?.celestialParameters?.rogue === true;
}

function resolveDistanceFromSunAU(terraforming) {
  const distance = terraforming?.celestialParameters?.distanceFromSun;
  if (!Number.isFinite(distance) || distance <= 0) {
    return 0;
  }
  return distance;
}

function getDistanceScalingMultiplier(currentDistanceAU, referenceDistanceAU) {
  if (!Number.isFinite(currentDistanceAU) || currentDistanceAU <= 0) {
    return 1;
  }
  if (!Number.isFinite(referenceDistanceAU) || referenceDistanceAU <= 0) {
    return 1;
  }
  const ratio = referenceDistanceAU / currentDistanceAU;
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return 1;
  }
  return Math.min(1, ratio * ratio);
}

function getPulsarHazardStrength(terraforming, pulsarParameters) {
  if (!pulsarParameters) {
    return 0;
  }
  if (isRogueWorld(terraforming)) {
    return 0;
  }
  return 1 - getArtificialSkyCompletionRatio();
}

function isArtificialSkyCompleted(terraforming, pulsarParameters) {
  return getPulsarHazardStrength(terraforming, pulsarParameters) <= 0;
}

function applyPulsarStormAttrition(seconds, hazardStrength = 1) {
  if (!seconds || seconds <= 0 || hazardStrength <= 0) {
    return;
  }

  const attritionScale = Math.max(0, Math.min(1, hazardStrength));
  const androidAttritionRate = PULSAR_STORM_ANDROID_ATTRITION_RATE * attritionScale;
  const electronicsAttritionRate = PULSAR_STORM_ELECTRONICS_ATTRITION_RATE * attritionScale;
  const nanobotAttritionRate = PULSAR_STORM_NANOBOT_ATTRITION_RATE * attritionScale;

  const androidResource = resources.colony.androids;
  const currentAndroids = Number.isFinite(androidResource.value) ? androidResource.value : 0;
  const assignedAndroids = projectManager && projectManager.getAssignedAndroids
    ? Math.max(0, projectManager.getAssignedAndroids())
    : 0;
  const exposedAndroids = Math.max(0, currentAndroids - assignedAndroids);
  const androidLoss = exposedAndroids * androidAttritionRate * seconds;
  if (androidLoss > 0) {
    androidResource.value = Math.max(0, currentAndroids - androidLoss);
    if (androidResource.modifyRate) {
      androidResource.modifyRate(
        -exposedAndroids * androidAttritionRate,
        PULSAR_STORM_EFFECT_LABEL,
        'hazard'
      );
    }
  }

  const electronicsResource = resources.colony.electronics;
  const currentElectronics = Number.isFinite(electronicsResource.value) ? electronicsResource.value : 0;
  const electronicsLoss = currentElectronics * electronicsAttritionRate * seconds;
  if (electronicsLoss > 0) {
    electronicsResource.value = Math.max(0, currentElectronics - electronicsLoss);
    if (electronicsResource.modifyRate) {
      electronicsResource.modifyRate(
        -currentElectronics * electronicsAttritionRate,
        PULSAR_STORM_EFFECT_LABEL,
        'hazard'
      );
    }
  }

  if (nanotechManager) {
    const currentNanobots = Number.isFinite(nanotechManager.nanobots) ? nanotechManager.nanobots : 1;
    const nanobotLoss = currentNanobots * nanobotAttritionRate * seconds;
    if (nanobotLoss > 0) {
      nanotechManager.nanobots = Math.max(1, currentNanobots - nanobotLoss);
    }
  }
}

function applyPulsarRadiation(terraforming, pulsarParameters, hazardStrength = 1) {
  if (!terraforming || !pulsarParameters || hazardStrength <= 0) {
    return;
  }

  const orbitalBoostBase = Number.isFinite(pulsarParameters.orbitalDoseBoost_mSvPerDay)
    ? Math.max(0, pulsarParameters.orbitalDoseBoost_mSvPerDay)
    : 0;
  const orbitalBoost = orbitalBoostBase * Math.max(0, Math.min(1, hazardStrength));

  const pressureKPa = terraforming.calculateTotalPressure ? terraforming.calculateTotalPressure() : 0;
  const pressurePa = Number.isFinite(pressureKPa) ? pressureKPa * 1000 : 0;
  const gravity = terraforming.celestialParameters && Number.isFinite(terraforming.celestialParameters.gravity)
    ? terraforming.celestialParameters.gravity
    : 1;
  const column_gcm2 = gravity > 0 ? (pressurePa / gravity) * 0.1 : 0;
  const beltAttenuationLength_gcm2 = 30;
  const surfaceBoost = orbitalBoost * Math.exp(-column_gcm2 / beltAttenuationLength_gcm2);

  terraforming.surfaceRadiation = (terraforming.surfaceRadiation || 0) + surfaceBoost;
  terraforming.orbitalRadiation = (terraforming.orbitalRadiation || 0) + orbitalBoost;
  terraforming.radiationPenalty = pulsarRadiationPenaltyFromDose(terraforming.surfaceRadiation || 0);
}

class PulsarHazard {
  constructor(manager) {
    this.manager = manager;
    this.stormTimerSeconds = 0;
    this.stormRemainingSeconds = 0;
    this.hazardStrength = 0;
    this.artificialSkyCompletion = 0;
    this.initialDistanceFromSunAU = 0;
    this.distanceFromSunMultiplier = 1;
  }

  normalize(parameters = {}) {
    return normalizePulsarParameters(parameters);
  }

  initialize(terraforming, pulsarParameters, options = {}) {
    consumePulsarArgs(terraforming, pulsarParameters, options);
    this.initialDistanceFromSunAU = resolveDistanceFromSunAU(terraforming);
    const currentDistanceAU = resolveDistanceFromSunAU(terraforming);
    const distanceMultiplier = getDistanceScalingMultiplier(
      currentDistanceAU,
      this.initialDistanceFromSunAU
    );
    const skyShare = getPulsarHazardStrength(terraforming, pulsarParameters);
    const share = skyShare * distanceMultiplier;
    this.hazardStrength = share;
    this.distanceFromSunMultiplier = distanceMultiplier;
    this.artificialSkyCompletion = 1 - skyShare;
    this.manager.setHazardLandReservationShare('pulsar', share);
    if (share > 0) {
      applyPulsarRadiation(terraforming, pulsarParameters, share);
    } else {
      this.resetStormState();
    }
  }

  update(deltaSeconds, terraforming, pulsarParameters) {
    consumePulsarArgs(deltaSeconds, terraforming, pulsarParameters);
    if (!(this.initialDistanceFromSunAU > 0)) {
      this.initialDistanceFromSunAU = resolveDistanceFromSunAU(terraforming);
    }
    const currentDistanceAU = resolveDistanceFromSunAU(terraforming);
    const distanceMultiplier = getDistanceScalingMultiplier(
      currentDistanceAU,
      this.initialDistanceFromSunAU
    );
    const skyShare = getPulsarHazardStrength(terraforming, pulsarParameters);
    const share = skyShare * distanceMultiplier;
    this.hazardStrength = share;
    this.distanceFromSunMultiplier = distanceMultiplier;
    this.artificialSkyCompletion = 1 - skyShare;
    this.manager.setHazardLandReservationShare('pulsar', share);
    if (share > 0) {
      this.advanceStormState(deltaSeconds, pulsarParameters);
      applyPulsarRadiation(terraforming, pulsarParameters, share);
    } else {
      this.resetStormState();
    }
  }

  isCleared(terraforming, pulsarParameters) {
    consumePulsarArgs(terraforming, pulsarParameters);
    if (!pulsarParameters) {
      return true;
    }
    if (isRogueWorld(terraforming)) {
      return true;
    }
    return isArtificialSkyCompleted(terraforming, pulsarParameters);
  }

  getArtificialSkyCompletionRatio(terraforming = null, pulsarParameters = null) {
    if (terraforming && pulsarParameters) {
      return clampRatio(1 - getPulsarHazardStrength(terraforming, pulsarParameters));
    }
    return clampRatio(this.artificialSkyCompletion);
  }

  getHazardStrength(terraforming = null, pulsarParameters = null) {
    if (terraforming && pulsarParameters) {
      const currentDistanceAU = resolveDistanceFromSunAU(terraforming);
      const referenceDistanceAU = this.initialDistanceFromSunAU > 0
        ? this.initialDistanceFromSunAU
        : currentDistanceAU;
      const distanceMultiplier = getDistanceScalingMultiplier(currentDistanceAU, referenceDistanceAU);
      const skyShare = getPulsarHazardStrength(terraforming, pulsarParameters);
      return clampRatio(skyShare * distanceMultiplier);
    }
    return clampRatio(this.hazardStrength);
  }

  getDistanceFromSunMultiplier(terraforming = null) {
    if (!terraforming) {
      return this.distanceFromSunMultiplier > 0 ? this.distanceFromSunMultiplier : 1;
    }
    const currentDistanceAU = resolveDistanceFromSunAU(terraforming);
    const referenceDistanceAU = this.initialDistanceFromSunAU > 0
      ? this.initialDistanceFromSunAU
      : currentDistanceAU;
    return getDistanceScalingMultiplier(currentDistanceAU, referenceDistanceAU);
  }

  getInitialDistanceFromSunAU() {
    return this.initialDistanceFromSunAU > 0 ? this.initialDistanceFromSunAU : 0;
  }

  isStormActive() {
    return this.stormRemainingSeconds > 0;
  }

  getStormRemainingSeconds() {
    return this.stormRemainingSeconds > 0 ? this.stormRemainingSeconds : 0;
  }

  getSecondsUntilNextStorm() {
    if (this.isStormActive()) {
      return 0;
    }
    return Math.max(0, PULSAR_STORM_PERIOD_SECONDS - this.stormTimerSeconds);
  }

  getStormDurationSeconds(pulsarParameters = null) {
    const activeParameters = pulsarParameters
      || (this.manager && this.manager.parameters ? this.manager.parameters.pulsar : null);
    if (activeParameters && Number.isFinite(activeParameters.stormDurationSeconds)) {
      return Math.max(0, activeParameters.stormDurationSeconds);
    }
    return PULSAR_STORM_DEFAULT_DURATION_SECONDS;
  }

  resetStormState() {
    this.stormTimerSeconds = 0;
    this.stormRemainingSeconds = 0;
  }

  startStorm(pulsarParameters = null) {
    this.stormRemainingSeconds = this.getStormDurationSeconds(pulsarParameters);
  }

  save() {
    return {
      stormTimerSeconds: Number.isFinite(this.stormTimerSeconds) ? this.stormTimerSeconds : 0,
      stormRemainingSeconds: Number.isFinite(this.stormRemainingSeconds) ? this.stormRemainingSeconds : 0,
      hazardStrength: Number.isFinite(this.hazardStrength) ? this.hazardStrength : 0,
      artificialSkyCompletion: Number.isFinite(this.artificialSkyCompletion) ? this.artificialSkyCompletion : 0,
      initialDistanceFromSunAU: Number.isFinite(this.initialDistanceFromSunAU) ? this.initialDistanceFromSunAU : 0,
      distanceFromSunMultiplier: Number.isFinite(this.distanceFromSunMultiplier) ? this.distanceFromSunMultiplier : 1
    };
  }

  load(data) {
    const stormDurationSeconds = this.getStormDurationSeconds();
    const timer = data && Number.isFinite(data.stormTimerSeconds) ? data.stormTimerSeconds : 0;
    const remaining = data && Number.isFinite(data.stormRemainingSeconds) ? data.stormRemainingSeconds : 0;
    this.stormTimerSeconds = Math.max(0, Math.min(PULSAR_STORM_PERIOD_SECONDS, timer));
    this.stormRemainingSeconds = Math.max(0, Math.min(stormDurationSeconds, remaining));
    const strength = data && Number.isFinite(data.hazardStrength) ? data.hazardStrength : 0;
    this.hazardStrength = clampRatio(strength);
    const completion = data && Number.isFinite(data.artificialSkyCompletion) ? data.artificialSkyCompletion : (1 - this.hazardStrength);
    this.artificialSkyCompletion = clampRatio(completion);
    const initialDistance = data && Number.isFinite(data.initialDistanceFromSunAU)
      ? data.initialDistanceFromSunAU
      : 0;
    this.initialDistanceFromSunAU = initialDistance > 0 ? initialDistance : 0;
    const distanceMultiplier = data && Number.isFinite(data.distanceFromSunMultiplier)
      ? data.distanceFromSunMultiplier
      : 1;
    this.distanceFromSunMultiplier = distanceMultiplier > 0 ? distanceMultiplier : 1;
  }

  advanceStormState(deltaSeconds, pulsarParameters = null) {
    let remaining = Number.isFinite(deltaSeconds) ? Math.max(0, deltaSeconds) : 0;
    while (remaining > 0) {
      if (this.stormRemainingSeconds > 0) {
        const activeSlice = Math.min(remaining, this.stormRemainingSeconds);
        applyPulsarStormAttrition(activeSlice, this.hazardStrength);
        this.stormRemainingSeconds = Math.max(0, this.stormRemainingSeconds - activeSlice);
        remaining -= activeSlice;
        continue;
      }

      const timeUntilStorm = Math.max(0, PULSAR_STORM_PERIOD_SECONDS - this.stormTimerSeconds);
      if (timeUntilStorm <= 0) {
        this.stormTimerSeconds = 0;
        this.startStorm(pulsarParameters);
        continue;
      }

      const quietSlice = Math.min(remaining, timeUntilStorm);
      this.stormTimerSeconds += quietSlice;
      remaining -= quietSlice;
      if (this.stormTimerSeconds >= PULSAR_STORM_PERIOD_SECONDS) {
        this.stormTimerSeconds = 0;
        this.startStorm(pulsarParameters);
      }
    }
  }
}

try {
  window.PulsarHazard = PulsarHazard;
} catch (error) {
  // Window not available in tests
}

try {
  module.exports = { PulsarHazard, normalizePulsarParameters };
} catch (error) {
  // Module system not available in browser
}
