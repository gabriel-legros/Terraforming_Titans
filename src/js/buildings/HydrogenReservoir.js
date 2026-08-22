function getHydrogenReservoirText(path, fallback, vars) {
  try {
    return t(path, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

class HydrogenReservoir extends MultiRecipesBuilding {
  constructor(config, buildingName) {
    super(config, buildingName);
    this._cachedUI = null;
    this._handleEmptyClick = event => {
      event.stopPropagation();
      this.emptyToAtmosphere();
    };
  }

  initializeCustomUI(context = {}) {
    const { leftContainer, hideButton } = context;
    if (!leftContainer || !hideButton) {
      return;
    }

    const cache = context.cachedElements || {};
    let { storageTierContainer, storageTierSelect } = cache;
    if (!storageTierContainer) {
      storageTierContainer = document.createElement('span');
      storageTierContainer.classList.add('building-recipe-select');

      const storageTierLabel = document.createElement('label');
      storageTierLabel.textContent = getHydrogenReservoirText(
        'ui.buildings.hydrogenReservoir.storageTierLabel'
      );
      storageTierLabel.htmlFor = `${this.name}-storage-tier-select`;
      storageTierContainer.appendChild(storageTierLabel);

      storageTierSelect = document.createElement('select');
      storageTierSelect.id = `${this.name}-storage-tier-select`;
      [
        ['standard', 'standardTier'],
        ['warp', 'warpTier'],
        ['deepWarp', 'deepWarpTier']
      ].forEach(([value, textKey]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = getHydrogenReservoirText(
          `ui.buildings.hydrogenReservoir.${textKey}`
        );
        storageTierSelect.appendChild(option);
      });
      storageTierContainer.appendChild(storageTierSelect);
      leftContainer.appendChild(storageTierContainer);

      storageTierSelect.addEventListener('change', () => {
        this.setStorageTier(storageTierSelect.value);
      });

      cache.storageTierContainer = storageTierContainer;
      cache.storageTierSelect = storageTierSelect;
    }

    let { operatingModeContainer, operatingModeSelect } = cache;
    if (!operatingModeContainer) {
      operatingModeContainer = document.createElement('span');
      operatingModeContainer.classList.add('building-recipe-select');

      const operatingModeLabel = document.createElement('label');
      operatingModeLabel.textContent = getHydrogenReservoirText(
        'ui.buildings.hydrogenReservoir.operatingModeLabel'
      );
      operatingModeLabel.htmlFor = `${this.name}-operating-mode-select`;
      operatingModeContainer.appendChild(operatingModeLabel);

      operatingModeSelect = document.createElement('select');
      operatingModeSelect.id = `${this.name}-operating-mode-select`;
      [
        ['storage', 'storageMode'],
        ['intake', 'pumpingMode']
      ].forEach(([value, textKey]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = getHydrogenReservoirText(
          `ui.buildings.hydrogenReservoir.${textKey}`
        );
        operatingModeSelect.appendChild(option);
      });
      operatingModeContainer.appendChild(operatingModeSelect);
      leftContainer.appendChild(operatingModeContainer);

      operatingModeSelect.addEventListener('change', () => {
        this.setOperatingMode(operatingModeSelect.value);
      });

      cache.operatingModeContainer = operatingModeContainer;
      cache.operatingModeSelect = operatingModeSelect;
    }

    let { emptyButton } = cache;
    if (!emptyButton) {
      emptyButton = document.createElement('button');
      emptyButton.textContent = getHydrogenReservoirText('ui.common.empty', 'Empty');
      emptyButton.classList.add('empty-button');
      cache.emptyButton = emptyButton;
    }

    if (emptyButton._hydrogenReservoirHandler) {
      emptyButton.removeEventListener('click', emptyButton._hydrogenReservoirHandler);
    }
    emptyButton._hydrogenReservoirHandler = this._handleEmptyClick;
    emptyButton.addEventListener('click', this._handleEmptyClick);

    hideButton.insertAdjacentElement('afterend', emptyButton);

    this._cachedUI = cache;
    this.updateUI(cache);
  }

  updateUI(elements = {}) {
    if (
      elements !== this._cachedUI &&
      (elements.emptyButton || elements.storageTierSelect || elements.operatingModeSelect)
    ) {
      this._cachedUI = elements;
    }

    const cache = this._cachedUI || {};
    const storageTierSelect = elements.storageTierSelect || cache.storageTierSelect;
    const storageTierContainer = elements.storageTierContainer || cache.storageTierContainer;
    const operatingModeSelect = elements.operatingModeSelect || cache.operatingModeSelect;
    const button = elements.emptyButton || cache.emptyButton;
    if (!storageTierSelect || !operatingModeSelect || !button) {
      return;
    }

    const allowedKeys = this._getAllowedRecipeKeys();
    const availableTiers = ['standard', 'warp', 'deepWarp'].filter(tier =>
      allowedKeys.includes(this.getRecipeKey(tier, 'storage'))
    );
    Array.from(storageTierSelect.options).forEach(option => {
      const disabled = !availableTiers.includes(option.value);
      option.disabled = disabled;
      option.hidden = disabled;
    });
    storageTierContainer.style.display = availableTiers.length > 1 ? '' : 'none';

    const tier = this.getStorageTier();
    const mode = this.getOperatingMode();
    storageTierSelect.value = tier;
    operatingModeSelect.value = mode;
    Array.from(operatingModeSelect.options).forEach(option => {
      option.disabled = !allowedKeys.includes(this.getRecipeKey(tier, option.value));
    });

    const colonyHydrogen = resources?.colony?.colonyHydrogen;
    const availableHydrogen = colonyHydrogen?.value ?? 0;
    button.disabled = availableHydrogen <= 0;
    button.style.display = this.unlocked && !this.isHidden ? 'inline-block' : 'none';
  }

  getStorageTier(recipeKey = this.currentRecipeKey) {
    if (recipeKey === 'deepWarpStorage' || recipeKey === 'deepWarpIntake') {
      return 'deepWarp';
    }
    if (recipeKey === 'warpStorage' || recipeKey === 'warpIntake') {
      return 'warp';
    }
    return 'standard';
  }

  getOperatingMode(recipeKey = this.currentRecipeKey) {
    return recipeKey === 'intake' || recipeKey === 'warpIntake' || recipeKey === 'deepWarpIntake'
      ? 'intake'
      : 'storage';
  }

  getRecipeKey(tier, mode) {
    const pumping = mode === 'intake';
    if (tier === 'deepWarp') {
      return pumping ? 'deepWarpIntake' : 'deepWarpStorage';
    }
    if (tier === 'warp') {
      return pumping ? 'warpIntake' : 'warpStorage';
    }
    return pumping ? 'intake' : 'storage';
  }

  setStorageTier(tier) {
    return this.setRecipe(this.getRecipeKey(tier, this.getOperatingMode()));
  }

  setOperatingMode(mode) {
    return this.setRecipe(this.getRecipeKey(this.getStorageTier(), mode));
  }

  emptyToAtmosphere() {
    const colonyHydrogen = resources?.colony?.colonyHydrogen;
    const atmosphericHydrogen = resources?.atmospheric?.hydrogen;
    if (!colonyHydrogen || !atmosphericHydrogen) {
      return;
    }

    const amount = colonyHydrogen.value;
    if (amount <= 0) {
      return;
    }

    colonyHydrogen.decrease(amount);
    atmosphericHydrogen.increase(amount);
    atmosphericHydrogen.enable?.();

    updateResourceDisplay(resources);
    updateStructureDisplay(structures);
    this.updateUI(this._cachedUI || {});
  }
}

try {
  registerBuildingConstructor(HydrogenReservoir);
} catch (error) {}

try {
  module.exports = { HydrogenReservoir };
} catch (error) {
  window.HydrogenReservoir = HydrogenReservoir;
}
