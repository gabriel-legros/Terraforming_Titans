class OrbitalRingProject extends TerraformingDurationProject {
  constructor(config, name) {
    super(config, name);
    this.ringCount = 0;
    this.currentWorldHasRing = false;
    this.prepaidRings = 0;
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
    if (this.isPermanentlyDisabled()) {
      return false;
    }
    if (!this.unlocked) {
      return false;
    }
    if (this.repeatCount && this.maxRepeatCount && this.repeatCount >= this.maxRepeatCount) {
      return false;
    }
    if (this.isActive) {
      return false;
    }
    if (this.isPaused) {
      return this.hasSustainResources();
    }
    if (this.isKesslerDisabled()) {
      return false;
    }
    if (
      this.category === 'story' &&
      this.attributes.planet &&
      spaceManager.getCurrentPlanetKey() !== this.attributes.planet
    ) {
      return false;
    }
    
    if (
      typeof spaceManager === 'undefined' ||
      typeof spaceManager.getUnmodifiedTerraformedWorldCount !== 'function'
    ) {
      return true;
    }
    const maxRings = spaceManager.getUnmodifiedTerraformedWorldCount({
      countArtificial: false
    });
    if (this.ringCount >= maxRings) {
      return false;
    }
    
    if (this.prepaidRings > 0) {
      return true;
    }
    
    const cost = this.getScaledCost();
    const storageProj = this.attributes.canUseSpaceStorage && projectManager?.projects?.spaceStorage;
    for (const category in cost) {
      for (const resource in cost[category]) {
        const required = cost[category][resource];
        if (storageProj) {
          const key = resource === 'water' ? 'liquidWater' : resource;
          const usable = storageProj.getAvailableStoredResource(key);
          const available = resources[category][resource].value + usable;
          if (available < required) {
            return false;
          }
        } else if (resources[category][resource].value < required) {
          return false;
        }
      }
    }
    
    return true;
  }

  start(resources) {
    if (this.canStart(resources)) {
      if (!this.isPaused) {
        if (this.prepaidRings > 0) {
          this.prepaidRings -= 1;
        } else {
          this.deductResources(resources);
        }
        this.remainingTime = this.getEffectiveDuration();
        this.startingDuration = this.remainingTime;
        if (this.kesslerDebrisSize) {
          this.kesslerRollElapsed = 0;
          this.kesslerRollPending = true;
          this.kesslerStartCost = this.getScaledCost();
        } else {
          this.kesslerRollPending = false;
          this.kesslerRollElapsed = 0;
          this.kesslerStartCost = null;
        }
      }

      this.isActive = true;
      this.isPaused = false;
  
      return true;
    } else {
      return false;
    }
  }

  getMaxPrepayableRings() {
    if (
      typeof spaceManager === 'undefined' ||
      typeof spaceManager.getUnmodifiedTerraformedWorldCount !== 'function'
    ) {
      return 0;
    }
    const terraformedWorlds = spaceManager.getUnmodifiedTerraformedWorldCount({
      countArtificial: false
    });
    let maxPrepay = terraformedWorlds - this.ringCount;
    if (this.isActive) {
      maxPrepay -= 1;
    }
    return Math.max(0, maxPrepay);
  }

  prepayRing() {
    const maxPrepay = this.getMaxPrepayableRings();
    if (maxPrepay <= 0) return false;
    
    const cost = this.getScaledCost();
    const storageProj = this.attributes.canUseSpaceStorage && projectManager?.projects?.spaceStorage;
    
    for (const category in cost) {
      for (const resource in cost[category]) {
        const required = cost[category][resource];
        if (storageProj) {
          const key = resource === 'water' ? 'liquidWater' : resource;
          const usable = storageProj.getAvailableStoredResource(key);
          const available = resources[category][resource].value + usable;
          if (available < required) {
            return false;
          }
        } else if (resources[category][resource].value < required) {
          return false;
        }
      }
    }
    
    this.deductResources(resources);
    this.prepaidRings += 1;
    return true;
  }

  complete() {
    super.complete();
    this.ringCount += 1;
    
    const manager = typeof spaceManager !== 'undefined' ? spaceManager : null;
    const hadRingBefore = manager?.currentWorldHasOrbitalRing?.() || this.currentWorldHasRing;
    const canPreferCurrent = !hadRingBefore && manager?.isCurrentWorldTerraformed?.();

    if (manager?.assignOrbitalRings) {
      manager.assignOrbitalRings(this.ringCount, { preferCurrentWorld: !!canPreferCurrent });
    } else if (!hadRingBefore && manager?.isPlanetTerraformed && manager?.getCurrentPlanetKey) {
      if (manager.isPlanetTerraformed(manager.getCurrentPlanetKey())) {
        manager.setCurrentWorldHasOrbitalRing?.(true);
      }
    }

    const reportedRingState = manager?.currentWorldHasOrbitalRing?.();
    const hasRingAfter = typeof reportedRingState === 'boolean'
      ? reportedRingState
      : (hadRingBefore || !!canPreferCurrent);
    this.currentWorldHasRing = !!hasRingAfter;
  }

  saveState() {
    return {
      ...super.saveState(),
      ringCount: this.ringCount,
      currentWorldHasRing: this.currentWorldHasRing,
      prepaidRings: this.prepaidRings
    };
  }

  loadState(state) {
    super.loadState(state);
    this.ringCount = state.ringCount || 0;
    this.currentWorldHasRing = state.currentWorldHasRing || false;
    this.prepaidRings = state.prepaidRings || 0;
  }

  saveTravelState() {
    const state = {
      ringCount: this.ringCount,
      prepaidRings: this.prepaidRings
    };
    if (this.isActive) {
      state.isActive = true;
      state.remainingTime = this.remainingTime;
      state.startingDuration = this.startingDuration;
    }
    return state;
  }

  loadTravelState(state = {}) {
    this.ringCount = state.ringCount || 0;
    this.prepaidRings = state.prepaidRings || 0;
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
