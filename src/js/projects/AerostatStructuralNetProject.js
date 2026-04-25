const AEROSTAT_STRUCTURAL_NET_REPEATS_PER_LAND = 5000;

class AerostatStructuralNetProject extends ArtificialSkyProject {
  getCostRateLabel() {
    return t(
      'ui.projects.aerostatStructuralNet.costRateLabel',
      null,
      'Aerostat Structural Net'
    );
  }

  getInitialLand() {
    return Math.max(resolveWorldGeometricLand(terraforming, resources.surface.land), 0);
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

  getBuiltSegmentsWithProgress() {
    const maxSegments = this.getMaxRepeats();
    let built = Math.max(0, this.repeatCount || 0);

    if (this.isActive && !this.isContinuous() && this.startingDuration > 0) {
      const progress = (this.startingDuration - this.remainingTime) / this.startingDuration;
      built += Math.max(0, Math.min(1, progress));
    } else {
      built += Math.max(0, this.segmentProgress || 0);
    }

    return this.isCompleted ? Math.max(built, maxSegments) : built;
  }

  completeProjectFully() {
    const maxSegments = this.getMaxRepeats();
    this.repeatCount = Math.max(maxSegments, this.repeatCount || 0);
    this.segmentProgress = 0;
    this.isCompleted = true;
    this.isActive = false;
    this.isPaused = false;
    this.remainingTime = 0;
    this.startingDuration = 0;
    this.applyArtificialSkyCompletionEffects();
  }

  loadState(state) {
    this.maxRepeatCount = this.getMaxRepeats();
    SpaceshipProject.prototype.loadState.call(this, state);
    this.segmentProgress = state.segmentProgress || 0;
    const maxSegments = this.getMaxRepeats();
    if ((this.repeatCount || 0) >= maxSegments || this.isCompleted) {
      this.completeProjectFully();
    }
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

  isRelevantToCurrentPlanet(currentPlanetKey, planetParameters) {
    return currentPlanetKey === 'zeus' || planetParameters.classification?.archetype === 'jupiter-like';
  }

  applyArtificialSkyCompletionEffects() {}
}

window.AerostatStructuralNetProject = AerostatStructuralNetProject;
