const ENERGY_PER_ANTIMATTER = 2_000_000_000_000_000;

let exportedAntimatterHelpers = null;
if (
  typeof window === 'undefined' &&
  typeof module !== 'undefined' &&
  module.exports
) {
  exportedAntimatterHelpers = require('../special/antimatter.js');
}

class AntimatterBattery extends Building {
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
    let { fillButton } = cache;
    if (!fillButton) {
      fillButton = globalThis.document.createElement('button');
      fillButton.textContent = 'Fill';
      fillButton.classList.add('fill-button');
      fillButton.addEventListener('click', event => {
        event.stopPropagation();
        this.fillFromAntimatter();
      });
      cache.fillButton = fillButton;
    }

    hideButton.insertAdjacentElement('afterend', fillButton);

    this._cachedUI = cache;
    this.updateUI(cache);
  }

  updateUI(elements = {}) {
    if (elements !== this._cachedUI && elements.fillButton) {
      this._cachedUI = elements;
    }

    const button = elements.fillButton || this._cachedUI?.fillButton;
    if (!button) {
      return;
    }

    const antimatter = resources?.special?.antimatter || null;
    const energy = resources?.colony?.energy || null;
    const missingEnergy = energy ? Math.max(0, energy.cap - energy.value) : 0;
    const energyPerAntimatter = this.getEnergyPerAntimatter();
    const hasResources = antimatter && energy;
    const hasActiveBattery = this.active > 0;

    button.disabled =
      !hasResources ||
      !hasActiveBattery ||
      antimatter.value <= 0 ||
      missingEnergy <= 0 ||
      energyPerAntimatter <= 0;
    button.style.display = this.unlocked && !this.isHidden ? 'inline-block' : 'none';
  }

  getFillRate() {
    const terraformedWorlds = globalThis.spaceManager?.getTerraformedPlanetCount?.() ?? 0;
    const ratePerWorld = this.getAntimatterRatePerWorld();
    return terraformedWorlds * ratePerWorld;
  }

  getEnergyPerAntimatter() {
    return ENERGY_PER_ANTIMATTER;
  }

  getAntimatterRatePerWorld() {
    if (
      exportedAntimatterHelpers &&
      exportedAntimatterHelpers.ANTIMATTER_PER_TERRAFORMED_WORLD !== undefined
    ) {
      return exportedAntimatterHelpers.ANTIMATTER_PER_TERRAFORMED_WORLD;
    }
    return globalThis.ANTIMATTER_PER_TERRAFORMED_WORLD ?? 0;
  }

  fillFromAntimatter() {
    const antimatter = resources?.special?.antimatter || null;
    const energy = resources?.colony?.energy || null;
    if (this.active <= 0) {
      return;
    }

    const energyPerAntimatter = this.getEnergyPerAntimatter();
    if (energyPerAntimatter <= 0) {
      return;
    }

    const missingEnergy = Math.max(0, energy.cap - energy.value);
    if (missingEnergy <= 0) {
      return;
    }

    const availableAntimatter = antimatter.value;
    if (availableAntimatter <= 0) {
      return;
    }

    const potentialEnergyFromRate = fillRate * energyPerAntimatter;
    const potentialEnergyFromStock = availableAntimatter * energyPerAntimatter;
    const energyGain = Math.min(missingEnergy, potentialEnergyFromRate, potentialEnergyFromStock);

    if (energyGain <= 0) {
      return;
    }

    const antimatterConsumed = energyGain / energyPerAntimatter;
    antimatter.decrease(antimatterConsumed);
    energy.increase(energyGain);
    energy.enable?.();

    globalThis.updateResourceDisplay?.(resources);
    globalThis.updateStructureDisplay?.(structures);
    this.updateUI(this._cachedUI || {});
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AntimatterBattery };
} else {
  globalThis.AntimatterBattery = AntimatterBattery;
}
