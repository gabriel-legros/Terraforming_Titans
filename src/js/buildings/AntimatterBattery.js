const ENERGY_PER_ANTIMATTER = 2_000_000_000_000_000;
const FILL_COOLDOWN_SECONDS = 60;

function getAntimatterBatteryText(path, fallback, vars) {
  try {
    return t(path, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

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
    this._fillCooldownEndsAtMs = 0;
    this._handleFillClick = event => {
      event.stopPropagation();
      this.fillFromAntimatter();
    };
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
      fillButton.textContent = getAntimatterBatteryText(
        'ui.buildings.antimatterBattery.fill',
        'Fill'
      );
      fillButton.classList.add('fill-button');
      cache.fillButton = fillButton;
    }

    if (fillButton._antimatterBatteryHandler) {
      fillButton.removeEventListener('click', fillButton._antimatterBatteryHandler);
    }
    fillButton._antimatterBatteryHandler = this._handleFillClick;
    fillButton.addEventListener('click', this._handleFillClick);

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
    const availableAntimatter = antimatter && isAntimatterSpaceEnergySyncActive()
      ? getAntimatterEquivalentValue(resources)
      : (antimatter?.value || 0);
    const hasResources = antimatter && energy;
    const hasActiveBattery = this.active > 0n;

    const now = Date.now();
    const cooldownSecondsRemaining = this.getFillCooldownSecondsRemaining(now);

    button.disabled =
      !hasResources ||
      !hasActiveBattery ||
      availableAntimatter <= 0 ||
      missingEnergy <= 0 ||
      energyPerAntimatter <= 0 ||
      cooldownSecondsRemaining > 0;

    button.textContent = cooldownSecondsRemaining > 0
      ? getAntimatterBatteryText(
          'ui.buildings.antimatterBattery.fillCooldown',
          'Fill ({seconds})',
          { seconds: cooldownSecondsRemaining }
        )
      : getAntimatterBatteryText(
          'ui.buildings.antimatterBattery.fill',
          'Fill'
        );
    button.style.display = this.unlocked && !this.isHidden ? 'inline-block' : 'none';
  }

  getFillCooldownSecondsRemaining(now = Date.now()) {
    const remainingMs = this._fillCooldownEndsAtMs - now;
    if (remainingMs <= 0) {
      return 0;
    }
    return Math.ceil(remainingMs / 1000);
  }

  getFillRate() {
    const terraformedWorlds = globalThis.spaceManager?.getTerraformedPlanetCount?.() ?? 0;
    const ratePerWorld = this.getAntimatterRatePerWorld();
    return terraformedWorlds * ratePerWorld;
  }

  getEnergyPerAntimatter() {
    if (
      exportedAntimatterHelpers &&
      exportedAntimatterHelpers.ANTIMATTER_SPACE_ENERGY_RATIO !== undefined
    ) {
      return exportedAntimatterHelpers.ANTIMATTER_SPACE_ENERGY_RATIO;
    }
    return ANTIMATTER_SPACE_ENERGY_RATIO;
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
    if (!antimatter || !energy) {
      return;
    }
    if (this.active <= 0n) {
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

    const availableAntimatter = isAntimatterSpaceEnergySyncActive()
      ? getAntimatterEquivalentValue(resources)
      : antimatter.value;
    if (availableAntimatter <= 0) {
      return;
    }

    const potentialEnergyFromStock = availableAntimatter * energyPerAntimatter;
    const energyGain = Math.min(missingEnergy, potentialEnergyFromStock);

    if (energyGain <= 0) {
      return;
    }

    const antimatterConsumed = energyGain / energyPerAntimatter;
    if (!spendAntimatterEquivalent(antimatterConsumed, resources)) {
      return;
    }
    energy.increase(energyGain);
    energy.enable?.();
    this._fillCooldownEndsAtMs = Date.now() + (FILL_COOLDOWN_SECONDS * 1000);

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
