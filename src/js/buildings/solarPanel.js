function getSolarPanelText(path, fallback, vars) {
  try {
    return t(path, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

class SolarPanel extends Building {
  getCurrentLandCap() {
    const geometricLand = Math.max(0, resolveWorldGeometricLand(terraforming, resources.surface.land));
    return Math.floor(geometricLand * 2.5);
  }

  getBuildLimit() {
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

  updateProductivity(resources, deltaTime) {
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
        getSolarPanelText(
          'ui.buildings.solarPanel.limitTooltip',
          'Solar panels are limited to 2.5x the current geometric land amount. Excess panels are automatically deactivated if land shrinks.'
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
  module.exports = { SolarPanel, solarPanel: SolarPanel };
} else {
  globalThis.SolarPanel = SolarPanel;
  globalThis.solarPanel = SolarPanel;
}
