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

function normalizePulsarParameters(parameters = {}) {
  const severity = Number.isFinite(parameters.severity) ? Math.max(0, parameters.severity) : 1;
  const surfaceDoseBoost = Number.isFinite(parameters.surfaceDoseBoost_mSvPerDay)
    ? Math.max(0, parameters.surfaceDoseBoost_mSvPerDay)
    : 4900 * severity;
  const orbitalDoseBoost = Number.isFinite(parameters.orbitalDoseBoost_mSvPerDay)
    ? Math.max(0, parameters.orbitalDoseBoost_mSvPerDay)
    : surfaceDoseBoost;
  return {
    pulsePeriodSeconds: Number.isFinite(parameters.pulsePeriodSeconds) ? Math.max(1, parameters.pulsePeriodSeconds) : 1.337,
    severity: severity,
    surfaceDoseBoost_mSvPerDay: surfaceDoseBoost,
    orbitalDoseBoost_mSvPerDay: orbitalDoseBoost,
    description: parameters.description || 'Pulsar hazard detected. Extreme radiation floods the planet.'
  };
}

function consumePulsarArgs() {}
function applyPulsarRadiation(terraforming, pulsarParameters) {
  if (!terraforming || !pulsarParameters) {
    return;
  }

  const surfaceBoost = Number.isFinite(pulsarParameters.surfaceDoseBoost_mSvPerDay)
    ? Math.max(0, pulsarParameters.surfaceDoseBoost_mSvPerDay)
    : 0;
  const orbitalBoost = Number.isFinite(pulsarParameters.orbitalDoseBoost_mSvPerDay)
    ? Math.max(0, pulsarParameters.orbitalDoseBoost_mSvPerDay)
    : surfaceBoost;

  terraforming.surfaceRadiation = (terraforming.surfaceRadiation || 0) + surfaceBoost;
  terraforming.orbitalRadiation = (terraforming.orbitalRadiation || 0) + orbitalBoost;
  terraforming.radiationPenalty = pulsarRadiationPenaltyFromDose(terraforming.surfaceRadiation || 0);
}

class PulsarHazard {
  constructor(manager) {
    this.manager = manager;
  }

  normalize(parameters = {}) {
    return normalizePulsarParameters(parameters);
  }

  initialize(terraforming, pulsarParameters, options = {}) {
    consumePulsarArgs(terraforming, pulsarParameters, options);
    const share = pulsarParameters ? 1 : 0;
    this.manager.setHazardLandReservationShare('pulsar', share);
    applyPulsarRadiation(terraforming, pulsarParameters);
  }

  update(deltaSeconds, terraforming, pulsarParameters) {
    consumePulsarArgs(deltaSeconds, terraforming, pulsarParameters);
    const share = pulsarParameters ? 1 : 0;
    this.manager.setHazardLandReservationShare('pulsar', share);
    applyPulsarRadiation(terraforming, pulsarParameters);
  }

  isCleared(terraforming, pulsarParameters) {
    consumePulsarArgs(terraforming, pulsarParameters);
    return true;
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
