function getSandQuarryText(path, fallback, vars) {
  try {
    return t(path, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

class SandQuarry extends Building {
  constructor(config, buildingName) {
    super(config, buildingName);
    this.automationCustomBasisOptions = [
      {
        value: 'sandQuarry:glassSmelterPlus4ElectronicsFactory',
        label: getSandQuarryText(
          'ui.buildings.automationBasis.sandQuarryGlassAndElectronics',
          '% of G.S. + 4*E.F.'
        ),
      },
    ];
  }

  hasSandAvailable() {
    const attributes = currentPlanetParameters?.specialAttributes;
    const coreHeatFlux = Math.max(0, currentPlanetParameters?.celestialParameters?.coreHeatFlux || 0);
    return attributes?.hasSand !== false && coreHeatFlux <= 0;
  }

  isVisible() {
    return this.hasSandAvailable() && super.isVisible();
  }

  getBuildLimit() {
    if (!this.hasSandAvailable()) {
      return 0;
    }

    return super.getBuildLimit();
  }

  maxBuildable(reservePercent = 0, additionalReserves = null) {
    if (!this.hasSandAvailable()) {
      return 0;
    }

    return super.maxBuildable(reservePercent, additionalReserves);
  }

  getAutoBuildBase(population, workerCap, collection) {
    if (this.autoBuildBasis === 'sandQuarry:glassSmelterPlus4ElectronicsFactory') {
      const targetCollection = collection || {};
      const glassSmelterActive = Number.isFinite(targetCollection.glassSmelter?.activeNumber)
        ? targetCollection.glassSmelter.activeNumber
        : (typeof buildingCountToNumber === 'function'
          ? buildingCountToNumber(targetCollection.glassSmelter?.active)
          : Math.max(0, Math.floor(Number(targetCollection.glassSmelter?.active) || 0)));
      const electronicsFactoryActive = Number.isFinite(targetCollection.electronicsFactory?.activeNumber)
        ? targetCollection.electronicsFactory.activeNumber
        : (typeof buildingCountToNumber === 'function'
          ? buildingCountToNumber(targetCollection.electronicsFactory?.active)
          : Math.max(0, Math.floor(Number(targetCollection.electronicsFactory?.active) || 0)));
      return glassSmelterActive + (4 * electronicsFactoryActive);
    }

    return super.getAutoBuildBase(population, workerCap, collection);
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
