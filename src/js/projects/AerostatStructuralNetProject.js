const AEROSTAT_STRUCTURAL_NET_REPEATS_PER_LAND = 1;

class AerostatStructuralNetProject extends ArtificialSkyProject {
  getCostRateLabel() {
    return t(
      'ui.projects.aerostatStructuralNet.costRateLabel',
      null,
      'Aerostat Structural Net'
    );
  }

  getInitialLand() {
    return Math.max(resolveWorldBaseLand(terraforming, resources.surface.land), 0);
  }

  getMaxRepeats() {
    const initialLand = this.getInitialLand();
    const segments = Math.max(
      1,
      Math.ceil(initialLand * AEROSTAT_STRUCTURAL_NET_REPEATS_PER_LAND)
    );
    this.maxRepeatCount = segments;
    return segments;
  }

  isRelevantToCurrentPlanet() {
    return spaceManager.currentPlanetKey === 'zeus';
  }

  applyArtificialSkyCompletionEffects() {}
}

window.AerostatStructuralNetProject = AerostatStructuralNetProject;
