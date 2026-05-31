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
          '% of G.S.+E.F. Demand'
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

    const geometricLand = Math.max(0, resolveWorldGeometricLand(terraforming, resources?.surface?.land));
    return Math.floor(geometricLand * 5);
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
      const glassSmelterDemandMultiplier = Math.max(0, targetCollection.glassSmelter.getEffectiveConsumptionMultiplier());
      return (glassSmelterActive * glassSmelterDemandMultiplier) + (4 * electronicsFactoryActive);
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

  build(buildCount = 1, activate = true) {
    if (!this.hasSandAvailable()) {
      return false;
    }

    const geometricLand = Math.max(0, resolveWorldGeometricLand(terraforming, resources?.surface?.land));
    const cap = Math.floor(geometricLand * 5);
    const remaining = cap - this.countNumber;
    if (remaining <= 0) {
      return false;
    }

    const allowed = Math.min(buildCount, remaining);
    return super.build(allowed, activate);
  }

  _ensureTooltip(cache) {
    if (!cache) return;

    let countEl = cache.countEl;
    if (!countEl || !countEl.isConnected) {
      const row = cache.row;
      if (!row) return;
      countEl =
        row.querySelector(`#${this.name}-count-active`) ||
        row.querySelector(`#${this.name}-count`);
      if (!countEl) return;
      cache.countEl = countEl;
    }

    let tooltip = cache.countTooltip;
    if (!tooltip) {
      tooltip = document.createElement('span');
      tooltip.classList.add('info-tooltip-icon');
      tooltip.innerHTML = '&#9432;';
      cache.countTooltipContent = attachDynamicInfoTooltip(
        tooltip,
        getSandQuarryText(
          'ui.buildings.sandQuarry.limitTooltip',
          'Sand quarries are limited to 5x the current world land amount.'
        )
      );
      cache.countTooltip = tooltip;
    }

    if (!tooltip.isConnected) {
      countEl.parentElement.insertBefore(tooltip, countEl.nextSibling);
    }
  }

  initUI(_, cache) {
    this._ensureTooltip(cache);
  }

  updateUI(cache) {
    this._ensureTooltip(cache);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SandQuarry };
} else if (typeof window !== 'undefined') {
  window.SandQuarry = SandQuarry;
}
