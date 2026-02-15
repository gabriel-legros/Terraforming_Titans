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
const PULSAR_STORM_DURATION_SECONDS = 5;
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

function ensureArtificialSkyUnlocked(pulsarParameters) {
  if (!pulsarParameters) {
    return;
  }
  const artificialSky = getArtificialSkyProject();
  if (artificialSky && !artificialSky.unlocked) {
    artificialSky.enable();
  }
}

function isRogueWorld(terraforming) {
  return terraforming?.celestialParameters?.rogue === true;
}

function isArtificialSkyCompleted() {
  const artificialSky = getArtificialSkyProject();
  return !!(artificialSky && artificialSky.isCompleted);
}

function applyPulsarStormAttrition(seconds) {
  if (!seconds || seconds <= 0) {
    return;
  }

  const androidResource = resources.colony.androids;
  const currentAndroids = Number.isFinite(androidResource.value) ? androidResource.value : 0;
  const assignedAndroids = projectManager && projectManager.getAssignedAndroids
    ? Math.max(0, projectManager.getAssignedAndroids())
    : 0;
  const exposedAndroids = Math.max(0, currentAndroids - assignedAndroids);
  const androidLoss = exposedAndroids * PULSAR_STORM_ANDROID_ATTRITION_RATE * seconds;
  if (androidLoss > 0) {
    androidResource.value = Math.max(0, currentAndroids - androidLoss);
    if (androidResource.modifyRate) {
      androidResource.modifyRate(
        -exposedAndroids * PULSAR_STORM_ANDROID_ATTRITION_RATE,
        PULSAR_STORM_EFFECT_LABEL,
        'hazard'
      );
    }
  }

  const electronicsResource = resources.colony.electronics;
  const currentElectronics = Number.isFinite(electronicsResource.value) ? electronicsResource.value : 0;
  const electronicsLoss = currentElectronics * PULSAR_STORM_ELECTRONICS_ATTRITION_RATE * seconds;
  if (electronicsLoss > 0) {
    electronicsResource.value = Math.max(0, currentElectronics - electronicsLoss);
    if (electronicsResource.modifyRate) {
      electronicsResource.modifyRate(
        -currentElectronics * PULSAR_STORM_ELECTRONICS_ATTRITION_RATE,
        PULSAR_STORM_EFFECT_LABEL,
        'hazard'
      );
    }
  }

  if (nanotechManager) {
    const currentNanobots = Number.isFinite(nanotechManager.nanobots) ? nanotechManager.nanobots : 1;
    const nanobotLoss = currentNanobots * PULSAR_STORM_NANOBOT_ATTRITION_RATE * seconds;
    if (nanobotLoss > 0) {
      nanotechManager.nanobots = Math.max(1, currentNanobots - nanobotLoss);
    }
  }
}

function applyPulsarRadiation(terraforming, pulsarParameters) {
  if (!terraforming || !pulsarParameters) {
    return;
  }

  const orbitalBoost = Number.isFinite(pulsarParameters.orbitalDoseBoost_mSvPerDay)
    ? Math.max(0, pulsarParameters.orbitalDoseBoost_mSvPerDay)
    : 0;

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
  }

  normalize(parameters = {}) {
    return normalizePulsarParameters(parameters);
  }

  initialize(terraforming, pulsarParameters, options = {}) {
    consumePulsarArgs(terraforming, pulsarParameters, options);
    ensureArtificialSkyUnlocked(pulsarParameters);
    const share = (pulsarParameters && !this.isCleared(terraforming, pulsarParameters)) ? 1 : 0;
    this.manager.setHazardLandReservationShare('pulsar', share);
    if (share > 0) {
      applyPulsarRadiation(terraforming, pulsarParameters);
    } else {
      this.resetStormState();
    }
  }

  update(deltaSeconds, terraforming, pulsarParameters) {
    consumePulsarArgs(deltaSeconds, terraforming, pulsarParameters);
    ensureArtificialSkyUnlocked(pulsarParameters);
    const share = (pulsarParameters && !this.isCleared(terraforming, pulsarParameters)) ? 1 : 0;
    this.manager.setHazardLandReservationShare('pulsar', share);
    if (share > 0) {
      this.advanceStormState(deltaSeconds);
      applyPulsarRadiation(terraforming, pulsarParameters);
    } else {
      this.resetStormState();
    }
  }

  isCleared(terraforming, pulsarParameters) {
    consumePulsarArgs(terraforming, pulsarParameters);
    ensureArtificialSkyUnlocked(pulsarParameters);
    if (!pulsarParameters) {
      return true;
    }
    if (isRogueWorld(terraforming)) {
      return true;
    }
    return isArtificialSkyCompleted();
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

  resetStormState() {
    this.stormTimerSeconds = 0;
    this.stormRemainingSeconds = 0;
  }

  startStorm() {
    this.stormRemainingSeconds = PULSAR_STORM_DURATION_SECONDS;
  }

  save() {
    return {
      stormTimerSeconds: Number.isFinite(this.stormTimerSeconds) ? this.stormTimerSeconds : 0,
      stormRemainingSeconds: Number.isFinite(this.stormRemainingSeconds) ? this.stormRemainingSeconds : 0
    };
  }

  load(data) {
    const timer = data && Number.isFinite(data.stormTimerSeconds) ? data.stormTimerSeconds : 0;
    const remaining = data && Number.isFinite(data.stormRemainingSeconds) ? data.stormRemainingSeconds : 0;
    this.stormTimerSeconds = Math.max(0, Math.min(PULSAR_STORM_PERIOD_SECONDS, timer));
    this.stormRemainingSeconds = Math.max(0, Math.min(PULSAR_STORM_DURATION_SECONDS, remaining));
  }

  advanceStormState(deltaSeconds) {
    let remaining = Number.isFinite(deltaSeconds) ? Math.max(0, deltaSeconds) : 0;
    while (remaining > 0) {
      if (this.stormRemainingSeconds > 0) {
        const activeSlice = Math.min(remaining, this.stormRemainingSeconds);
        applyPulsarStormAttrition(activeSlice);
        this.stormRemainingSeconds = Math.max(0, this.stormRemainingSeconds - activeSlice);
        remaining -= activeSlice;
        continue;
      }

      const timeUntilStorm = Math.max(0, PULSAR_STORM_PERIOD_SECONDS - this.stormTimerSeconds);
      if (timeUntilStorm <= 0) {
        this.stormTimerSeconds = 0;
        this.startStorm();
        continue;
      }

      const quietSlice = Math.min(remaining, timeUntilStorm);
      this.stormTimerSeconds += quietSlice;
      remaining -= quietSlice;
      if (this.stormTimerSeconds >= PULSAR_STORM_PERIOD_SECONDS) {
        this.stormTimerSeconds = 0;
        this.startStorm();
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
