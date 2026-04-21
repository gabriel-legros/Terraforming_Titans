const AEROSTAT_STRUCTURAL_NET_REPEATS_PER_LAND = 1000;

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
    const baseLand = this.getInitialLand();
    const segments = Math.max(
      1,
      Math.ceil(baseLand * AEROSTAT_STRUCTURAL_NET_REPEATS_PER_LAND)
    );
    this.maxRepeatCount = segments;
    return segments;
  }

  getFullBuildCost() {
    const perSegmentCost = Project.prototype.getScaledCost.call(this);
    const fullCost = {};
    const segments = this.getMaxRepeats();

    for (const category in perSegmentCost) {
      fullCost[category] = {};
      for (const resource in perSegmentCost[category]) {
        const scaled = perSegmentCost[category][resource] * segments;
        if (scaled > 0) {
          fullCost[category][resource] = scaled;
        }
      }
      if (!Object.keys(fullCost[category]).length) {
        delete fullCost[category];
      }
    }

    return fullCost;
  }

  isRelevantToCurrentPlanet() {
    return spaceManager.currentPlanetKey === 'zeus';
  }

  applyArtificialSkyCompletionEffects() {}
}

window.AerostatStructuralNetProject = AerostatStructuralNetProject;
