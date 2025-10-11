class WindTurbine extends Building {
  build(buildCount = 1, activate = true) {
    let initialLand = 0;
    try {
      if (Number.isFinite(terraforming.initialLand)) {
        initialLand = terraforming.initialLand;
      }
    } catch (error) {
      initialLand = 0;
    }
    const cap = Math.floor(initialLand / 50);
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
        'Wind turbine arrays are limited to 1 per 50 units of initial land.';
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

const moduleExports = (() => {
  try {
    return module.exports;
  } catch (error) {
    return null;
  }
})();

if (moduleExports) {
  moduleExports.WindTurbine = WindTurbine;
  moduleExports.windTurbine = WindTurbine;
} else {
  const root = Function('return this')();
  if (root) {
    root.WindTurbine = WindTurbine;
    root.windTurbine = WindTurbine;
  }
}
