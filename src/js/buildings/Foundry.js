function getFoundryBuildingText(path, fallback, vars) {
  try {
    return t(path, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

class Foundry extends Building {
  getTargetProductivity(resources, deltaTime) {
    if (resources.surface.liquidHydrogen.value > 0) {
      return 0;
    }

    return super.getTargetProductivity(resources, deltaTime);
  }

  updateProductivity(resources, deltaTime) {
    if (resources.surface.liquidHydrogen.value > 0) {
      this.setAutomationActivityMultiplier(0);
      this.productivity = 0;
      this.displayProductivity = 0;
      this.setProductivityLimitInfo(0, 0, []);
      return;
    }

    super.updateProductivity(resources, deltaTime);
  }

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
    if (!cache.liquidHydrogenWarning) {
      const warning = document.createElement('div');
      warning.classList.add('project-kessler-warning');
      const icon = document.createElement('span');
      icon.classList.add('project-kessler-warning__icon');
      icon.textContent = '\u26a0';
      const text = document.createElement('span');
      warning.append(icon, text);
      cache.combinedRow.insertBefore(warning, cache.combinedRow.querySelector('.card-body'));
      cache.liquidHydrogenWarning = warning;
      cache.liquidHydrogenWarningText = text;
    }
    this.updateUI(cache);
  }

  updateUI(cache) {
    this._ensureTooltip(cache);
    const warningText = t('ui.buildings.foundry.liquidHydrogenWarning');
    if (cache.liquidHydrogenWarningText.textContent !== warningText) {
      cache.liquidHydrogenWarningText.textContent = warningText;
    }
    cache.liquidHydrogenWarning.style.display = resources.surface.liquidHydrogen.value > 0
      && !cache.combinedRow.classList.contains('collapsed') ? 'flex' : 'none';
  }
}

registerBuildingConstructor(Foundry);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Foundry };
} else if (typeof window !== 'undefined') {
  window.Foundry = Foundry;
}
