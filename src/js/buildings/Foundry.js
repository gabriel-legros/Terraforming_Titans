function getFoundryBuildingText(path, fallback, vars) {
  try {
    return t(path, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

class Foundry extends Building {
  getBuildLimit() {
    return Math.max(0, Math.floor(resolveWorldBaseLand(terraforming)));
  }

  build(buildCount = 1, activate = true) {
    const remaining = this.getBuildLimitRemaining();
    if (remaining <= 0) {
      return false;
    }

    return super.build(Math.min(buildCount, remaining), activate);
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
        getFoundryBuildingText(
          'ui.buildings.foundry.limitTooltip',
          'Foundries are limited to 1 per unit of base land on the current world.'
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

registerBuildingConstructor('foundry', Foundry);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Foundry };
} else if (typeof window !== 'undefined') {
  window.Foundry = Foundry;
}
