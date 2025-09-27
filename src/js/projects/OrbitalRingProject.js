class OrbitalRingProject extends TerraformingDurationProject {
  constructor(config, name) {
    super(config, name);
    this.ringCount = 0;
    this.currentWorldHasRing = false;
  }

  renderUI(container) {
    if (typeof renderOrbitalRingUI === 'function') {
      renderOrbitalRingUI(this, container);
    }
  }

  updateUI() {
    if (typeof updateOrbitalRingUI === 'function') {
      updateOrbitalRingUI(this);
    }
  }

  canStart() {
    if (!super.canStart()) return false;
    if (
      typeof spaceManager === 'undefined' ||
      typeof spaceManager.getUnmodifiedTerraformedWorldCount !== 'function'
    ) {
      return true;
    }
    return this.ringCount < spaceManager.getUnmodifiedTerraformedWorldCount();
  }

  complete() {
    super.complete();
    this.ringCount += 1;
    if (!this.currentWorldHasRing && spaceManager?.isPlanetTerraformed(spaceManager.getCurrentPlanetKey())) {
      this.currentWorldHasRing = true;
      if (typeof spaceManager !== 'undefined' && typeof spaceManager.setCurrentWorldHasOrbitalRing === 'function') {
        spaceManager.setCurrentWorldHasOrbitalRing(true);
      }
      const initialLand = terraforming.initialLand || 0;
      if (resources?.surface?.land) {
        resources.surface.land.value += initialLand;
      }
    }
  }

  saveState() {
    return { ...super.saveState(), ringCount: this.ringCount, currentWorldHasRing: this.currentWorldHasRing };
  }

  loadState(state) {
    super.loadState(state);
    this.ringCount = state.ringCount || 0;
    this.currentWorldHasRing = state.currentWorldHasRing || false;
  }

  saveTravelState() {
    const state = { ringCount: this.ringCount };
    if (this.isActive) {
      state.isActive = true;
      state.remainingTime = this.remainingTime;
      state.startingDuration = this.startingDuration;
    }
    return state;
  }

  loadTravelState(state = {}) {
    this.ringCount = state.ringCount || 0;
    this.currentWorldHasRing = false;
    if (state.isActive) {
      this.isActive = true;
      this.remainingTime = state.remainingTime || this.remainingTime;
      this.startingDuration = state.startingDuration || this.getEffectiveDuration();
    }
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.OrbitalRingProject = OrbitalRingProject;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = OrbitalRingProject;
}
