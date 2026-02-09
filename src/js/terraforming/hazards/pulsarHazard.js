function normalizePulsarParameters(parameters = {}) {
  return {
    pulsePeriodSeconds: Number.isFinite(parameters.pulsePeriodSeconds) ? Math.max(1, parameters.pulsePeriodSeconds) : 1.337,
    severity: Number.isFinite(parameters.severity) ? Math.max(0, parameters.severity) : 1,
    description: parameters.description || 'Pulsar hazard detected. Full mechanics pending implementation.'
  };
}

function consumePulsarArgs() {}

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
  }

  update(deltaSeconds, terraforming, pulsarParameters) {
    consumePulsarArgs(deltaSeconds, terraforming, pulsarParameters);
    const share = pulsarParameters ? 1 : 0;
    this.manager.setHazardLandReservationShare('pulsar', share);
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
