class ArtificialCrustProject extends ArtificialSkyProject {
  getCostRateLabel() {
    return 'Artificial Crust';
  }

  getBaseCoreHeatFlux() {
    const params = currentPlanetParameters?.celestialParameters || terraforming?.celestialParameters || {};
    return Math.max(0, params.coreHeatFlux || 0);
  }

  isRelevantToCurrentPlanet() {
    return this.getBaseCoreHeatFlux() > 0;
  }

  getMaxRepeats() {
    const initialLand = this.getInitialLand();
    const segments = Math.max(1, Math.ceil(initialLand));
    this.maxRepeatCount = segments;
    return segments;
  }

  applyArtificialSkyCompletionEffects() {}
}

try {
  window.ArtificialCrustProject = ArtificialCrustProject;
} catch (error) {
  // Window not available in tests
}

try {
  module.exports = ArtificialCrustProject;
} catch (error) {
  // Module system not available in browser
}
