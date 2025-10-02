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
    emptyButton.textContent = 'Empty';
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

    if (terraforming?.zonalWater) {
      this.distributeToZones(amount);
    }

    globalThis.updateResourceDisplay?.(resources);
    globalThis.updateStructureDisplay?.(structures);
    this.updateUI(this._cachedUI || {});
  }

  distributeToZones(totalAmount) {
    const zoneList = Array.isArray(globalThis.ZONES) && globalThis.ZONES.length > 0
      ? globalThis.ZONES
      : ['tropical', 'temperate', 'polar'];
    const weights = zoneList.map(zone => {
      if (globalThis.getZonePercentage) {
        const weight = globalThis.getZonePercentage(zone);
        return Number.isFinite(weight) && weight > 0 ? weight : 0;
      }
      return 1;
    });
    const totalWeight = weights.reduce((sum, value) => sum + value, 0) || zoneList.length;

    zoneList.forEach((zone, index) => {
      if (!terraforming.zonalWater[zone]) {
        terraforming.zonalWater[zone] = { liquid: 0, ice: 0, buriedIce: 0 };
      }
      const entry = terraforming.zonalWater[zone];
      if (entry.liquid === undefined) {
        entry.liquid = 0;
      }
      const portion = totalAmount * (weights[index] / totalWeight);
      entry.liquid += portion;
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WaterTank };
} else {
  globalThis.WaterTank = WaterTank;
}
