const SHELLWORLD_ORBITAL_RING_COST_BASELINE_LAND_HA = 50_000_000_000;

class ShellworldOrbitalRingProject extends Project {
  isCurrentWorldEligible() {
    return spaceManager.isCurrentWorldShellworldOrbitalRingEligible();
  }

  isCompletedOnCurrentWorld() {
    return spaceManager.currentWorldHasShellworldOrbitalRing();
  }

  applyEffects() {
    const completed = this.isCompletedOnCurrentWorld();
    if (completed) {
      this.isActive = false;
      this.isPaused = false;
      this.isCompleted = true;
    } else if (!this.isActive) {
      this.isCompleted = false;
    }
  }

  isVisible() {
    return super.isVisible() && this.isCurrentWorldEligible();
  }

  getScaledCost() {
    const cost = super.getScaledCost();
    const geometricLand = Math.max(0, resolveWorldGeometricLand(terraforming, resources.surface.land));
    const scale = geometricLand / SHELLWORLD_ORBITAL_RING_COST_BASELINE_LAND_HA;
    const scaledCost = {};

    for (const category in cost) {
      scaledCost[category] = {};
      for (const resource in cost[category]) {
        scaledCost[category][resource] = cost[category][resource] * scale;
      }
    }

    return scaledCost;
  }

  canStart() {
    if (!this.isCurrentWorldEligible() || this.isCompletedOnCurrentWorld()) {
      return false;
    }
    return super.canStart();
  }

  complete() {
    super.complete();
    spaceManager.setCurrentWorldHasShellworldOrbitalRing(true);
    reconcileLandResourceValue();
    recalculateLandUsage();
  }
}

window.ShellworldOrbitalRingProject = ShellworldOrbitalRingProject;
