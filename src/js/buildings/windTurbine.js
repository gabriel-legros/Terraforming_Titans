function getWindTurbineText(path, fallback, vars) {
  try {
    return t(path, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

class WindTurbine extends Building {
  getBuildLimit() {
    const initialLand = resolveWorldBaseLand(terraforming);
    return Math.floor(initialLand / 50);
  }

  build(buildCount = 1, activate = true) {
    const initialLand = resolveWorldBaseLand(terraforming);
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
      tooltip.innerHTML = '&#9432;';
      cache.countTooltipContent = attachDynamicInfoTooltip(
        tooltip,
        getWindTurbineText(
          'ui.buildings.windTurbine.limitTooltip',
          'Wind turbine arrays are limited to 1 per 50 units of base land.'
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
