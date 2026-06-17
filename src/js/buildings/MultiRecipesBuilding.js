function getMultiRecipesBuildingText(path, fallback, vars) {
  try {
    return t(path, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

class MultiRecipesBuilding extends Building {
  constructor(config, buildingName) {
    super(config, buildingName);
    this._defaultDisplayName = config.name || this.displayName;
    this._staticConsumption = MultiRecipesBuilding._clone(config.consumption || {});
    this._staticRealisticEnergyConsumption = config.realisticEnergyConsumption;
    this._defaultProduction = MultiRecipesBuilding._clone(config.production || {});
    this._defaultStorage = MultiRecipesBuilding._clone(config.storage || {});
    this._applyRecipeMapping();
  }

  static _clone(source) {
    return source ? JSON.parse(JSON.stringify(source)) : {};
  }

  _getRecipeOptions() {
    const defs = this.recipes || {};
    const allowedKeys = this._getAllowedRecipeKeys();
    return Object.keys(defs).map(key => ({
      key,
      label: defs[key].shortName || defs[key].displayName || key,
      allowed: allowedKeys.includes(key)
    }));
  }

  _getAllowedRecipeKeys() {
    const defs = this.recipes || {};
    const keys = Object.keys(defs);
    if (!spaceManager || !spaceManager.isArtificialWorld()) {
      return keys.filter(key => {
        const recipe = defs[key] || {};
        const requiredFlag = recipe.requiresResearchFlag;
        const requiredBuildingFlag = recipe.requiresBuildingFlag;
        const disabledBuildingFlag = recipe.disabledByBuildingFlag;
        if (requiredBuildingFlag && !this.isBooleanFlagSet(requiredBuildingFlag)) {
          return false;
        }
        if (disabledBuildingFlag && this.isBooleanFlagSet(disabledBuildingFlag)) {
          return false;
        }
        return !requiredFlag || researchManager?.isBooleanFlagSet?.(requiredFlag);
      });
    }
    const allowed = keys.filter(key => {
      const recipe = defs[key] || {};
      const requiredFlag = recipe.requiresResearchFlag;
      const requiredBuildingFlag = recipe.requiresBuildingFlag;
      const disabledBuildingFlag = recipe.disabledByBuildingFlag;
      if (recipe.artificialAllowed === false) {
        return false;
      }
      if (requiredBuildingFlag && !this.isBooleanFlagSet(requiredBuildingFlag)) {
        return false;
      }
      if (disabledBuildingFlag && this.isBooleanFlagSet(disabledBuildingFlag)) {
        return false;
      }
      return !requiredFlag || researchManager?.isBooleanFlagSet?.(requiredFlag);
    });
    return allowed.length ? allowed : keys;
  }

  _applyRecipeMapping(options = {}) {
    if (!this._staticConsumption) {
      this._staticConsumption = MultiRecipesBuilding._clone(this.consumption || {});
    }
    if (!this._defaultProduction) {
      this._defaultProduction = MultiRecipesBuilding._clone(this.production || {});
    }
    if (!this._defaultStorage) {
      this._defaultStorage = MultiRecipesBuilding._clone(this.storage || {});
    }
    if (!this._defaultDisplayName) {
      this._defaultDisplayName = this.displayName;
    }

    const ignoreRestrictions = options.ignoreRestrictions || this.ignoreRecipeRestrictionsOnLoad;
    if (!ignoreRestrictions) {
      const allowedKeys = this._getAllowedRecipeKeys();
      if (allowedKeys.length && !allowedKeys.includes(this.currentRecipeKey)) {
        const fallback = allowedKeys.includes(this.defaultRecipe) ? this.defaultRecipe : allowedKeys[0];
        if (fallback) {
          this.currentRecipeKey = fallback;
        }
      }
    } else {
      const defs = this.recipes || {};
      const hasRecipe = Object.prototype.hasOwnProperty.call(defs, this.currentRecipeKey);
      if (!hasRecipe) {
        const keys = Object.keys(defs);
        const fallback = defs[this.defaultRecipe] ? this.defaultRecipe : keys[0];
        if (fallback) {
          this.currentRecipeKey = fallback;
        }
      }
    }

    const recipe = (this.recipes || {})[this.currentRecipeKey];
    const consumptionSource = recipe?.consumption || this._staticConsumption;
    const realisticEnergyConsumption = recipe && 'realisticEnergyConsumption' in recipe
      ? recipe.realisticEnergyConsumption
      : this._staticRealisticEnergyConsumption;
    this.consumption = this.getDifficultyConsumption(consumptionSource, realisticEnergyConsumption);
    this._baseConsumption = MultiRecipesBuilding._clone(this.consumption);

    const productionSource = recipe?.production || this._defaultProduction;
    this.production = MultiRecipesBuilding._clone(productionSource);

    const storageSource = recipe?.storage || this._defaultStorage;
    this.storage = MultiRecipesBuilding._clone(storageSource);

    this.displayName = recipe?.displayName || this._defaultDisplayName;
    this.shortName = recipe?.shortName || null;
  }

  setRecipe(recipeKey) {
    if (!this.recipes || !Object.prototype.hasOwnProperty.call(this.recipes, recipeKey)) {
      return false;
    }
    const allowedKeys = this._getAllowedRecipeKeys();
    if (!allowedKeys.includes(recipeKey)) {
      return false;
    }
    if (recipeKey === this.currentRecipeKey) {
      return false;
    }
    this.currentRecipeKey = recipeKey;
    this._applyRecipeMapping();
    this.updateResourceStorage();
    this.maintenanceCost = this.calculateMaintenanceCost();
    this.currentProduction = {};
    this.currentConsumption = {};
    this.currentMaintenance = {};
    updateBuildingDisplay(buildings);
    return true;
  }

  applyBooleanFlag(effect) {
    super.applyBooleanFlag(effect);
    const restoredRecipeKey = this._restoredRecipeKey;
    const defs = this.recipes || {};
    if (restoredRecipeKey && Object.prototype.hasOwnProperty.call(defs, restoredRecipeKey)) {
      this.currentRecipeKey = restoredRecipeKey;
      const restoredAllowed = this._getAllowedRecipeKeys().includes(restoredRecipeKey);
      this._applyRecipeMapping({ ignoreRestrictions: !restoredAllowed });
      if (restoredAllowed) {
        this._restoredRecipeKey = null;
      }
      return;
    }
    const hasCurrentRecipe = Object.prototype.hasOwnProperty.call(defs, this.currentRecipeKey);
    const allowedKeys = this._getAllowedRecipeKeys();
    this._applyRecipeMapping({ ignoreRestrictions: hasCurrentRecipe && allowedKeys.includes(this.currentRecipeKey) });
  }

  loadState(state = {}) {
    this._restoredRecipeKey = state && Object.prototype.hasOwnProperty.call(state, 'currentRecipeKey')
      ? state.currentRecipeKey
      : null;
    this.ignoreRecipeRestrictionsOnLoad = true;
    super.loadState(state);
    this.ignoreRecipeRestrictionsOnLoad = false;
  }

  initializeCustomUI(context = {}) {
    const { leftContainer, hideButton, cachedElements } = context;
    if (!leftContainer || !hideButton || typeof document === 'undefined') {
      return;
    }

    const wrapper = document.createElement('span');
    wrapper.classList.add('building-recipe-select');

    const label = document.createElement('label');
    label.textContent = getMultiRecipesBuildingText(
      'ui.buildings.common.recipeLabel',
      'Recipe: '
    );
    label.htmlFor = `${this.name}-recipe-select`;
    wrapper.appendChild(label);

    const select = document.createElement('select');
    select.id = `${this.name}-recipe-select`;
    wrapper.appendChild(select);

    leftContainer.appendChild(wrapper);

    if (cachedElements) {
      cachedElements.recipeSelectContainer = wrapper;
      cachedElements.recipeSelectLabel = label;
      cachedElements.recipeSelect = select;
    }

    select.addEventListener('change', () => {
      const selected = select.value;
      this.setRecipe(selected);
    });

    this.updateUI(cachedElements || { recipeSelect: select });
  }

  updateUI(elements = {}) {
    const select = elements.recipeSelect;
    const container = elements.recipeSelectContainer;
    if (!select) {
      return;
    }

    const options = this._getRecipeOptions();
    const allowedCount = options.filter(opt => opt.allowed !== false).length;
    container?.style && (container.style.display = allowedCount > 1 ? '' : 'none');
    const keyString = options.map(opt => `${opt.key}:${opt.label}:${opt.allowed}`).join('|');
    const desiredValue = this.currentRecipeKey || '';
    const activeElement = document.activeElement;
    const selectIsFocused = activeElement === select;
    const signatureChanged = select.dataset.optionKey !== keyString;

    if (signatureChanged) {
      while (select.options.length < options.length) {
        select.appendChild(document.createElement('option'));
      }
      while (select.options.length > options.length) {
        select.removeChild(select.options[select.options.length - 1]);
      }
      options.forEach((opt, index) => {
        const optionEl = select.options[index];
        if (optionEl.value !== opt.key) {
          optionEl.value = opt.key;
        }
        if (optionEl.textContent !== opt.label) {
          optionEl.textContent = opt.label;
        }
        const shouldDisable = opt.allowed === false;
        if (optionEl.hidden !== shouldDisable) {
          optionEl.hidden = shouldDisable;
        }
        if (optionEl.disabled !== shouldDisable) {
          optionEl.disabled = shouldDisable;
        }
      });
      select.dataset.optionKey = keyString;
    }

    if (select.value === desiredValue) {
      return;
    }

    if (selectIsFocused) {
      let hasCurrentValue = false;
      for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value === select.value) {
          hasCurrentValue = true;
          break;
        }
      }
      if (hasCurrentValue) {
        return;
      }
    }

    select.value = desiredValue;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MultiRecipesBuilding };
} else {
  window.MultiRecipesBuilding = MultiRecipesBuilding;
}
