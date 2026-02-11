class OreMine extends Building {
  hasOreAvailable() {
    const attributes = currentPlanetParameters?.specialAttributes;
    return attributes?.hasOre !== false;
  }

  isVisible() {
    return this.hasOreAvailable() && super.isVisible();
  }

  getBuildLimit() {
    if (!this.hasOreAvailable()) {
      return 0;
    }

    return super.getBuildLimit();
  }

  maxBuildable(reservePercent = 0, additionalReserves = null) {
    if (!this.hasOreAvailable()) {
      return 0;
    }

    return super.maxBuildable(reservePercent, additionalReserves);
  }

  updateProductivity(resources, deltaTime) {
    if (!this.hasOreAvailable()) {
      this.setAutomationActivityMultiplier(0);
      this.productivity = 0;
      return;
    }

    super.updateProductivity(resources, deltaTime);
  }

  build(buildCount = 1, activate = true) {
    const built = super.build(buildCount, activate);
    if (built) {
      projectManager?.projects?.deeperMining?.registerMine?.();
    }
    return built;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { OreMine };
} else if (typeof window !== 'undefined') {
  window.OreMine = OreMine;
}
