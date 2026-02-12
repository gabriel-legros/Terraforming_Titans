class WaterTank extends Building {
  constructor(config, buildingName) {
    super(config, buildingName);
    this._cachedUI = null;
    this._handleEmptyClick = event => {
      event.stopPropagation();
      this.emptyToSurface();
    };
    this._handleEmptyAboveCapClick = event => {
      event.stopPropagation();
      this.emptyAboveCapToSurface();
    };
  }

  initializeCustomUI(context = {}) {
    const { leftContainer, hideButton } = context;
    if (!leftContainer || !hideButton || !globalThis.document) {
      return;
    }

    const cache = context.cachedElements || {};
    let { emptyButton } = cache;
    if (!emptyButton) {
      emptyButton = globalThis.document.createElement('button');
      emptyButton.textContent = 'Empty';
      emptyButton.classList.add('empty-button');
      cache.emptyButton = emptyButton;
    }

    let { emptyAboveCapButton } = cache;
    if (!emptyAboveCapButton) {
      emptyAboveCapButton = globalThis.document.createElement('button');
      emptyAboveCapButton.textContent = 'Empty above Cap';
      emptyAboveCapButton.classList.add('empty-button');
      cache.emptyAboveCapButton = emptyAboveCapButton;
    }

    if (emptyButton._waterTankHandler) {
      emptyButton.removeEventListener('click', emptyButton._waterTankHandler);
    }
    emptyButton._waterTankHandler = this._handleEmptyClick;
    emptyButton.addEventListener('click', this._handleEmptyClick);

    if (emptyAboveCapButton._waterTankHandler) {
      emptyAboveCapButton.removeEventListener('click', emptyAboveCapButton._waterTankHandler);
    }
    emptyAboveCapButton._waterTankHandler = this._handleEmptyAboveCapClick;
    emptyAboveCapButton.addEventListener('click', this._handleEmptyAboveCapClick);

    hideButton.insertAdjacentElement('afterend', emptyButton);
    emptyButton.insertAdjacentElement('afterend', emptyAboveCapButton);

    this._cachedUI = cache;
    this.updateUI(cache);
  }

  updateUI(elements = {}) {
    if (
      elements !== this._cachedUI &&
      (elements.emptyButton || elements.emptyAboveCapButton)
    ) {
      this._cachedUI = elements;
    }

    const button = elements.emptyButton || this._cachedUI?.emptyButton;
    const aboveCapButton = elements.emptyAboveCapButton || this._cachedUI?.emptyAboveCapButton;
    if (!button || !aboveCapButton) {
      return;
    }

    const colonyWater = resources?.colony?.water;
    const availableWater = colonyWater?.value ?? 0;
    const overflowWater = colonyWater ? this.getAboveCapAmount(colonyWater) : 0;
    button.disabled = availableWater <= 0;
    aboveCapButton.disabled = overflowWater <= 0;
    button.style.display = this.unlocked && !this.isHidden ? 'inline-block' : 'none';
    aboveCapButton.style.display = this.unlocked && !this.isHidden ? 'inline-block' : 'none';
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

  getAboveCapAmount(colonyWater) {
    return Math.max(0, colonyWater.value - colonyWater.cap);
  }

  emptyAboveCapToSurface() {
    const colonyWater = resources?.colony?.water;
    const surfaceWater = resources?.surface?.liquidWater;
    if (!colonyWater || !surfaceWater) {
      return;
    }

    const amount = this.getAboveCapAmount(colonyWater);
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
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WaterTank };
} else {
  globalThis.WaterTank = WaterTank;
}
