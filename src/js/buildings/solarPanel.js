function getSolarPanelText(path, fallback, vars) {
  try {
    return t(path, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

class SolarPanel extends Building {
  getBuildLimit() {
    const initialLand = resolveWorldBaseLand(terraforming);
    return Math.floor(initialLand * 2.5);
  }

  build(buildCount = 1, activate = true) {
    const initialLand = resolveWorldBaseLand(terraforming);
    const cap = Math.floor(initialLand * 2.5);
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
          'Solar panels are limited to 2.5x the base land amount.'
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
