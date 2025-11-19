class SandQuarry extends Building {
  constructor(config, buildingName) {
    super(config, buildingName);
  }

  hasSandAvailable() {
    const attributes = currentPlanetParameters?.specialAttributes;
    return attributes?.hasSand !== false;
  }

  isVisible() {
    return this.hasSandAvailable() && super.isVisible();
  }

  maxBuildable(reservePercent = 0, additionalReserves = null) {
    if (!this.hasSandAvailable()) {
      return 0;
    }

    return super.maxBuildable(reservePercent, additionalReserves);
  }

  updateProductivity(resources, deltaTime) {
    if (!this.hasSandAvailable()) {
      this.setAutomationActivityMultiplier(0);
      this.productivity = 0;
      return;
    }

    super.updateProductivity(resources, deltaTime);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SandQuarry };
} else if (typeof window !== 'undefined') {
  window.SandQuarry = SandQuarry;
}
