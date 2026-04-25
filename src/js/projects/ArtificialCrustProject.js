class ArtificialCrustProject extends ArtificialSkyProject {
  constructor(config, name) {
    super(config, name);
    this.kesslerDebrisSize = null;
  }

  getKesslerSuccessChance() {
    return 1;
  }

  hasLiquidHydrogenBlocker() {
    return resources.surface.liquidHydrogen.value > 0;
  }

  getWarningState() {
    if (!this.hasLiquidHydrogenBlocker()) {
      return null;
    }
    return {
      blocksStart: true,
      blocksProgress: true,
      message: t(
        'ui.projects.artificialCrust.liquidHydrogenWarning',
        null,
        'Liquid hydrogen blocks Artificial Crust construction. Remove it before starting or continuing this project.'
      ),
      statusText: t(
        'ui.projects.artificialCrust.liquidHydrogenStatus',
        null,
        'Blocked: remove liquid hydrogen first'
      )
    };
  }

  getCostRateLabel() {
    return t('ui.projects.artificialCrust.costRateLabel', null, 'Artificial Crust');
  }

  getBaseCoreHeatFlux() {
    const params = currentPlanetParameters?.celestialParameters || terraforming?.celestialParameters || {};
    return Math.max(0, params.coreHeatFlux || 0);
  }

  isRelevantToCurrentPlanet() {
    return this.getBaseCoreHeatFlux() > 0;
  }

  getInitialLand() {
    return Math.max(resolveWorldBaseLand(terraforming, resources?.surface?.land), 0);
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
