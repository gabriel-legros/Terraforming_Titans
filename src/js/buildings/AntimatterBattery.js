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
    this.autoFillingEnabled = false;
    this._fillCooldownEndsAtMs = 0;
    this._handleFillClick = event => {
      event.stopPropagation();
      this.fillFromAntimatter();
    };
    this._handleAutoFillToggle = event => {
      event.stopPropagation();
      this.autoFillingEnabled = !!event.target.checked;
      this.updateUI(this._cachedUI || {});
    };
  }

  initializeCustomUI(context = {}) {
    const { leftContainer, hideButton } = context;
    if (!leftContainer || !hideButton || !globalThis.document) {
      return;
    }

    const cache = context.cachedElements || {};
    let { fillButton, autoFillCheckbox, autoFillLabel } = cache;
    if (!fillButton) {
      fillButton = globalThis.document.createElement('button');
      fillButton.classList.add('fill-button');
      autoFillLabel = globalThis.document.createElement('label');
      autoFillLabel.classList.add('antimatter-battery-autofill-label');
      autoFillCheckbox = globalThis.document.createElement('input');
      autoFillCheckbox.type = 'checkbox';
      autoFillCheckbox.classList.add('antimatter-battery-autofill-checkbox');
      autoFillLabel.appendChild(autoFillCheckbox);
      fillButton.appendChild(autoFillLabel);
      const fillLabel = globalThis.document.createElement('span');
      fillLabel.classList.add('fill-button-label');
      fillButton.appendChild(fillLabel);
      cache.fillButton = fillButton;
      cache.fillLabel = fillLabel;
      cache.autoFillLabel = autoFillLabel;
      cache.autoFillCheckbox = autoFillCheckbox;
    }

    if (fillButton._antimatterBatteryHandler) {
      fillButton.removeEventListener('click', fillButton._antimatterBatteryHandler);
    }
    fillButton._antimatterBatteryHandler = this._handleFillClick;
    fillButton.addEventListener('click', this._handleFillClick);
    if (autoFillCheckbox) {
      if (autoFillCheckbox._antimatterBatteryHandler) {
        autoFillCheckbox.removeEventListener('click', autoFillCheckbox._antimatterBatteryHandler);
      }
      autoFillCheckbox._antimatterBatteryHandler = this._handleAutoFillToggle;
      autoFillCheckbox.addEventListener('click', this._handleAutoFillToggle);
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
    const fillLabel = elements.fillLabel || this._cachedUI?.fillLabel;
    const autoFillLabel = elements.autoFillLabel || this._cachedUI?.autoFillLabel;
    const autoFillCheckbox = elements.autoFillCheckbox || this._cachedUI?.autoFillCheckbox;

    const antimatter = resources?.special?.antimatter || null;
    const energy = resources?.colony?.energy || null;
    const missingEnergy = energy ? Math.max(0, energy.cap - energy.value) : 0;
    const energyPerAntimatter = this.getEnergyPerAntimatter();
    const availableAntimatter = antimatter && isAntimatterSpaceEnergySyncActive()
      ? getAntimatterEquivalentValue(resources)
      : (antimatter?.value || 0);
    const hasResources = antimatter && energy;
    const hasActiveBattery = this.active > 0n;
    const hasWarpLogistics = this.isBooleanFlagSet('antimatterWarpLogistics');

    const now = Date.now();
    const cooldownSecondsRemaining = this.getFillCooldownSecondsRemaining(now);
    const cooldownBlocked = !hasWarpLogistics && cooldownSecondsRemaining > 0;

    button.disabled =
      !hasResources ||
      !hasActiveBattery ||
      availableAntimatter <= 0 ||
      missingEnergy <= 0 ||
      energyPerAntimatter <= 0 ||
      cooldownBlocked;

    if (fillLabel) {
      fillLabel.textContent = cooldownBlocked
      ? getAntimatterBatteryText(
          'ui.buildings.antimatterBattery.fillCooldown',
          'Fill ({seconds})',
          { seconds: cooldownSecondsRemaining }
        )
      : getAntimatterBatteryText(
          'ui.buildings.antimatterBattery.fill',
          'Fill'
        );
    }
    if (autoFillLabel) {
      autoFillLabel.style.display = hasWarpLogistics ? 'inline-flex' : 'none';
    }
    if (autoFillCheckbox) {
      autoFillCheckbox.checked = !!this.autoFillingEnabled;
      autoFillCheckbox.disabled = !hasWarpLogistics;
    }
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
      return null;
    }
    if (this.active <= 0n) {
      return null;
    }

    const energyPerAntimatter = this.getEnergyPerAntimatter();
    if (energyPerAntimatter <= 0) {
      return null;
    }
    if (!this.isBooleanFlagSet('antimatterWarpLogistics') && this.getFillCooldownSecondsRemaining(Date.now()) > 0) {
      return null;
    }

    const missingEnergy = Math.max(0, energy.cap - energy.value);
    if (missingEnergy <= 0) {
      return null;
    }

    const availableAntimatter = isAntimatterSpaceEnergySyncActive()
      ? getAntimatterEquivalentValue(resources)
      : antimatter.value;
    if (availableAntimatter <= 0) {
      return null;
    }

    const potentialEnergyFromStock = availableAntimatter * energyPerAntimatter;
    const energyGain = Math.min(missingEnergy, potentialEnergyFromStock);

    if (energyGain <= 0) {
      return null;
    }

    const antimatterConsumed = energyGain / energyPerAntimatter;
    if (!spendAntimatterEquivalent(antimatterConsumed, resources)) {
      return null;
    }
    const spaceEnergySpent = isAntimatterSpaceEnergySyncActive()
      ? antimatterToSpaceEnergy(antimatterConsumed)
      : 0;
    energy.increase(energyGain);
    energy.enable?.();
    if (!this.isBooleanFlagSet('antimatterWarpLogistics')) {
      this._fillCooldownEndsAtMs = Date.now() + (FILL_COOLDOWN_SECONDS * 1000);
    }

    globalThis.updateResourceDisplay?.(resources);
    globalThis.updateStructureDisplay?.(structures);
    this.updateUI(this._cachedUI || {});
    return { energyGain, spaceEnergySpent };
  }

  updateAutoFillAfterProductionTick(deltaTime) {
    if (!this.isBooleanFlagSet('antimatterWarpLogistics') || !this.autoFillingEnabled) {
      return;
    }
    const fillResult = this.fillFromAntimatter();
    if (!fillResult || deltaTime <= 0) {
      return;
    }
    const perSecondMultiplier = 1000 / deltaTime;
    const energyPerSecond = fillResult.energyGain * perSecondMultiplier;
    const spaceEnergyPerSecond = fillResult.spaceEnergySpent * perSecondMultiplier;
    resources.colony.energy.modifyRate(energyPerSecond, 'Antimatter Battery Auto Fill', 'building');
    if (spaceEnergyPerSecond > 0) {
      resources.space.energy.modifyRate(-spaceEnergyPerSecond, 'Antimatter Battery Auto Fill', 'building');
    }
  }

  saveState() {
    const state = super.saveState();
    state.autoFillingEnabled = !!this.autoFillingEnabled;
    return state;
  }

  loadState(state = {}) {
    super.loadState(state);
    this.autoFillingEnabled = !!state.autoFillingEnabled;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AntimatterBattery };
} else {
  globalThis.AntimatterBattery = AntimatterBattery;
}
