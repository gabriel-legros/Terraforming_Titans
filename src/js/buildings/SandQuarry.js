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

  getCurrentLandCap() {
    const geometricLand = Math.max(0, resolveWorldGeometricLand(terraforming, resources?.surface?.land));
    return Math.floor(geometricLand * 2.5);
  }

  getBuildLimit() {
    if (!this.hasSandAvailable()) {
      return 0;
    }

    return this.getCurrentLandCap();
  }

  getSupportedActiveCap() {
    return this.getCurrentLandCap();
  }

  shouldClampSetActiveToSupported() {
    return true;
  }

  getClampedSetActiveTargetCount(targetCount, structureCount = this.countNumber) {
    return Math.min(targetCount, structureCount, this.getSupportedActiveCap());
  }

  filterActivationChange(change, context) {
    if (change <= 0n) {
      return change;
    }

    const activeCount = Math.max(0, Math.floor(context.currentActive || 0));
    const supportedCap = this.getSupportedActiveCap();
    if (activeCount >= supportedCap) {
      return 0n;
    }

    return Math.min(Number(change), supportedCap - activeCount);
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
      this.displayProductivity = 0;
      return;
    }

    super.updateProductivity(resources, deltaTime);

    if (this.activeNumber > 0) {
      const capRatio = Math.max(0, Math.min(1, this.getCurrentLandCap() / this.activeNumber));
      this.productivity = Math.min(this.productivity, capRatio);
      this.displayProductivity = Math.min(this.displayProductivity, capRatio);
    }
  }

  getTargetProductivity(resources, deltaTime) {
    const target = super.getTargetProductivity(resources, deltaTime);
    if (this.activeNumber <= 0) {
      return target;
    }
    const capRatio = Math.max(0, Math.min(1, this.getCurrentLandCap() / this.activeNumber));
    return Math.min(target, capRatio);
  }

  build(buildCount = 1, activate = true) {
    if (!this.hasSandAvailable()) {
      return false;
    }

    const cap = this.getCurrentLandCap();
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
          'Sand quarries are limited to 2.5x the current world land amount.'
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
