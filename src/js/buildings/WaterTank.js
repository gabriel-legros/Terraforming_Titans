class WaterTank extends Building {
  constructor(config, buildingName) {
    super(config, buildingName);
    this._cachedUI = null;
  }

  initializeCustomUI(context = {}) {
    const { leftContainer, hideButton } = context;
    if (!leftContainer || !hideButton || !globalThis.document) {
      return;
    }

    const cache = context.cachedElements || {};
    const emptyButton = globalThis.document.createElement('button');
    emptyButton.textContent = this.localizeModuleText(
      'buildingsTab.modules.waterTank.empty',
      null,
      'Empty'
    );
    emptyButton.classList.add('empty-button');
    emptyButton.addEventListener('click', event => {
      event.stopPropagation();
      this.emptyToSurface();
    });

    hideButton.insertAdjacentElement('afterend', emptyButton);

    cache.emptyButton = emptyButton;
    this._cachedUI = cache;
    this.updateUI(cache);
  }

  updateUI(elements = {}) {
    if (elements !== this._cachedUI && elements.emptyButton) {
      this._cachedUI = elements;
    }

    const button = elements.emptyButton || this._cachedUI?.emptyButton;
    if (!button) {
      return;
    }

    const availableWater = resources?.colony?.water?.value ?? 0;
    button.disabled = availableWater <= 0;
    button.textContent = this.localizeModuleText(
      'buildingsTab.modules.waterTank.empty',
      null,
      'Empty'
    );
    button.style.display = this.unlocked && !this.isHidden ? 'inline-block' : 'none';
  }

  emptyToSurface() {
    const colonyWater = resources?.colony?.water;
    const surfaceWater = resources?.surface?.liquidWater;
    if (!colonyWater || !surfaceWater) {
      return;
    }

    const amount = colonyWater.value;
    if (amount <= 0) {
      return;
    }

    colonyWater.decrease(amount);
    surfaceWater.increase(amount);
    surfaceWater.enable?.();

    if (terraforming?.zonalSurface) {
      this.distributeToZones(amount);
    }

    globalThis.updateResourceDisplay?.(resources);
    globalThis.updateStructureDisplay?.(structures);
    this.updateUI(this._cachedUI || {});
  }

  distributeToZones(totalAmount) {
    const zoneList = getZones();
    const weights = zoneList.map(zone => {
      const weight = getZonePercentage(zone);
      return Number.isFinite(weight) && weight > 0 ? weight : 0;
    });
    const totalWeight = weights.reduce((sum, value) => sum + value, 0) || zoneList.length;

    zoneList.forEach((zone, index) => {
      const entry = terraforming.zonalSurface[zone];
      const portion = totalAmount * (weights[index] / totalWeight);
      entry.liquidWater += portion;
    });
  }

  localizeModuleText(key, vars, fallback) {
    if (typeof t !== 'function') {
      return fallback || key;
    }
    const resolved = t(key, vars);
    if (resolved === key) {
      return fallback || key;
    }
    return resolved;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WaterTank };
} else {
  globalThis.WaterTank = WaterTank;
}
