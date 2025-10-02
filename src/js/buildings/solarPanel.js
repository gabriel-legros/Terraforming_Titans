class SolarPanel extends Building {
  build(buildCount = 1, activate = true) {
    const initialLand = (typeof terraforming !== 'undefined' && terraforming.initialLand) ? terraforming.initialLand : 0;
    const cap = initialLand * 10;
    const remaining = cap - this.count;
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
      tooltip.title =
        'Solar panels are limited to 10× the initial land amount.';
      tooltip.innerHTML = '&#9432;';
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
